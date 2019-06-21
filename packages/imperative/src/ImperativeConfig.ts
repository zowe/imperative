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

import { Constants } from "../../constants";
import { CommandPreparer, ICommandDefinition, ICommandProfileTypeConfiguration } from "../../cmd";
import { CompleteProfilesGroupBuilder } from "./profiles/builders/CompleteProfilesGroupBuilder";
import { DefinitionTreeResolver } from "./DefinitionTreeResolver";
import { Logger } from "../../logger";
import { dirname, join } from "path";
import { IImperativeConfig } from "./doc/IImperativeConfig";
import { ImperativeError } from "../../error";
import { EnvironmentalVariableSettings } from "./env/EnvironmentalVariableSettings";

/**
 * This class is used to contain all configuration being set by Imperative.
 * It is a singleton and should be accessed via ImperativeConfig.instance.
 */
export class ImperativeConfig {
    /**
     * This is the variable that stores the specific instance of Imperative Config.
     * Defined as static so that it can be accessed from anywhere.
     *
     * @private
     * @type {ImperativeConfig}
     */
    private static mInstance: ImperativeConfig = null;


    /**
     * This variable is used to contain an instance of the Logger object.
     *
     * @private
     * @type {Logger}
     */
    private console: Logger = Logger.getImperativeLogger();

    /**
     * This parameter is used as the container of all loaded configuration for
     * Imperative.
     *
     * @private
     * @type {IImperativeConfig}
     */
    private mLoadedConfig: IImperativeConfig = null;

    /**
     * This parameter is used to contain the caller location of imperative configuration file.
     *
     * @private
     * @type {string}
     */
    private mCallerLocation: string = null;

    /**
     * This is the package name of the host application. It will only be set once accessed to
     * lessen loads to the host package.json.
     */
    private mHostPackageName: string;

    /**
     * This is the name of our imperative package. It will only be set once accessed to
     * lessen loads to the imperative package.json.
     *
     * It isn't hardcoded so that the name of our package can change without affecting
     * modules dependent on it.
     */
    private mImperativePackageName: string;

    /**
     * Gets a single instance of the PluginIssues. On the first call of
     * ImperativeConfig.instance, a new Plugin Issues object is initialized and returned.
     * Every subsequent call will use the one that was first created.
     *
     * @returns {ImperativeConfig} The newly initialized PMF object.
     */
    public static get instance(): ImperativeConfig {
        if (this.mInstance == null) {
            this.mInstance = new ImperativeConfig();
        }

        return this.mInstance;
    }

    /**
     * Set the caller location.
     * @param {string} location new location to be updated with
     */
    public set callerLocation(location: string) {
        this.mCallerLocation = location;
    }

    /**
     * Return file location of imperative configuration file.
     * @returns {string} - location of configuration file
     */
    public get callerLocation(): string {
        return this.mCallerLocation;
    }

    /**
     * Set the loaded config data.
     * @param {IImperativeConfig} config to be set.
     */
    public set loadedConfig(config: IImperativeConfig) {
        this.mLoadedConfig = config;
    }

    /**
     * Retrieve the loaded config (if init has
     * @returns {IImperativeConfig} - the config that has been loaded, if any
     */
    public get loadedConfig(): IImperativeConfig {
        return this.mLoadedConfig;
    }

    /**
     * Retrieve the host package name from which imperative was called.
     */
    public get hostPackageName(): string {
        if (!this.mHostPackageName) {
            this.mHostPackageName = this.callerPackageJson.name;
        }

        return this.mHostPackageName;
    }

    /**
     * Retrieve the package name of the imperative application.
     */
    public get imperativePackageName(): string {
        if (!this.mImperativePackageName) {
            this.mImperativePackageName = require(join(__dirname, "../../../package.json")).name;
        }

        return this.mImperativePackageName;
    }

    /**
     * Add a new command group by inserting it to the definitions list of the loaded config.
     * @param {ICommandDefinition} cmdDefToAdd - command definition group to to be added.
     */
    public addCmdGrpToLoadedConfig(cmdDefToAdd: ICommandDefinition): void {
        if (this.loadedConfig != null) {
            if (this.loadedConfig.definitions == null) {
                this.loadedConfig.definitions = [];
            }
            const defIndex = this.loadedConfig.definitions.indexOf(cmdDefToAdd);
            if (defIndex > -1) {
                this.loadedConfig.definitions.splice(defIndex, 1);
            }
            this.console.debug("Adding definition = '" + cmdDefToAdd.name + "'");
            this.loadedConfig.definitions.push(cmdDefToAdd);
        }
    }

    /**
     * Add a new set of profiles by inserting them into the profiles of the loaded config.
     * @param {ICommandProfileTypeConfiguration[]} profiles
     *    Array of profiles to be added.
     */
    public addProfiles(profiles: ICommandProfileTypeConfiguration[]): void {
        if (this.loadedConfig) {
            if (!this.loadedConfig.profiles) {
                this.loadedConfig.profiles = [];
            }
            for (const profileToAdd of profiles) {
                /* We expect to not find (ie, undefined result) an exiting profile
                 * with the same type value as the profile that we want to add.
                 */
                const existingProfile: ICommandProfileTypeConfiguration =
                    this.loadedConfig.profiles.find((profileToTest) => {
                        return profileToTest.type === profileToAdd.type;
                    });
                if (existingProfile) {
                    this.console.error("addProfiles: The profile of type '" + profileToAdd.type +
                        "' already exists. It will not be added.");
                    continue;
                }
                this.console.debug("addProfiles: Adding " + profileToAdd.type + " profile");
                this.loadedConfig.profiles.push(profileToAdd);
            } // end for
        } // end if loadedConfig not null
    }

    /**
     * Parses the package.json file and searches for the symlink name used under "bin".
     * @returns {string} - return bin symlink name if present, otherwise null
     */
    public findPackageBinName(): string {
        const pkg = this.callerPackageJson;
        if (typeof pkg.bin === "string") {
            return pkg.name;
        } else if (typeof pkg.bin === "object") {
            return Object.keys(pkg.bin).pop();
        }
        return null;
    }

    /**
     * Return the cli Home path.
     * @return {string} path to cli Home.
     */
    public get cliHome(): string {
        const settings = EnvironmentalVariableSettings.read(this.loadedConfig.envVariablePrefix || this.loadedConfig.name);
        if (settings.cliHome.value != null) {
            return settings.cliHome.value;
        }
        return this.loadedConfig.defaultHome;
    }

    /**
     * Return profile Directory.
     * @return {string} profile directory.
     */
    public get profileDir(): string {
        return this.loadedConfig.defaultHome + Constants.PROFILES_DIR + "/";
    }

    /**
     * Get imperative's host CLI command tree with all module globs resolved.
     *
     * @return {ICommandDefinition} The resolved command tree
     */
    public get resolvedCmdTree(): ICommandDefinition {
        const config = this.loadedConfig;
        return DefinitionTreeResolver.resolve(config.rootCommandDescription || "",
            config.productDisplayName,
            dirname(this.callerLocation),
            this.console,
            config.definitions, config.commandModuleGlobs
        );
    }

    /**
     * Get imperative's host CLI command tree after final preparation.
     *
     * @param {IImperativeConfig} resolvedCmdTree - The imperative command tree
     *        returned by ImperativeConfig.resolvedCmdTree()
     */
    public getPreparedCmdTree(resolvedCmdTree: ICommandDefinition): ICommandDefinition {
        let preparedCmdTree = this.addAutoGeneratedCommands(resolvedCmdTree);
        preparedCmdTree = CommandPreparer.prepare(preparedCmdTree);
        return preparedCmdTree;
    }

    /**
     * Return package.json of the imperative user
     * @returns {any} - package.json file of caller
     */
    public get callerPackageJson(): any {
        return this.getCallerFile("package.json");
    }

    /**
     * Require a file from a project using imperative accounting for imperative being contained
     * separately from the current implementers directory.
     * @param {string} file - the file to require from project using imperative
     */
    public getCallerFile(file: string): any {
        // try to locate the file using find-up first
        let findupErr: Error;
        try {
            const filePath = require("find-up").sync(file, {cwd: ImperativeConfig.instance.callerLocation});
            return require(filePath);
        } catch (e) {
            // couldn't locate using find-up, try to require directly
            findupErr = e;
        }
        // if we couldn't find the file path through find-up, try requiring the string directly
        try {
            return require(file);
        } catch (e) {
            e.message = "Could not locate the specified module through requiring directly, nor through " +
                "searching the directories above " + this.callerLocation +
                ". 'require()' error message: " + e.message +
                " \n 'find-up' (directory search) error message:" + findupErr.message;
            throw new ImperativeError({msg: e.message});
        }
    }

    /**
     * Append any auto generated commands to the root command document depending on configuration.
     * @param {ICommandDefinition} rootCommand - the root command as built so far
     * @returns {ICommandDefinition} - the root command with any auto generated commands appended
     */
    private addAutoGeneratedCommands(rootCommand: ICommandDefinition): ICommandDefinition {
        const loadedConfig: IImperativeConfig = this.loadedConfig;
        if ((loadedConfig.autoGenerateProfileCommands == null || loadedConfig.autoGenerateProfileCommands) &&
            loadedConfig.profiles != null &&
            loadedConfig.profiles.length > 0) {
            rootCommand.children.push(CompleteProfilesGroupBuilder.getProfileGroup(loadedConfig.profiles, this.console));
        }
        return rootCommand;
    }

}
