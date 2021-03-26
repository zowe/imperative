/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import * as fs from "fs";
import * as os from "os";
import * as nodeJsPath from "path";
import * as url from "url";
import * as jsonfile from "jsonfile";
import * as lodash from "lodash";

// for ProfileInfo structures
import { IProfAttrs } from "./doc/IProfAttrs";
import { IProfLoc, ProfLocType } from "./doc/IProfLoc";
import { IProfMergedArg } from "./doc/IProfMergedArg";
import { IProfOpts } from "./doc/IProfOpts";

// for team config functions
import { Config } from "./Config";
import { ConfigSchema } from "./ConfigSchema";
import { IConfigOpts } from "./doc/IConfigOpts";

// for old-school profile operations
import { AbstractProfileManager } from "../../profiles/src/abstract/AbstractProfileManager";
import { CliProfileManager, ICommandProfileProperty } from "../../cmd";
import { IProfileLoaded, IProfileSchema, ProfileIO } from "../../profiles";

// for imperative operations
import { EnvironmentalVariableSettings } from "../../imperative/src/env/EnvironmentalVariableSettings";
import { LoggingConfigurer } from "../../imperative/src/LoggingConfigurer";
import { CliUtils, ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";
import { ImperativeExpect } from "../../expect";
import { Logger } from "../../logger";
import { IProfArgAttrs } from "./doc/IProfArgAttrs";

/**
 * This class provides functions to retrieve profile-related information.
 * It can load the relevant configuration files, merge all possible
 * profile argument values using the Zowe order-of-precedence, and
 * access desired profile attributes from the Zowe configuration settings.
 *
 * Pseudocode examples:
 * <pre>
 *    // Construct a new object. Use it to read the profiles from disk
 *    profInfo = new ProfileInfo("zowe");
 *    profInfo.readProfilesFromDisk();
 *
 *    // Maybe you want the list of all zosmf profiles
 *    let arrayOfProfiles = profInfo.getAllProfiles("zosmf");
 *    youDisplayTheListOfProfiles(arrayOfProfiles);
 *
 *    // Maybe you want the default zosmf profile
 *    let zosmfProfile = profInfo.getDefaultProfile("zosmf");
 *    youUseTheProfile(zosmfProfile);
 *
 *    // Maybe you want the arg values for the default JCLCheck profile
 *    let jckProfile = profInfo.getDefaultProfile("jclcheck");
 *    let jckMergedArgs = profInfo.mergeArgsForProfile(jckProfile);
 *    let jckFinalArgs = youPromptForMissingArgsAndCombineWithKnownArgs(
 *        jckMergedArgs.knownArgs, jckMergedArgs.missingArgs
 *    );
 *    youRunJclCheck(jckFinalArgs);
 *
 *    // Maybe no profile of type "zosmf" even exists.
 *    let zosmfProfiles = profInfo.getAllProfiles("zosmf");
 *    if (zosmfProfiles.length == 0) {
 *        // No zosmf profile exists
 *        // Merge any required arg values for the zosmf profile type
 *        let zosmfMergedArgs =
 *            profInfo.mergeArgsForProfileType("zosmf");
 *
 *        let finalZosmfArgs =
 *            youPromptForMissingArgsAndCombineWithKnownArgs(
 *                zosmfMergedArgs.knownArgs,
 *                zosmfMergedArgs.missingArgs
 *            );
 *        youRunSomeZosmfCommand(finalZosmfArgs);
 *    }
 *
 *    // So you want to write to a config file? You must use your own
 *    // old-school techniques to write to old-school profiles.
 *    // You then use alternate logic for a team config.
 *    // You must use the Config API to write to a team configuration.
 *    // See the Config class documentation for functions to set
 *    // and save team config arguments.
 *
 *    // Let's save some zosmf arguments from the example above.
 *    let yourZosmfArgsToWrite: IProfArgAttrs =
 *        youSetValuesToOverwrite(
 *            zosmfMergedArgs.knownArgs, zosmfMergedArgs.missingArgs
 *        );
 *    if (profInfo.usingTeamConfig {
 *        let configObj: Config = profInfo.getTeamConfig();
 *        youWriteArgValuesUsingConfigObj(
 *            configObj, yourZosmfArgsToWrite
 *        );
 *    } else {
 *      youWriteOldSchoolProfiles(yourZosmfArgsToWrite);
 *    }
 * </pre>
 */
export class ProfileInfo {
    private mLoadedConfig: Config = null;
    private mUsingTeamConfig: boolean = false;
    private mAppName: string = null;
    private mImpLogger: Logger = null;
    private mOldSchoolProfileCache: IProfileLoaded[] = null;
    private mOldSchoolProfileRootDir: string = null;
    private mOldSchoolProfileDefaults: {[key: string]: string} = null;
    private mOverrideWithEnv: boolean = false;
    /**
     * Cache of profile schema objects mapped by profile type and config path
     * if applicable. Examples of map keys:
     *  - For team config: "/root/.zowe/zowe.config.json:zosmf"
     *  - For old profiles: "zosmf"
     */
    private mProfileSchemaCache: Map<string, IProfileSchema>;

    // _______________________________________________________________________
    /**
     * Constructor for ProfileInfo class.
     *
     * @param appName
     *        The name of the application (like "zowe" in zowe.config.json)
     *        whose configuration you want to access.
     *
     * @param profInfoOpts
     *        Options that will control the behavior of ProfileInfo.
     */
    public constructor(appName: string, profInfoOpts?: IProfOpts) {
        this.mAppName = appName;

        // use any supplied environment override setting
        if (profInfoOpts?.overrideWithEnv) {
            this.mOverrideWithEnv = profInfoOpts.overrideWithEnv;
        }

        // do enough Imperative stuff to let imperative utilities work
        this.initImpUtils();
    }

    // _______________________________________________________________________
    /**
     * Get all of the typed profiles in the configuration.
     *
     * @param profileType
     *        Limit selection to only profiles of the specified type.
     *        If not supplied, the names of all typed profiles are returned.
     *
     * @returns An array of profile attribute objects.
     *          In addition to the name, you get the profile type,
     *          an indicator of whether the profile is the default profile
     *          for that type, and the location of that profile.
     *
     *          If no profile exists for the specified type (or if
     *          no profiles of any kind exist), we return an empty array
     *          ie, length is zero.
     */
    public getAllProfiles(profileType?: string): IProfAttrs[] {
        this.ensureReadFromDisk();
        const profiles: IProfAttrs[] = [];

        // Do we have team config profiles?
        if (this.mUsingTeamConfig) {
            const teamConfigProfs = this.mLoadedConfig.maskedProperties.profiles;
            // Iterate over them
            // tslint:disable-next-line: forin
            for (const prof in teamConfigProfs) {
                // Check if the profile has a type
                if (teamConfigProfs[prof].type && (profileType == null || teamConfigProfs[prof].type === profileType)) {
                    const jsonLocation: string = "profiles." + prof;
                    const teamOsLocation: string[] = this.findTeamOsLocation(jsonLocation);
                    const profAttrs: IProfAttrs = {
                        profName: prof,
                        profType: teamConfigProfs[prof].type,
                        isDefaultProfile: this.isDefaultTeamProfile(prof, profileType),
                        profLoc: {
                            locType: ProfLocType.TEAM_CONFIG,
                            osLoc: teamOsLocation,
                            jsonLoc: jsonLocation
                        }
                    }
                    profiles.push(profAttrs);
                }
                // Check for subprofiles
                if (teamConfigProfs[prof].profiles) {
                    // Get the subprofiles and add to profiles list
                    const jsonPath = "profiles." + prof;
                    const subProfiles: IProfAttrs[] = this.getTeamSubProfiles(prof, jsonPath, teamConfigProfs[prof].profiles, profileType);
                    for (const subProfile of subProfiles) {
                        profiles.push(subProfile);
                    }
                }
            }
        } else {
            for (const loadedProfile of this.mOldSchoolProfileCache) {
                if (!profileType || profileType === loadedProfile.type) {
                    const typeDefaultProfile = this.getDefaultProfile(loadedProfile.type);
                    let defaultProfile = false;
                    if (typeDefaultProfile && typeDefaultProfile.profName === loadedProfile.name) {defaultProfile = true;}
                    profiles.push({
                        profName: loadedProfile.name,
                        profType: loadedProfile.type,
                        isDefaultProfile: defaultProfile,
                        profLoc: {
                            locType: ProfLocType.OLD_PROFILE,
                            osLoc: [nodeJsPath.resolve(this.mOldSchoolProfileRootDir + "/" + loadedProfile.type + "/" +
                            loadedProfile.name + AbstractProfileManager.PROFILE_EXTENSION)],
                            jsonLoc: undefined
                        }
                    });
                }
            }
        }
        return profiles;
    }

    // _______________________________________________________________________
    /**
     * Get the default profile for the specified profile type.
     *
     * @param profileType
     *        The type of profile of interest.
     *
     * @returns The default profile. If no profile exists
     *          for the specified type, we return null;
     */
    public getDefaultProfile(profileType: string): IProfAttrs {
        this.ensureReadFromDisk();

        const defaultProfile: IProfAttrs = {
            profName: null,
            profType: profileType,
            isDefaultProfile: true,
            profLoc: {
                locType: null
           }
        };

        if (this.usingTeamConfig) {
            // get default profile name from the team config
            if (!this.mLoadedConfig.maskedProperties.defaults.hasOwnProperty(profileType)) {
                // no default exists for the requested type
                this.mImpLogger.warn("Found no profile of type '" +
                    profileType + "' in team config."
                );
                return null;
            }

            // extract info from the underlying team config
            const foundProfNm = this.mLoadedConfig.maskedProperties.defaults[profileType];

            // for a team config, we use the last node of the jsonLoc as the name
            const foundJson = this.mLoadedConfig.api.profiles.expandPath(foundProfNm);
            const teamOsLocation: string[] = this.findTeamOsLocation(foundJson);

            // assign the required poperties to defaultProfile
            defaultProfile.profName = foundProfNm;
            defaultProfile.profLoc = {
                locType: ProfLocType.TEAM_CONFIG,
                osLoc: teamOsLocation,
                jsonLoc: foundJson
            }
        } else {
            // get default profile from the old-school profiles
            // first, some validation
            if (!this.mOldSchoolProfileCache || this.mOldSchoolProfileCache.length === 0) {
                // No old school profiles in the cache - warn and return null
                this.mImpLogger.warn("Found no old-school profiles.");
                return null;
            }
            if (!this.mOldSchoolProfileDefaults || Object.keys(this.mOldSchoolProfileDefaults).length === 0) {
                // No old-school default profiles found - warn and return null
                this.mImpLogger.warn("Found no default old-school profiles.");
                return null;
            }

            const profName = this.mOldSchoolProfileDefaults[profileType];
            if (!profName) {
                // No old-school default profile of this type - warn and return null
                this.mImpLogger.warn("Found no old-school profile for type '" + profileType + "'.");
                return null;
            }

            const loadedProfile = this.mOldSchoolProfileCache.find(obj => {
                return obj.name === profName && obj.type === profileType
            });
            if (!loadedProfile) {
                // Something really weird happened
                this.mImpLogger.warn("Profile with name '" + profName + "' was defined as the default profile for type '" + profileType + "' but was missing from the cache.");
                return null;
            }

            ImperativeExpect.toBeEqual(loadedProfile.type, profileType);

            // assign the required properties to defaultProfile
            defaultProfile.profName = loadedProfile.name;
            defaultProfile.profLoc = {
                locType: ProfLocType.OLD_PROFILE,
                osLoc: [nodeJsPath.join(this.mOldSchoolProfileRootDir, profileType,
                    loadedProfile.name + AbstractProfileManager.PROFILE_EXTENSION)]
            }
        }
        return defaultProfile;
    }

    // _______________________________________________________________________
    /**
     * Get the Config object used to manipulate the team configuration on disk.
     *
     * Our current market direction is to encourage customers to edit the
     * team configuration files in their favorite text editor.
     *
     * If you must ignore this recommended practice, you must use the Config
     * class to manipulate the team config files. This class has a more detailed
     * and therefore more complicated API, but it does contain functions to
     * write data to the team configuration files.
     *
     * You must call ProfileInfo.readProfilesFromDisk() before calling this function.
     *
     * @returns An instance of the Config class that can be used to manipulate
     *          the team configuration on disk.
     */
    public getTeamConfig(): Config {
        this.ensureReadFromDisk();
        return this.mLoadedConfig;
    }
    // _______________________________________________________________________
    /**
     * Merge all of the available values for arguments defined for the
     * specified profile. Values are retrieved from the following sources.
     * Each successive source will override the previous source.
     * - A default value for the argument that is defined in the profile definition.
     * - A value defined in the base profile.
     * - A value defined in the specified service profile.
     * - For a team configuration, both the base profile values and the
     *   service profile values will be overridden with values from a
     *   zowe.config.user.json file (if it exists).
     * - An environment variable for that argument (if environment overrides
     *   are enabled).
     *
     * @param profile
     *        The profile whose arguments are to be merged.
     *
     * @returns An object that contains an array of known profile argument
     *          values and an array of required profile arguments which
     *          have no value assigned. Either of the two arrays could be
     *          of zero length, depending on the user's configuration and
     *          environment.
     *
     *          We will return null if the profile does not exist
     *          in the current Zowe configuration.
     */
    public mergeArgsForProfile(profile: IProfAttrs): IProfMergedArg {
        const mergedArgs: IProfMergedArg = {
            knownArgs: [],
            missingArgs: []
        };

        if (profile.profLoc.locType === ProfLocType.TEAM_CONFIG) {
            if (profile.profName != null) {
                // Load args from service profile if one exists
                const serviceProfile = this.mLoadedConfig.api.profiles.get(profile.profName);
                for (const [propName, propVal] of Object.entries(serviceProfile)) {
                    mergedArgs.knownArgs.push({
                        argName: CliUtils.getOptionFormat(propName).camelCase,
                        dataType: this.argDataType(typeof propVal),  // TODO Is using `typeof` bad for "null" values that may be int or bool?
                        argValue: propVal,
                        argLoc: this.argTeamConfigLoc(profile.profName, propName)
                    });
                }
            }

            const baseProfile = this.mLoadedConfig.api.profiles.defaultGet("base");
            if (baseProfile != null) {
                // Load args from default base profile if one exists
                const baseProfileName = this.mLoadedConfig.properties.defaults.base;
                for (const [propName, propVal] of Object.entries(baseProfile)) {
                    const argName = CliUtils.getOptionFormat(propName).camelCase;
                    // Skip properties already loaded from service profile
                    if (!mergedArgs.knownArgs.find((arg) => arg.argName === argName)) {
                        mergedArgs.knownArgs.push({
                            argName,
                            dataType: this.argDataType(typeof propVal),
                            argValue: propVal,
                            argLoc: this.argTeamConfigLoc(baseProfileName, propName)
                        });
                    }
                }
            }
        } else if (profile.profLoc.locType === ProfLocType.OLD_PROFILE) {
            if (profile.profName != null) {
                const serviceProfile = this.mOldSchoolProfileCache.find(obj => {
                    return obj.name === profile.profName && obj.type === profile.profType
                })?.profile;
                if (serviceProfile != null) {
                    // Load args from service profile if one exists
                    for (const [propName, propVal] of Object.entries(serviceProfile)) {
                        // Skip undefined properties because they don't meet criteria for known args
                        if (propVal === undefined) continue;
                        mergedArgs.knownArgs.push({
                            argName: CliUtils.getOptionFormat(propName).camelCase,
                            dataType: this.argDataType(typeof propVal),
                            argValue: propVal,
                            argLoc: this.argOldProfileLoc(profile.profName, profile.profType)
                        });
                    }
                }
            }

            const baseProfileName = this.mOldSchoolProfileDefaults.base;
            if (baseProfileName != null) {
                // Load args from default base profile if one exists
                const baseProfile = this.mOldSchoolProfileCache.find(obj => {
                    return obj.name === baseProfileName && obj.type === "base"
                })?.profile;
                if (baseProfile != null) {
                    for (const [propName, propVal] of Object.entries(baseProfile)) {
                        // Skip undefined properties because they don't meet criteria for known args
                        if (propVal === undefined) continue;
                        const argName = CliUtils.getOptionFormat(propName).camelCase;
                        // Skip properties already loaded from service profile
                        if (!mergedArgs.knownArgs.find((arg) => arg.argName === argName)) {
                            mergedArgs.knownArgs.push({
                                argName,
                                dataType: this.argDataType(typeof propVal),
                                argValue: propVal,
                                argLoc: this.argOldProfileLoc(baseProfileName, "base")
                            });
                        }
                    }
                }
            }
        } else {
            throw new ImperativeError({ msg: "Invalid profile location type: " + ProfLocType[profile.profLoc.locType] });
        }

        // perform validation with profile schema if available
        const profSchema = this.loadSchema(profile);

        // overwrite with any values found in environment
        this.overrideWithEnv(mergedArgs, profSchema);

        if (profSchema != null) {
            const missingRequired: string[] = [];

            for (const [propName, propObj] of Object.entries(profSchema.properties || {})) {
                // Check if property in schema is missing from known args
                if (!mergedArgs.knownArgs.find((arg) => arg.argName === propName)) {
                    mergedArgs.missingArgs.push({
                        argName: propName,
                        dataType: this.argDataType(propObj.type),
                        argValue: (propObj as ICommandProfileProperty).optionDefinition?.defaultValue,
                        argLoc: { locType: ProfLocType.DEFAULT }
                    });

                    if (profSchema.required?.includes(propName)) {
                        missingRequired.push(propName);
                    }
                }
            }
            if (missingRequired.length > 0) {
                throw new ImperativeError({ msg: "Missing required properties: " + missingRequired.join(", ") });
            }
        } else {
            throw new ImperativeError({ msg: `Failed to load schema for profile type ${profile.profType}` });
        }

        return mergedArgs;
    }

    // _______________________________________________________________________
    /**
     * Merge all of the available values for arguments defined for the
     * specified profile type. See mergeArgsForProfile() for details
     * about the merging algorithm.
     * The intended use is when no profile of a specific type exists.
     * The consumer app can prompt for values for missing arguments
     * and then perform the desired operation.
     *
     * @param profileType
     *        The type of profile of interest.
     *
     * @returns The complete set of required properties;
     */
    public mergeArgsForProfileType(profileType: string): IProfMergedArg {
        return this.mergeArgsForProfile({
            profName: null,
            profType: profileType,
            isDefaultProfile: false,
            profLoc: { locType: this.mUsingTeamConfig ? ProfLocType.TEAM_CONFIG : ProfLocType.OLD_PROFILE }
        });
    }

    // _______________________________________________________________________
    /**
     * Read either the new team configuration files (if any exist) or
     * read the old-school profile files.
     *
     * @param teamCfgOpts
     *        The optional choices used when reading a team configuration.
     *        This parameter is ignored, if the end-user is using old-school
     *        profiles.
     */
    public async readProfilesFromDisk(teamCfgOpts?: IConfigOpts) {
        this.mLoadedConfig = await Config.load(this.mAppName, teamCfgOpts);
        this.mUsingTeamConfig = this.mLoadedConfig.exists;
        if (!this.mUsingTeamConfig) {
            // Clear out the values
            this.mOldSchoolProfileCache = [];
            this.mOldSchoolProfileDefaults = {};
            // Try to get profiles and types
            this.mOldSchoolProfileRootDir = nodeJsPath.join(ImperativeConfig.instance.cliHome, "profiles");
            const profTypes = ProfileIO.getAllProfileDirectories(this.mOldSchoolProfileRootDir);
            // Iterate over the types
            for (const profType of profTypes) {
                // Set up the profile manager and list of profile names
                const profileManager = new CliProfileManager({profileRootDirectory: this.mOldSchoolProfileRootDir, type: profType});
                const profileList = profileManager.getAllProfileNames();
                // Iterate over them all
                for (const prof of profileList) {
                    // Load and add to the list
                    try {
                        const loadedProfile = await profileManager.load({name: prof});
                        this.mOldSchoolProfileCache.push(loadedProfile);
                    } catch (err) {
                        this.mImpLogger.warn(err.message);
                    }
                }

                try {
                    const defaultProfile = await profileManager.load({loadDefault: true});
                    if (defaultProfile) {this.mOldSchoolProfileDefaults[profType] = defaultProfile.name;}
                } catch (err) {
                    this.mImpLogger.warn(err.message);
                }
            }
        }
        this.loadAllSchemas();
    }

    // _______________________________________________________________________
    /**
     * Returns an indicator of whether we are using a team configuration or
     * old-school profiles.
     *
     * You must call ProfileInfo.readProfilesFromDisk() before calling this function.
     *
     * @returns True when we are using a team config. False means old-school profiles.
     */
    public get usingTeamConfig(): boolean {
        this.ensureReadFromDisk();
        return this.mUsingTeamConfig;
    }

    // _______________________________________________________________________
    /**
     * Ensures that ProfileInfo.readProfilesFromDisk() is called before
     * an operation that requires that information.
     */
    private ensureReadFromDisk() {
        if (this.mLoadedConfig == null) {
            throw new ImperativeError({
                msg: "You must first call ProfileInfo.readProfilesFromDisk()."
            });
        }
    }

    // _______________________________________________________________________
    /**
     * Perform a rudimentary initialization of some Imperative utilities.
     * We must do this because VSCode apps do not typically call imperative.init.
     */
    private initImpUtils() {
        // create a rudimentary ImperativeConfig if it has not been initialized
        if (ImperativeConfig.instance.loadedConfig == null) {
            let homeDir: string = null;
            const envVarPrefix = this.mAppName.toUpperCase();
            const envVarNm = envVarPrefix + EnvironmentalVariableSettings.CLI_HOME_SUFFIX;
            if (process.env[envVarNm] === undefined) {
                // use OS home directory
                homeDir = nodeJsPath.join(os.homedir(), "." + this.mAppName.toLowerCase());
            } else {
                // use the available environment variable
                homeDir = nodeJsPath.normalize(process.env[envVarNm]);
            }
            ImperativeConfig.instance.loadedConfig = {
                name: this.mAppName,
                defaultHome: homeDir,
                envVariablePrefix: envVarPrefix
            };
            ImperativeConfig.instance.rootCommandName = this.mAppName;
        }

        // initialize logging
        const loggingConfig = LoggingConfigurer.configureLogger(
            ImperativeConfig.instance.cliHome, ImperativeConfig.instance.loadedConfig
        );
        Logger.initLogger(loggingConfig);
        this.mImpLogger = Logger.getImperativeLogger();
    }

    /**
     * Load any profile schema objects found on disk and cache them. For team
     * config, we check each config layer and load its schema JSON if there is
     * one associated. For old school profiles, we load the meta YAML file for
     * each profile type if it exists in the profile root directory.
     */
    private loadAllSchemas(): void {
        this.mProfileSchemaCache = new Map();
        if (this.mUsingTeamConfig) {
            // Load profile schemas for all layers
            let lastSchema: { path: string, json: any } = { path: null, json: null };
            for (const layer of this.getTeamConfig().layers) {
                if (layer.properties.$schema == null) continue;
                const schemaUri = new url.URL(layer.properties.$schema, url.pathToFileURL(layer.path));
                if (schemaUri.protocol !== "file:") {
                    throw new ImperativeError({ msg: `Failed to load schema for config file ${layer.path}: web URLs are not supported by ProfileInfo API` });
                }
                const schemaPath = url.fileURLToPath(schemaUri);
                if (fs.existsSync(schemaPath)) {
                    try {
                        let schemaJson;
                        if (schemaPath !== lastSchema.path) {
                            schemaJson = jsonfile.readFileSync(schemaPath);
                            lastSchema = { path: schemaPath, json: schemaJson };
                        } else {
                            schemaJson = lastSchema.json;
                        }
                        for (const { type, schema } of ConfigSchema.loadProfileSchemas(schemaJson)) {
                            this.mProfileSchemaCache.set(`${layer.path}:${type}`, schema);
                        }
                    } catch (error) {
                        throw new ImperativeError({
                            msg: `Failed to load schema for config file ${layer.path}: invalid schema file`,
                            causeErrors: error
                        });
                    }
                }
            }
        } else {
            // Load profile schemas from meta files in profile root dir
            for (const { type } of this.mOldSchoolProfileCache) {
                const metaPath = nodeJsPath.join(this.mOldSchoolProfileRootDir, type, `${type}_meta.yaml`);
                if (fs.existsSync(metaPath)) {
                    try {
                        const metaProfile = ProfileIO.readMetaFile(metaPath);
                        this.mProfileSchemaCache.set(type, metaProfile.configuration.schema);
                    } catch (error) {
                        throw new ImperativeError({
                            msg: `Failed to load schema for profile type ${type}: invalid meta file`,
                            causeErrors: error
                        });
                    }
                }
            }
        }
    }

    // _______________________________________________________________________
    /**
     * Get all of the sub-profiles in the configuration.
     *
     * @param path
     *          The short form profile name dotted path
     * @param jsonPath
     *          The long form profile dotted path
     * @param profObj
     *          The profiles object from the parent profile.
     *          Contains the sub-profiles to search through.
     * @param profileType
     *          Limit selection to only profiles of the specified type.
     *          If not supplied, the names of all typed profiles are returned.
     *
     * @returns An array of profile attribute objects.
     *          In addition to the name, you get the profile type,
     *          an indicator of whether the profile is the default profile
     *          for that type, and the location of that profile.
     *
     *          If no profile exists for the specified type (or if
     *          no profiles of any kind exist), we return an empty array
     *          ie, length is zero.
     */
    private getTeamSubProfiles(path: string, jsonPath: string, profObj: { [key: string]: any }, profileType?: string): IProfAttrs[] {
        const profiles: IProfAttrs[] = [];
        // tslint:disable-next-line: forin
        for (const prof in profObj) {
            const newJsonPath = jsonPath + ".profiles." + prof;
            const newProfName = path + "." + prof;
            if (profObj[prof].type && (profileType == null || profObj[prof].type === profileType)) {
                const profAttrs: IProfAttrs = {
                    profName: newProfName,
                    profType: profObj[prof].type,
                    isDefaultProfile: this.isDefaultTeamProfile(newProfName, profileType),
                    profLoc: {
                        locType: ProfLocType.TEAM_CONFIG,
                        osLoc: this.findTeamOsLocation(newJsonPath),
                        jsonLoc: newJsonPath
                    }
                }
                profiles.push(profAttrs);
            }
            // Check for subprofiles
            if (profObj[prof].profiles) {
                // Get the subprofiles and add to profiles list
                const subProfiles: IProfAttrs[] = this.getTeamSubProfiles(newProfName, newJsonPath, profObj[prof].profiles, profileType);
                for (const subProfile of subProfiles) {
                    profiles.push(subProfile);
                }
            }
        }
        return profiles;
    }

    /**
     *
     * @param path
     *              The short form profile name dotted path
     * @param profileType
     *              Limit selection to profiles of the specified type
     * @returns A boolean true if the profile is a default profile,
     *          and a boolean false if the profile is not a default profile
     */
    private isDefaultTeamProfile(path: string, profileType?: string): boolean {

        // Is it defined for a particular profile type?
        if (profileType) {
            if (this.mLoadedConfig.maskedProperties.defaults[profileType] === path) return true;
            else return false;
        }

        // Iterate over defaults to see if it's a default profile
        for (const def in this.mLoadedConfig.maskedProperties.defaults) {
            if (this.mLoadedConfig.maskedProperties.defaults[def] === path) {
                return true;
            }
        }

        return false;
    }

    /**
     *
     * @param jsonPath
     *              The long form JSON path of the profile we are searching for.
     * @returns A string array containing the location of all files containing the specified team profile
     */
    private findTeamOsLocation(jsonPath: string): string[] {
        const files: string[] = [];
        const layers = this.mLoadedConfig.layers;
        for (const layer of layers) {
            if (lodash.get(layer.properties, jsonPath) !== undefined &&
                this.mLoadedConfig.mActive.global === layer.global) {
                files.push(layer.path);
            }
        }
        return files;
    }

    /**
     * Get arg data type from a "typeof" string. Arg data types can be basic
     * types like string, number, and boolean. If they are any other type or a
     * union of types, their type will be represented simply as object.
     * @param propType The type of a profile property
     */
    private argDataType(propType: string | string[]): "string" | "number" | "boolean" | "array" | "object" {
        switch (propType) {
            case "string":
            case "number":
            case "boolean":
            case "array":
                return propType;
            default:
                return "object";
        }
    }

    /**
     * Given a profile name and property name, compute the profile location
     * object containing OS and JSON locations.
     * @param profileName Name of a team config profile (e.g., LPAR1.zosmf)
     * @param propName Name of a team config property (e.g., host)
     */
    private argTeamConfigLoc(profileName: string, propName: string): IProfLoc {
        const segments = this.mLoadedConfig.api.profiles.expandPath(profileName).split(".profiles.");
        const buildPath = (ps: string[], p: string) => `${ps.join(".profiles.")}.properties.${p}`;
        while (segments.length > 0 && lodash.get(this.mLoadedConfig.properties, buildPath(segments, propName)) === undefined) {
            // Drop segment from end of path if property not found
            segments.pop();
        };
        const jsonPath = (segments.length > 0) ? buildPath(segments, propName) : undefined;
        if (jsonPath == null) {
            throw new ImperativeError({ msg: `Failed to find property ${propName} in the profile ${profileName}` });
        }

        let filePath: string;
        for (const layer of this.mLoadedConfig.layers) {
            // Find the first layer that includes the JSON path
            if (lodash.get(layer.properties, jsonPath) !== undefined) {
                filePath = layer.path;
                break;
            }
        }

        return {
            locType: ProfLocType.TEAM_CONFIG,
            osLoc: [filePath],
            jsonLoc: jsonPath
        };
    }

    /**
     * Given a profile name and type, compute the profile location object
     * containing OS location.
     * @param profileName Name of an old school profile (e.g., LPAR1)
     * @param profileType Type of an old school profile (e.g., zosmf)
     */
    private argOldProfileLoc(profileName: string, profileType: string): IProfLoc {
        return {
            locType: ProfLocType.OLD_PROFILE,
            osLoc: [nodeJsPath.join(this.mOldSchoolProfileRootDir, profileType, `${profileName}.yaml`)]
        }
    }

    /**
     * Load the cached schema object for a profile type. Returns null if
     * schema is not found in the cache.
     * @param profile Profile attributes object
     */
    private loadSchema(profile: IProfAttrs): IProfileSchema | null {
        let schemaMapKey: string;

        if (profile.profLoc.locType === ProfLocType.TEAM_CONFIG) {
            schemaMapKey = `${profile.profLoc.osLoc}:${profile.profType}`;
        } else if (profile.profLoc.locType === ProfLocType.OLD_PROFILE) {
            schemaMapKey = profile.profType;
        }

        if (schemaMapKey != null && this.mProfileSchemaCache.has(schemaMapKey)) {
            return this.mProfileSchemaCache.get(schemaMapKey);
        }

        return null;
    }

    // _______________________________________________________________________
    /**
     * Override values in a merged argument object with values found in
     * environment variables. The choice to override enviroment variables is
     * controlled by an option on the ProfileInfo constructor.
     *
     * @param mergedArgs
     *      On input, this must be an object containing merged arguments
     *      obtained from configuration settings. This function will override
     *      values in mergedArgs.knownArgs with values found in environment
     *      variables. It will also move arguments from mergedArgs.missingArgs
     *      into mergedArgs.knownArgs if a value is found in an environment
     *      variable for any missingArgs.
     */
    private overrideWithEnv(mergedArgs: IProfMergedArg, profSchema?: IProfileSchema) {
        // populate any missing options
        const envPrefix = ImperativeConfig.instance.loadedConfig.envVariablePrefix;
        const envStart = envPrefix + "_OPT_";
        for (const key in process.env) {
            if (key.startsWith(envStart)) {
                let argValue: any = process.env[key];
                let dataType: any = typeof argValue;
                const argName: string = CliUtils.getOptionFormat(key.substring(envStart.length).replace(/_/g, "-").toLowerCase()).camelCase;

                let argNameFound = false;
                if (profSchema != null) {
                    for (const [propName, propObj] of Object.entries(profSchema.properties || {})) {
                        if (argName === propName) {
                            dataType = this.argDataType(propObj.type);
                            argNameFound = true;
                        }
                    }
                }

                if (profSchema == null || !argNameFound) {
                    if (argValue.toUpperCase() === "TRUE" || argValue.toUpperCase() === "FALSE") {
                        dataType = "boolean";
                    } else if (!isNaN(+(argValue))) {
                        dataType = "number";
                    }
                    // TODO: Look for option definition for argName to check if it's an array
                }

                if (dataType === "boolean") {
                    argValue = argValue.toUpperCase() === "TRUE";
                } else if (dataType === "number") {
                    argValue = +(argValue);
                } else if (dataType === "array") {
                    argValue = CliUtils.extractArrayFromEnvValue(argValue);
                }

                const tempArg: IProfArgAttrs = {
                    argName,
                    argValue,
                    dataType,
                    argLoc: { locType: ProfLocType.ENV }
                };

                const argIndex = mergedArgs.knownArgs.findIndex((arg) => arg.argName === argName)
                if (argIndex < 0) {
                    mergedArgs.knownArgs.push(tempArg);
                } else if (this.mOverrideWithEnv) {
                    mergedArgs.knownArgs[argIndex] = tempArg;
                }
            }
        }
    }
}
