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

import * as os from "os";
import * as nodeJsPath from "path";
import * as lodash from "lodash";

// for ProfileInfo structures
import { IProfAttrs } from "./doc/IProfAttrs";
import { IProfArgAttrs } from "./doc/IProfArgAttrs";
import { IProfLoc, ProfLocType } from "./doc/IProfLoc";
import { IProfMergedArg } from "./doc/IProfMergedArg";
import { IProfOpts } from "./doc/IProfOpts";

// for team config functions
import { Config } from "./Config";
import { IConfigOpts } from "./doc/IConfigOpts";
import { IConfigLayer } from "./doc/IConfigLayer";

// for old-school profile operations
import { AbstractProfileManager } from "../../profiles/src/abstract/AbstractProfileManager";
import { CliProfileManager } from "../../cmd";

// for imperative operations
import { EnvironmentalVariableSettings, LoggingConfigurer } from "../../imperative";
import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";
import { ImperativeExpect } from "../../expect";
import { Logger } from "../../logger";
import { IConfigLoadedProfile } from "./doc/IConfigLoadedProfile";

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
    private mOverrideWithEnv: boolean = false;

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
        return [];
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
     *
     * todo: Remove disk I/O for old-school profiles and remove async
     */
    public async getDefaultProfile(profileType: string): Promise<IProfAttrs> {
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
            const foundJsonLoc = this.mLoadedConfig.maskedProperties.defaults[profileType];
            const activeLayer: IConfigLayer =this.mLoadedConfig.layerActive();

            // for a team config, we use the last node of the jsonLoc as the name
            const segments = foundJsonLoc.split(".");
            const foundProfNm = segments[segments.length - 1];

            // assign the required poperties to defaultProfile
            defaultProfile.profName = foundProfNm;
            defaultProfile.profLoc = {
                locType: ProfLocType.TEAM_CONFIG,
                osLoc: activeLayer.path,
                jsonLoc: foundJsonLoc
            }
        } else {
            // get default profile from the old-school profiles
            try {
                const profRootDir = nodeJsPath.join(ImperativeConfig.instance.cliHome, "profiles");
                const profileManager = new CliProfileManager({
                    profileRootDirectory: profRootDir,
                    type: profileType
                });
                const loadedProfile = await profileManager.load({loadDefault: true});
                ImperativeExpect.toBeEqual(loadedProfile.type, profileType);

                // assign the required properties to defaultProfile
                defaultProfile.profName = loadedProfile.name;
                defaultProfile.profLoc = {
                    locType: ProfLocType.OLD_PROFILE,
                    osLoc: nodeJsPath.join(profRootDir, profileType,
                        loadedProfile.name + AbstractProfileManager.PROFILE_EXTENSION)
                }
            } catch (err) {
                this.mImpLogger.warn("Found no old-school profile of type '" +
                    profileType + "'. Details: " + err.message
                );
                return null;
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
        // TODO Add default values if needed by ZE
        const mergedArgs: IProfMergedArg = {
            knownArgs: [],
            missingArgs: []
        };

        if (profile.profLoc.locType === ProfLocType.TEAM_CONFIG) {
            // TODO Is it ok to use lodash.camelCase?
            // This converts any case (kebab, snake, upper, etc) to camel
            // Config class only supports camel and kebab cases
            // Inconsistency in supported arg cases could be bad
            // Perhaps this method should also only support those 2 cases
            const serviceProfile = this.mLoadedConfig.api.profiles.get(profile.profLoc.jsonLoc);
            for (const [propName, propVal] of Object.entries(serviceProfile)) {
                mergedArgs.knownArgs.push({
                    argName: lodash.camelCase(propName),
                    dataType: this.argDataType(typeof propVal),
                    argValue: propVal,
                    argLoc: this.argTeamConfigLoc(profile.profLoc.jsonLoc, propName)
                });
            }

            const baseProfile = this.mLoadedConfig.api.profiles.defaultGet("base");
            if (baseProfile != null) {
                const baseProfileName = this.mLoadedConfig.properties.defaults.base;
                for (const [propName, propVal] of Object.entries(baseProfile)) {
                    const argName = lodash.camelCase(propName);
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
            // TODO Implement something for old-school profiles
        } else {
            throw new ImperativeError({ msg: "Invalid profile location type: " + profile.profLoc.locType });
        }

        if (profile.profSchema) {
            const missingRequired = [];
            for (const [propName, propObj] of Object.entries(profile.profSchema.properties)) {
                if (!mergedArgs.knownArgs.find((arg) => arg.argName === propName)) {
                    mergedArgs.missingArgs.push({
                        argName: propName,
                        dataType: this.argDataType(propObj.type),
                        argValue: undefined,
                        argLoc: { locType: profile.profLoc.locType }
                    });

                    if (profile.profSchema.required?.includes(propName)) {
                        missingRequired.push(propName);
                    }
                }
            }
            if (missingRequired.length > 0) {
                throw new ImperativeError({ msg: "Missing required properties: " + missingRequired.join(", ") });
            }
        }

        // overwrite with any values found in environment
        this.overrideWithEnv(mergedArgs);

        return mergedArgs;
    }

    private argDataType(propType: string | string[]): "string" | "number" | "boolean" | "object" {
        switch (propType) {
            case "string":
            case "number":
            case "boolean":
                return propType;
            default:
                return "object";
        }
    }

    private argTeamConfigLoc(profileName: string, propName: string): IProfLoc {
        const pathSegments = this.mLoadedConfig.api.profiles.expandPath(profileName).split(".");
        const buildPath = (ps: string[], p: string) => `${ps.join(".")}.properties.${p}`;
        while (pathSegments.length > 0 && lodash.get(this.mLoadedConfig.properties, buildPath(pathSegments, propName)) === undefined) {
            pathSegments.pop();
        };
        const jsonPath = (pathSegments.length > 0) ? buildPath(pathSegments, propName) : undefined;
        let filePath: string;
        for (const layer of this.mLoadedConfig.layers) {
            if (lodash.get(layer.properties, jsonPath) !== undefined) {
                filePath = layer.path;
                break;
            }
        }
        return {
            locType: ProfLocType.TEAM_CONFIG,
            osLoc: filePath,
            jsonLoc: jsonPath
        };
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
        let mergedArgs: IProfMergedArg = null;

        // todo: Actually implement something
        const implementSomething: any = null;
        mergedArgs = implementSomething;

        // overwrite with any values found in environment
        this.overrideWithEnv(mergedArgs);

        return mergedArgs;
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
     *        todo: We must add a startingProjectSearchDir to IConfigOpts.
     */
    public async readProfilesFromDisk(teamCfgOpts?: IConfigOpts) {
        this.mLoadedConfig = await Config.load(this.mAppName, teamCfgOpts);
        if (this.mLoadedConfig.exists) {
            this.mUsingTeamConfig = true;
        }
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
    private overrideWithEnv(mergedArgs: IProfMergedArg) {
        if (this.mOverrideWithEnv === false) {
            return;
        }

        // todo: get values from environment variables
    }
}
