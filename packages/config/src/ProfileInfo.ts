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

// for ProfileInfo structures
import { IProfAttrs } from "./doc/IProfAttrs";
import { IProfArgAttrs } from "./doc/IProfArgAttrs";
import { IProfLoc, ProfLocType } from "./doc/IProfLoc";
import { IProfMergedArg } from "./doc/IProfMergedArg";

// for team config functions
import { Config } from "./config";
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
import { profile } from "console";
import { config } from "yargs";

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

    // _______________________________________________________________________
    /**
     * Constructor for ProfileInfo class.
     *
     * @param appName
     *        The name of the application (like "zowe" in zowe.config.json)
     *        whose configuration you want to access.
     */
    public constructor(appName: string) {
        this.mAppName = appName;
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
    public async getAllProfiles(app: string, profileType?: string): Promise<IProfAttrs[]> {
        this.ensureReadFromDisk();
        const profiles: IProfAttrs[] = [];

        const teamConfig = await Config.load(app);
        const teamConfigProfs = teamConfig.profiles;
        const teamConfigDefs = teamConfig.defaults;

        if (teamConfigProfs) {
            // We have profiles in the team config
            // Iterate over them
            for (const prof in teamConfigProfs) {
                // Check if the profile has a type
                if (teamConfigProfs[prof].type) {
                    // The profile has a type
                    // Iterate over defaults to see if it's a default profile
                    let defaultProfile: boolean = false;
                    for (const def in teamConfigDefs) {
                        if (teamConfigDefs[def] === prof) {
                            // A match was found, it is a default profile
                            defaultProfile = true;
                        }
                    }
                    const profAttrs: IProfAttrs = {
                        profName: prof,
                        profType: teamConfigProfs[profile].type,
                        isDefaultProfile: defaultProfile,
                        profLoc: {
                            locType: ProfLocType.TEAM_CONFIG,
                            osLoc: undefined,
                            jsonLoc: undefined
                        }
                    }
                }
            }
        } else {
            // put something here
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
                    osLoc: nodeJsPath.resolve(profRootDir + "/" + profileType + "/" +
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
     *
     * @param profile
     *        The profile whose arguments are to be merged.
     *
     * @returns An object that contains an array of known profile argument
     *          values and an array of required profile arguments which
     *          have no value assigned. Either of the two arrays could be
     *          of zero length, depending on the user's configuration
     *
     *          We will return null if the profile does not exist
     *          in the current Zowe configuration.
     */
    public mergeArgsForProfile(profile: IProfAttrs): IProfMergedArg {
        let mergedArgs: IProfMergedArg = null;

        // todo: Actually implement something
        const implementSomething: any = null;
        mergedArgs = implementSomething;

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
        let mergedArgs: IProfMergedArg = null;

        // todo: Actually implement something
        const implementSomething: any = null;
        mergedArgs = implementSomething;

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
    private ensureReadFromDisk()  {
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

    private getTeamSubProfiles(path: string, profileType?: string): IProfAttrs[] {
        const profiles: IProfAttrs[] = [];
        
        this.getTeamSubProfiles(profileType);
        return profiles;
    }
}
