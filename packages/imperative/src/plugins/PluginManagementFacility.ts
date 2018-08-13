/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import { IImperativeConfig } from "../../src/doc/IImperativeConfig";
import { ImperativeConfig } from "../../src/ImperativeConfig";
import { isAbsolute, join } from "path";
import { JsUtils } from "../../../utilities";
import { Logger } from "../../../logger";
import { existsSync, mkdirSync } from "fs";
import { PMFConstants } from "./utilities/PMFConstants";
import { readFileSync, writeFileSync } from "jsonfile";
import { IPluginIssues } from "./doc/IPluginIssues";
import { ICommandDefinition, ICommandProfileTypeConfiguration } from "../../../cmd";
import { IssueSeverity, PluginIssues } from "./utilities/PluginIssues";
import { ConfigurationValidator } from "../ConfigurationValidator";
import { ConfigurationLoader } from "../ConfigurationLoader";
import { DefinitionTreeResolver } from "../DefinitionTreeResolver";

/**
 * This class is the main engine for the Plugin Management Facility. The
 * underlying class should be treated as a singleton and should be accessed
 * via PluginManagmentFacility.instance.
 */
export class PluginManagementFacility {
    /**
     * This is the variable that stores the specific instance of the PMF. Defined
     * as static so that it can be accessed from anywhere.
     *
     * @private
     * @type {PluginManagementFacility}
     */
    private static mInstance: PluginManagementFacility;

    /**
     * Gets a single instance of the PMF. On the first call of
     * PluginManagementFacility.instance, a new PMF is initialized and returned.
     * Every subsequent call will use the one that was first created.
     *
     * @returns {PluginManagementFacility} - The newly initialized PMF object.
     */
    public static get instance(): PluginManagementFacility {
        if (this.mInstance == null) {
            this.mInstance = new PluginManagementFacility();
        }

        return this.mInstance;
    }

    /**
     * The CLI command tree with module globs already resolved.
     *
     * @private
     * @type {ICommandDefinition}
     */
    private resolvedCliCmdTree: ICommandDefinition = null;

    /**
     * The property name within package.json that holds the
     * Imperative configuration object.
     *
     * @private
     * @type {string}
     */
    private readonly impConfigPropNm = "imperative";

    /**
     * Used for internal imperative logging.
     *
     * @private
     * @type {Logger}
     */
    private impLogger: Logger = Logger.getImperativeLogger();

    /**
     * A class with recorded issues for each plugin for which problems were detected.
     *
     * @private
     * @type {IPluginIssues}
     */
    private pluginIssues = PluginIssues.instance;

    /**
     * The name of the plugin currently being processed.
     * This is required by callback function requirePluginModule, whose signature
     * is fixed, and cannot have the plugin name passed in.
     *
     * @private
     * @type {string}
     */
    private mCurrPluginName: string = null;

    /**
     * Get the name of the plugin currently being processed.
     * @returns {string} - plugin name
     */
    public get currPluginName(): string {
        return this.mCurrPluginName;
    }

    /**
     * Get the name of the plugin currently being processed.
     * @returns {string} - plugin name
     */
    public set currPluginName(pluginName: string) {
        this.mCurrPluginName = pluginName;
    }

    /**
     * The NPM package name from the current plugin's package.json 'name' property.
     *
     * @private
     * @type {string}
     */
    private npmPkgName: string = null;

    /**
     * A set of bright dependencies used by plugins. Each item in the
     * set contains the dependency's property name, and the the version
     * of that dependency.
     *
     * @type {Object}
     */
    private readonly npmPkgNmProp = "name";
    private readonly brightCorePkgName = "@brightside/core";
    private readonly noPeerDependency = "NoPeerDepSupplied";
    private pluginBrightDeps = {
        cliCoreDep: {
            pluginPropName: this.brightCorePkgName,
            pluginVer: this.noPeerDependency
        },
        imperativeDep: {
            pluginPropName: "@brightside/imperative",
            pluginVer: this.noPeerDependency
        }
    };

    /**
     * The semantic versioning module (which does not have the
     * typing to do an 'import').
     */
    private readonly semver = require("semver");

    /**
     * Tracker to ensure that [init]{@link PluginManagementFacility#init} was
     * called. Most methods cannot be used unless init was called first.
     *
     * @private
     * @type {boolean}
     */
    private wasInitCalled = false;

    // __________________________________________________________________________
    /**
     * Initialize the PMF. Must be called to enable the various commands provided
     * by the facility.
     */
    public init(): void {
        this.impLogger.debug("PluginManagementFacility.init() - Start");
        const pmf: PMFConstants = PMFConstants.instance;

        // Initialize the plugin.json file if needed
        if (!existsSync(pmf.PLUGIN_JSON)) {
            if (!existsSync(pmf.PMF_ROOT)) {
                this.impLogger.debug("Creating PMF_ROOT directory");
                mkdirSync(pmf.PMF_ROOT);
            }

            this.impLogger.debug("Creating PLUGIN_JSON file");
            writeFileSync(pmf.PLUGIN_JSON, {});
        }

        // Add the plugin group and related commands.
        ImperativeConfig.instance.addCmdGrpToLoadedConfig({
            name: "plugins",
            type: "group",
            description: "Install and manage plug-ins",
            children: [
                // Done dynamically so that PMFConstants can be initialized
                require("./cmd/install/install.definition").installDefinition,
                require("./cmd/list/list.definition").listDefinition,
                require("./cmd/uninstall/uninstall.definition").uninstallDefinition,
                require("./cmd/update/update.definition").updateDefinition,
                require("./cmd/validate/validate.definition").validateDefinition
            ]
        });

        // When everything is done set this variable to true indicating successful
        // initialization.
        this.wasInitCalled = true;
        this.impLogger.debug("PluginManagementFacility.init() - Success");
    }

    // __________________________________________________________________________
    /**
     * Add all installed plugins' commands and profiles into the host CLI's command tree.
     *
     * @param {ICommandDefinition} resolvedCliCmdTree - The CLI command tree with
     *        module globs already resolved.
     */
    public addPluginsToHostCli(resolvedCliCmdTree: ICommandDefinition): void {
        // Store the host CLI command tree. Later functions will use it.
        this.resolvedCliCmdTree = resolvedCliCmdTree;

        // loop through each plugin installed in our plugins file
        const installedPlugins = this.pluginIssues.getInstalledPlugins();
        for (const pluginName in installedPlugins) {
            if (installedPlugins.hasOwnProperty(pluginName)) {
                this.mCurrPluginName = pluginName;
                this.addPlugin(pluginName);

                // log the issue list for this plugin
                const issueListForPlugin = this.pluginIssues.getIssueListForPlugin(pluginName);
                if (issueListForPlugin.length > 0) {
                    this.impLogger.debug("addPluginsToHostCli: Issues for plugin = '" + pluginName + "':\n" +
                        JSON.stringify(issueListForPlugin, null, 2));
                } else {
                    this.impLogger.debug("addPluginsToHostCli: Plugin = '" + pluginName +
                        "' was successfully validated with no issues.");
                }
            }
        }
    }

    // __________________________________________________________________________
    /**
     * Require a module from a plugin using a relative path name to the module.
     * Used to load configuration handlers.
     *
     * @param {string} relativePath - A relative path from plugin's root.
     *        Typically supplied as ./lib/blah/blah/blah.
     *
     * @returns {any} - The content exported from the specified module.
     */
    public requirePluginModule(relativePath: string): any {
        const pluginName: string = this.currPluginName;
        const pluginModuleRuntimePath = this.formPluginRuntimePath(pluginName, relativePath);
        try {
            return require(pluginModuleRuntimePath);
        } catch (requireError) {
            PluginIssues.instance.recordIssue(pluginName, IssueSeverity.ERROR,
                "Unable to load the following module for plug-in '" +
                pluginName + "' :\n" + pluginModuleRuntimePath + "\n" +
                "Reason = " + requireError.message
            );
            return "{}";
        }
    }

    // __________________________________________________________________________
    /**
     * Add the specified plugin to the imperative configuration.
     *
     * @param {string} pluginName - the name of the plugin to initialize
     */
    private addPlugin(pluginName: string): void {
        // read plugin's config from its package.json
        const pluginConfig = this.readPluginConfig(pluginName);
        if (pluginConfig == null) {
            this.impLogger.error(
                "addPlugin: Unable to read the configuration for the plug-in named '" +
                pluginName + "' The plug-in was not added to the available commands."
            );
            return;
        }

        /* Form a top-level command group for this plugin.
         * Resolve all means of command definition into the pluginCmdGroup.children
         */
        let pluginCmdGroup: ICommandDefinition = null;
        try {
            pluginCmdGroup = {
                name: pluginConfig.name,
                description: pluginConfig.rootCommandDescription,
                type: "group",
                children: DefinitionTreeResolver.combineAllCmdDefs(
                    this.formPluginRuntimePath(pluginName, "./lib"),
                    pluginConfig.definitions, pluginConfig.commandModuleGlobs
                )
            };
            /**
             * Fill in the optional aliases and summary fields,
             * if specified.
             */
            if (pluginConfig.pluginSummary != null) {
                this.impLogger.debug("Adding summary from pluginSummary field of configuration");
                pluginCmdGroup.summary = pluginConfig.pluginSummary;
            }
            if (pluginConfig.pluginAliases != null) {
                this.impLogger.debug("Adding aliases from pluginAliases field of configuration");
                pluginCmdGroup.aliases = pluginConfig.pluginAliases;
            }
        }
        catch (impErr) {
            const errMsg = "Failed to combine command definitions. Reason = " + impErr.message;
            this.impLogger.error("addPlugin: DefinitionTreeResolver.combineAllCmdDefs: " + errMsg);
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR, errMsg);
            return;
        }

        // validate the plugin's configuration
        if (this.validatePlugin(pluginName, pluginConfig, pluginCmdGroup) === false) {
            this.impLogger.error("addPlugin: The plug-in named '" + pluginName +
                "' failed validation and was not added to the available commands.");
            return;
        }

        // add the new plugin group into the imperative command tree
        this.impLogger.debug("addPlugin: Adding plug-in commands to Imperative for plugin = '" +
            pluginName + "' with this plugin command group:\n" +
            JSON.stringify(pluginCmdGroup, null, 2)
        );
        if (!this.addCmdGrpToResolvedCliCmdTree(pluginName, pluginCmdGroup)) {
            return;
        }

        // add the profiles for this plugin to our imperative config object
        if (pluginConfig.profiles && pluginConfig.profiles.length > 0) {
            this.impLogger.debug("addPlugin: Adding these profiles for plug-in = '" +
                pluginName + "':\n" +
                JSON.stringify(pluginConfig.profiles, null, 2)
            );
            try {
                ImperativeConfig.instance.addProfiles(pluginConfig.profiles);
            }
            catch (impErr) {
                const errMsg = "Failed to add profiles for the plug-in = '" + pluginName +
                    "'.\nReason = " + impErr.message +
                    "\nBecause of profile error, removing commands for this plug-in";
                this.impLogger.error("addPlugin: " + errMsg);
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR, errMsg);
                this.removeCmdGrpFromResolvedCliCmdTree(pluginCmdGroup);
            }
        }
    }

    // __________________________________________________________________________
    /**
     * Add a new command group into the host CLI's resolved command tree.
     * We had to wait until the host CLI was resolved, so that we could check for
     * name conflicts. So each  plugin's commands are added to the host CLI
     * command tree after both have been resolved.
     *
     * @param {string} pluginName - the name of the plugin to initialize
     *
     * @param {ICommandDefinition} cmdDefToAdd - command definition group to to be added.
     *
     * @returns True upon success. False upon error, and errors are recorded in pluginIssues.
     */
    private addCmdGrpToResolvedCliCmdTree(pluginName: string, cmdDefToAdd: ICommandDefinition): boolean {
        if (this.resolvedCliCmdTree == null) {
            const errMsg = "The resolved command tree was null. " +
                "Imperative should have created an empty command definition array.";
            this.impLogger.error("addCmdGrpToResolvedCliCmdTree: While adding plugin = '" +
                pluginName + "', " + errMsg);
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR, errMsg);
            return false;
        }

        if (this.resolvedCliCmdTree.children == null) {
            const errMsg = "The resolved command tree children was null. " +
                "Imperative should have created an empty children array.";
            this.impLogger.error("addCmdGrpToResolvedCliCmdTree: While adding plugin = '" +
                pluginName + "', " + errMsg);
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR, errMsg);
            return false;
        }

        const cmdDefInx = this.resolvedCliCmdTree.children.findIndex((existingCmdDef: ICommandDefinition) => {
            return existingCmdDef.name === cmdDefToAdd.name;
        });
        if (cmdDefInx > -1) {
            const errMsg = "The command group = '" + cmdDefToAdd.name +
                "' already exists. Plugin management should have already rejected this plugin.";
            this.impLogger.error("addCmdGrpToResolvedCliCmdTree: " + errMsg);
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR, errMsg);
            return false;
        }
        this.impLogger.debug("Adding definition = '" + cmdDefToAdd.name + "' to the resolved command tree.");
        this.resolvedCliCmdTree.children.push(cmdDefToAdd);
        return true;
    }

    // __________________________________________________________________________
    /**
     * Compare the version of a plugin version property with a version property
     * of its base CLI.
     *
     * If the versions do not intersect (according so semver rules), then a
     * PluginIssue is recorded.
     *
     * @param  pluginVerPropNm - The name of the plugin property containing a version.
     *
     * @param  pluginVerVal - value of the plugin's version.
     *
     * @param  cliVerPropNm - The name of the base CLI property containing a version.
     *
     * @param  cliVerVal - value of the base CLI's version.
     *
     */
    private comparePluginVersionToCli(
        pluginVerPropNm: string,
        pluginVerVal: string,
        cliVerPropNm: string,
        cliVerVal: string
    ): void {
        const cliCmdName = this.getCliCmdName();
        try {
            if (!this.semver.intersects(cliVerVal, pluginVerVal, false)) {
                this.pluginIssues.recordIssue(this.mCurrPluginName, IssueSeverity.WARNING,
                    "The version value (" + pluginVerVal + ") of the plugin's '" +
                    pluginVerPropNm + "' property is incompatible with the version value (" +
                    cliVerVal + ") of the " + cliCmdName + " command's '" +
                    cliVerPropNm + "' property."
                );
            }
        } catch (semverExcept) {
            PluginIssues.instance.recordIssue(this.mCurrPluginName, IssueSeverity.WARNING,
                "Failed to compare the version value (" +
                pluginVerVal + ") of the plugin's '" + pluginVerPropNm +
                "' property with the version value (" + cliVerVal +
                ") of the " + cliCmdName + " command's '" + cliVerPropNm + "' property.\n" +
                "This can occur when one of the specified values is not a valid version string.\n" +
                "Reported reason = " + semverExcept.message
            );
        }
    }

    // __________________________________________________________________________
    /**
     * Get the command name of our base CLI.
     *
     * Note: We cannot use Imperative.rootCommandName because it creates a
     * circular dependency.
     *
     * @returns The CLI command name contained in the package.json 'bin' property.
     */
    private getCliCmdName(): string {
        // get the name of the base CLI for error messages
        let cliCmdName = ImperativeConfig.instance.findPackageBinName();
        if (cliCmdName === null) {
            cliCmdName = "YourBaseCliName";
        }
        return cliCmdName;
    }

    // __________________________________________________________________________
    /**
     * Get the package name of our base CLI.
     *
     * @returns The CLI package name contained in the package.json 'name' property.
     */
    private getCliPkgName(): string {
        const cliPackageJson: any = ImperativeConfig.instance.callerPackageJson;
        if (!cliPackageJson.hasOwnProperty(this.npmPkgNmProp)) {
            return "NoNameInCliPkgJson";
        }
        return cliPackageJson[this.npmPkgNmProp];
    }

    // __________________________________________________________________________
    /**
     * Remove a command group that was previously added.
     * We remove a command group if we discover errors after
     * adding the command group.
     *
     * @param {ICommandDefinition} cmdDefToRemove - command definition to be removed.
     */
    private removeCmdGrpFromResolvedCliCmdTree(cmdDefToRemove: ICommandDefinition): void {
        if (this.resolvedCliCmdTree &&
            this.resolvedCliCmdTree.children &&
            this.resolvedCliCmdTree.children.length > 0
        ) {
            const cmdDefInx = this.resolvedCliCmdTree.children.findIndex((existingCmdDef: ICommandDefinition) => {
                return existingCmdDef.name === cmdDefToRemove.name;
            });
            if (cmdDefInx > -1) {
                this.impLogger.debug("Removing definition = '" + cmdDefToRemove.name + "'");
                this.resolvedCliCmdTree.children.splice(cmdDefInx, 1);
            }
        }
    }

    // __________________________________________________________________________
    /**
     * Does the supplied pluginGroupNm match an existing top-level
     * name or alias in the imperative command tree?
     * If a conflict occurs, plugIssues.doesPluginHaveError() will return true.
     *
     * @param {string} pluginName - The name of the plugin that we are checking.
     *
     * @param {string} pluginGroupNm - A plugin's top-level group name.
     *
     * @param {ICommandDefinition} cmdTreeDef - A top-level command tree
     *        definition against which we compare the supplied
     *        pluginGroupNm. It is typically the imperative command tree.
     *
     * @returns {[boolean, string]} - {hasConflict, message} - hasConflict: True when we found a conflict.
     *                                False when find no conflicts.
     *                                message: the message describing the conflict
     */
    private conflictingNameOrAlias(
        pluginName: string,
        pluginGroupDefinition: ICommandDefinition,
        cmdTreeDef: ICommandDefinition
    ): {hasConflict: boolean, message: string} {
        const pluginGroupNm: string = pluginGroupDefinition.name;
        /* Confirm that pluginGroupNm is not an existing top-level
         * group or command in the imperative command tree
         * and confirm that none of the plugin aliases match any command names
         */
        if (pluginGroupNm.toLowerCase() === cmdTreeDef.name.toLowerCase()) {
            const conflictMessage = this.impLogger.error("The plugin named '%s' attempted to add a group of commands" +
                " with the name '%s'" +
                ". Your base application already contains a group with the name '%s'.", pluginGroupNm, pluginGroupDefinition.name,
                cmdTreeDef.name);
            return {hasConflict: true, message: conflictMessage};
        }

        if (pluginGroupDefinition.aliases != null) {
            for (const pluginAlias of pluginGroupDefinition.aliases) {
                if (pluginAlias.toLowerCase() === cmdTreeDef.name.toLowerCase()) {
                    const conflictMessage = this.impLogger.error("The plugin named '%s' attempted to add a group of commands" +
                        " with the alias '%s' " +
                        ". Your base application already contains a group with the name '%s'.", pluginGroupNm, pluginAlias,
                        cmdTreeDef.name);
                    return {hasConflict: true, message: conflictMessage};
                }
            }
        }
        /* Confirm that pluginGroupNm is not an existing top-level
         * alias in the command tree definition.
         */
        if (cmdTreeDef.hasOwnProperty("aliases")) {
            for (const nextAliasToTest of cmdTreeDef.aliases) {
                // if the plugin name matches an alias of the definition tree
                if (pluginGroupNm.toLowerCase() === nextAliasToTest.toLowerCase()) {
                    const conflictMessage = this.impLogger.error("The plugin attempted to add a group of commands with the name '%s' " +
                        ". Your base application already contains a group with an alias '%s'.", pluginGroupNm, nextAliasToTest,
                        cmdTreeDef.name);
                    return {hasConflict: true, message: conflictMessage};
                }
                if (pluginGroupDefinition.aliases != null) {
                    for (const pluginAlias of pluginGroupDefinition.aliases) {
                        // if an alias of the plugin matches an alias of hte definition tree
                        if (pluginAlias.toLowerCase() === nextAliasToTest.toLowerCase()) {
                            const conflictMessage = this.impLogger.error("The plugin named '%s' attempted to add a " +
                                "group of command with the alias '%s', which conflicts with " +
                                "another alias of the same name for group '%s'.", pluginGroupDefinition.name, pluginAlias,
                                cmdTreeDef.name);
                            return {hasConflict: true, message: conflictMessage};
                        }
                    }
                }
            }
        }
        // no conflict if we got this far
        return {hasConflict: false, message: undefined};
    }

    // __________________________________________________________________________
    /**
     * Form the absolute path to a runtime file for a plugin from a path name
     * that is relative to the plugin's root directory (where its package.json lives).
     *
     * @param {string} pluginName - The name of the plugin.
     *
     * @param {string} relativePath - A relative path from plugin's root.
     *        Typically supplied as ./lib/blah/blah/blah.
     *        If not supplied, (or supplied as an an empty string,
     *        the result will be a path to
     *        <The_PLUGIN_NODE_MODULE_LOCATION_ForTheBaseCLI>/<pluginName>.
     *        If an absolute path is supplied, it is returned exactly as supplied.
     *
     * @returns {string} - The absolute path to the file.
     */
    private formPluginRuntimePath(
        pluginName: string,
        relativePath: string = ""
    ): string {
        const pluginRuntimeDir = join(PMFConstants.instance.PLUGIN_NODE_MODULE_LOCATION, pluginName);

        if (relativePath.length === 0) {
            return pluginRuntimeDir;
        }

        /* If the relative path is already absolute, do not place our
         * plugin's runtime location in front of the supplied path.
         */
        if (isAbsolute(relativePath)) {
            return relativePath;
        }

        return join(pluginRuntimeDir, relativePath);
    }

    // __________________________________________________________________________
    /**
     * Read a plugin's configuration object from the 'imperative' property of
     * the plugin's package.json file.
     *
     * @param {string} pluginName - the name of the plugin
     *
     * @returns {IImperativeConfig} - The plugin's configuration object
     *    or null if the plugin's configuration cannot be retrieved.
     *    Errors are recorded in PluginIssues.
     */
    private readPluginConfig(pluginName: string): IImperativeConfig {
        this.impLogger.debug("readPluginConfig: Reading configuration for plugin = '" +
            pluginName + "' from its package.json file.");

        // this is the starting point for reporting plugin issues, so clear old ones
        this.pluginIssues.removeIssuesForPlugin(pluginName);

        // confirm that we can find the path to the plugin node_module
        const pluginRunTimeRootPath = this.formPluginRuntimePath(pluginName);
        if (!existsSync(pluginRunTimeRootPath)) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The path to the plugin does not exist: " + pluginRunTimeRootPath);
            return null;
        }

        // confirm that we can find the path to the plugin's package.json
        const pluginPkgJsonPathNm = join(pluginRunTimeRootPath, "package.json");
        if (!existsSync(pluginPkgJsonPathNm)) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "Configuration file does not exist: '" + pluginPkgJsonPathNm + "'");
            return null;
        }

        // read package.json
        let pkgJsonData: any = null;
        try {
            pkgJsonData = readFileSync(pluginPkgJsonPathNm);
        }
        catch (ioErr) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "Cannot read '" + pluginPkgJsonPathNm +
                "' Reason = " + ioErr.message);
            return null;
        }

        // extract the plugin npm package name property for later use in class
        if (pkgJsonData.hasOwnProperty(this.npmPkgNmProp)) {
            this.npmPkgName = pkgJsonData[this.npmPkgNmProp];
        }

        // use the CLI's package name as a peer dependency in the plugin
        const cliPkgName = this.getCliPkgName();
        const cliCmdName = this.getCliCmdName();
        if (cliPkgName === "NoNameInCliPkgJson"){
            this.pluginIssues.recordIssue(this.mCurrPluginName, IssueSeverity.WARNING,
                "The property '" + this.npmPkgNmProp +
                "' does not exist in the package.json file of the '" +
                cliCmdName + "' project. Defaulting to " +
                "'" + this.brightCorePkgName + "',"
            );
        } else {
            this.pluginBrightDeps.cliCoreDep.pluginPropName = cliPkgName;
        }

        // confirm that the peerDependencies property exists in plugin's package.json
        const peerDepPropNm = "peerDependencies";
        if (pkgJsonData.hasOwnProperty(peerDepPropNm)) {
            // get the version of the host CLI dependency for this plugin
            if (pkgJsonData[peerDepPropNm].hasOwnProperty(this.pluginBrightDeps.cliCoreDep.pluginPropName)) {
                this.pluginBrightDeps.cliCoreDep.pluginVer =
                    pkgJsonData[peerDepPropNm][this.pluginBrightDeps.cliCoreDep.pluginPropName];
            } else {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.WARNING,
                    "The property '" + this.pluginBrightDeps.cliCoreDep.pluginPropName +
                    "' does not exist within the '" + peerDepPropNm +
                    "' property in the file '" + pluginPkgJsonPathNm + "'."
                );
            }

            // get the version of the imperative dependency for this plugin
            if (pkgJsonData[peerDepPropNm].hasOwnProperty(this.pluginBrightDeps.imperativeDep.pluginPropName)) {
                this.pluginBrightDeps.imperativeDep.pluginVer =
                    pkgJsonData[peerDepPropNm][this.pluginBrightDeps.imperativeDep.pluginPropName];
            } else {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.WARNING,
                    "The property '" + this.pluginBrightDeps.imperativeDep.pluginPropName +
                    "' does not exist within the '" + peerDepPropNm +
                    "' property in the file '" + pluginPkgJsonPathNm + "'."
                );
            }
        } else {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.WARNING,
                "Your @brightside dependencies must be contained within a '" + peerDepPropNm +
                "' property. That property does not exist in the file '" +
                pluginPkgJsonPathNm + "'."
            );
        }

        // extract the imperative property
        if (!pkgJsonData.hasOwnProperty(this.impConfigPropNm)) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The required property '" + this.impConfigPropNm +
                "' does not exist in file '" + pluginPkgJsonPathNm + "'.");
            return null;
        }

        // use the core imperative loader because it will load config modules
        let pluginConfig: IImperativeConfig;
        try {
            pluginConfig = ConfigurationLoader.load(
                null, pkgJsonData, this.requirePluginModule.bind(this)
            );
        }
        catch (impError) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "Failed to load the plugin's configuration from:\n" +
                pluginPkgJsonPathNm +
                "\nReason = " + impError.message
            );
            return null;
        }

        return pluginConfig;
    }

    // __________________________________________________________________________
    /**
     * Validates that the semver range strings specified by the plugin for
     * versions of the imperative framework and host CLI program are compatible
     * with those specified in the host CLI.
     *
     * Both range strings come from the package.json files of the plugin and the
     * hosting CLI. We consider the version ranges to be compatible if the two
     * ranges intersect. This should allow npm to download one common version
     * of core and of imperative to be owned by the base CLI and shared by the plugin.
     *
     * Any errors are recorded in PluginIssues.
     *
     * @param {string} pluginName - The name of the plugin being validated.
     */
    private validatePeerDepVersions(pluginName: string): void {
        // get the name of the base CLI for error messages
        const cliCmdName = this.getCliCmdName();
        const cliPackageJson: any = ImperativeConfig.instance.callerPackageJson;
        let cliVerPropName = "version";

        // compare the plugin's requested CLI version with the CLI's actual version
        if ( this.pluginBrightDeps.cliCoreDep.pluginVer !== this.noPeerDependency) {
            if (cliPackageJson.hasOwnProperty(cliVerPropName)) {
                this.comparePluginVersionToCli(
                    this.pluginBrightDeps.cliCoreDep.pluginPropName,
                    this.pluginBrightDeps.cliCoreDep.pluginVer,
                    cliVerPropName,
                    cliPackageJson[cliVerPropName]
                );
            } else {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "The property '" + cliVerPropName +
                    "' does not exist within the package.json file of the '" +
                    cliCmdName + "' project."
                );
            }
        }

        // compare the plugin's requested imperative version with the CLI's actual version
        if ( this.pluginBrightDeps.imperativeDep.pluginVer !== this.noPeerDependency) {
            /* The CLI's imperative version is within its dependencies property
             * under the same property name as the plugin uses.
             */
            const cliDepPropName = "dependencies";
            cliVerPropName = this.pluginBrightDeps.imperativeDep.pluginPropName;
            if (cliPackageJson.hasOwnProperty(cliDepPropName)) {
                if (cliPackageJson[cliDepPropName].hasOwnProperty(cliVerPropName)) {
                    this.comparePluginVersionToCli(
                        this.pluginBrightDeps.imperativeDep.pluginPropName,
                        this.pluginBrightDeps.imperativeDep.pluginVer,
                        cliVerPropName,
                        cliPackageJson[cliDepPropName][cliVerPropName]
                    );
                } else {
                    this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                        "The property '" + cliVerPropName +
                        "' does not exist within the '" + cliDepPropName +
                        "' property in the package.json file of the '" +
                        cliCmdName + "' project."
                    );
                }
            } else {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "The property '" + cliDepPropName +
                    "' does not exist in the package.json file of the '" +
                    cliCmdName + "' project."
                );
            }
        }
    }

    // __________________________________________________________________________
    /**
     * Validate the plugin.
     *
     * @param {string} pluginName - the name of the plugin to validate
     *
     * @param {IImperativeConfig} pluginConfig - The config object for this plugin.
     *
     * @param {ICommandDefinition} pluginCmdGroup - The command group to be added
     *        for this plugin, with all commands resolved into its children property.
     *
     * @returns {boolean} - True if valid. False otherwise.
     *        PluginIssues contains the set of issues.
     */
    private validatePlugin(
        pluginName: string,
        pluginConfig: IImperativeConfig,
        pluginCmdGroup: ICommandDefinition
    ): boolean {
        if (JsUtils.isObjEmpty(pluginConfig)) {
            // without a config object, we can do no further validation
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The plugin's configuration is empty.");
            return false;
        }

        this.impLogger.debug("validatePlugin: Validating plugin = '" +
            pluginName + "' with config:\n" +
            JSON.stringify(pluginConfig, null, 2));

        // is there an imperative.name property?
        if (!pluginConfig.hasOwnProperty("name")) {
            // can we default to the npm package name?
            if (this.npmPkgName == null) {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "The plugin's configuration does not contain an '" +
                    this.impConfigPropNm + ".name' property, or an npm package 'name' property in package.json.");
            } else {
                pluginConfig.name = this.npmPkgName;
            }
        }

        /* Confirm that the plugin group name does not conflict with another
         * top-level item in the imperative command tree.
         */
        if (pluginConfig.hasOwnProperty("name")) {
            for (const nextImpCmdDef of this.resolvedCliCmdTree.children) {
                const conflictAndMessage = this.conflictingNameOrAlias(pluginName, pluginCmdGroup, nextImpCmdDef);
                if (conflictAndMessage.hasConflict) {
                    this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                        conflictAndMessage.message);
                    break;
                }
            }
        }

        if (!pluginConfig.hasOwnProperty("rootCommandDescription")) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The plugin's configuration does not contain an '" +
                this.impConfigPropNm + ".rootCommandDescription' property.");
        }

        /* Validate that versions of the imperative framework and
         * host CLI program are compatible with those of the host CLI.
         */
        this.validatePeerDepVersions(pluginName);

        // check if the plugin has a healthCheck() function
        if (!pluginConfig.hasOwnProperty("pluginHealthCheck")) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.WARNING,
                "The plugin's configuration does not contain an '" +
                this.impConfigPropNm + ".pluginHealthCheck' property.");
        } else {
            const healthChkModulePath =
                this.formPluginRuntimePath(pluginName, pluginConfig.pluginHealthCheck);
            const healthChkFilePath = healthChkModulePath + ".js";
            if (existsSync(healthChkFilePath)) {
                // replace relative path with absolute path in the healthCheck property
                pluginConfig.pluginHealthCheck = healthChkModulePath;
            } else {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "The program for the '" + this.impConfigPropNm +
                    ".pluginHealthCheck' property does not exist: " + healthChkFilePath);
            }
        }
        if (!pluginCmdGroup.children || pluginCmdGroup.children.length <= 0) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The plugin's configuration defines no children.");
        } else {
            // recursively validate the plugin's command definitions
            this.validatePluginCmdDefs(pluginName, pluginCmdGroup.children);
        }

        /* Plugins are not required to have profiles.
         * So, if they do not exist, just move on.
         */
        if (pluginConfig.profiles) {
            this.validatePluginProfiles(pluginName, pluginConfig.profiles);
        }

        /* Now that we have done plugin-specific validation, let the imperative
         * ConfigurationValidator perform it's detailed validation.
         *
         * The core imperative validator demands some properties required by
         * a CLI, which are not required for a plugin. So, we add all required
         * properties to a temporary plugin config, just so that we can use
         * the validator to validate all of the other properties.
         *
         * We place this check last, since it finds one error and throws an exception.
         */
        const pluginConfigToValidate: IImperativeConfig = {...pluginConfig};
        if (!pluginConfigToValidate.hasOwnProperty("defaultHome")) {
            pluginConfigToValidate.defaultHome = "defaultHome-ForValidation";
        }
        if (!pluginConfigToValidate.hasOwnProperty("productDisplayName")) {
            pluginConfigToValidate.productDisplayName = "productDisplayName-ForValidation";
        }

        try {
            ConfigurationValidator.validate(pluginConfigToValidate);
        }
        catch (impError) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The plugin configuration is invalid.\nReason = " +
                impError.message
            );
        }

        return !this.pluginIssues.doesPluginHaveError(pluginName);
    }

    // __________________________________________________________________________
    /**
     * Validate a plugin's array of command definitions at the specified depth
     * within the plugin's command definition tree. This is a recursive function
     * used to navigate down through the command tree, validating as we go.
     * If errors occur, they are recorded in PlugIssues.
     *
     * @param {string} pluginName - The name of the plugin.
     *
     * @param {ICommandDefinition[]} pluginCmdDefs - Array of plugin commands.
     *
     * @param {number} cmdTreeDepth - The depth within the plugin command
     *        tree at which we are validating. It is used within error messages.
     */
    private validatePluginCmdDefs(
        pluginName: string,
        pluginCmdDefs: ICommandDefinition[],
        cmdTreeDepth: number = 1
    ): void {
        for (const pluginCmdDef of pluginCmdDefs) {
            // check for name property
            let pluginCmdName: string = "NotYetAssigned";
            if (pluginCmdDef.hasOwnProperty("name")) {
                pluginCmdName = pluginCmdDef.name + " (at depth = " + cmdTreeDepth + ")";
            } else {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "Command definition at depth " + cmdTreeDepth + " has no 'name' property");
                pluginCmdName = "No name supplied at depth = " + cmdTreeDepth;
            }

            // check for description property
            if (!pluginCmdDef.hasOwnProperty("description")) {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "Name = '" + pluginCmdName + "' has no 'description' property");
            }

            // check for type property
            if (!pluginCmdDef.hasOwnProperty("type")) {
                this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                    "Name = '" + pluginCmdName + "' has no 'type' property");
            } else {
                // is this entry a command?
                if (pluginCmdDef.type.toLowerCase() === "command") {
                    // a command must have a handler
                    if (!pluginCmdDef.hasOwnProperty("handler")) {
                        this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                            "Command name = '" + pluginCmdName + "' has no 'handler' property");
                    } else {
                        // the handler file must exist
                        const handlerModulePath =
                            this.formPluginRuntimePath(pluginName, pluginCmdDef.handler);
                        const handlerFilePath = handlerModulePath + ".js";
                        if (existsSync(handlerFilePath)) {
                            // replace relative path with absolute path in the handler property
                            pluginCmdDef.handler = handlerModulePath;
                        } else {
                            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                                "The handler for command = '" + pluginCmdName +
                                "' does not exist: " + handlerFilePath);
                        }
                    }
                } else if (pluginCmdDef.type.toLowerCase() === "group") {
                    if (pluginCmdDef.hasOwnProperty("children")) {
                        if (pluginCmdDef.children.length > 0) {
                            // validate children at the next level down in the plugin command tree
                            this.validatePluginCmdDefs(pluginName, pluginCmdDef.children, cmdTreeDepth + 1);
                        } else {
                            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                                "Group name = '" + pluginCmdName +
                                "' has a 'children' property with no children");
                        }
                    } else {
                        // A group must have the children property.
                        this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                            "Group name = '" + pluginCmdName + "' has no 'children' property");
                    }
                } // end group
            } // end has type
        } // end for pluginCmdDefs
    } // end validatePluginCmdDefs

    // __________________________________________________________________________
    /**
     * Validate a plugin's array of profiles
     * If errors occur, they are recorded in PlugIssues.
     *
     * @param {string} pluginName - The name of the plugin.
     *
     * @param {ICommandProfileTypeConfiguration[]} pluginProfiles - Array of profiles.
     */
    private validatePluginProfiles(
        pluginName: string,
        pluginProfiles: ICommandProfileTypeConfiguration[]
    ): void {
        if (JsUtils.isObjEmpty(pluginProfiles)) {
            this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                "The plugin's existing 'profiles' property is empty.");
            return;
        }

        const impHasNoProfiles: boolean =
            JsUtils.isObjEmpty(ImperativeConfig.instance.loadedConfig) ||
            JsUtils.isObjEmpty(ImperativeConfig.instance.loadedConfig.profiles);

        // reject profiles whose top-level type conflicts with an existing profile
        const pluginProfLength = pluginProfiles.length;
        for (let currProfInx = 0; currProfInx < pluginProfLength; currProfInx++) {
            /* Reject a plugin profile that has the same profile type value as
             * an another plugin profile. We only need to compare with the
             * remaining profiles from our plugin.
             */
            let nextProfInx = currProfInx + 1;
            while (nextProfInx < pluginProfLength) {
                if (pluginProfiles[currProfInx].type === pluginProfiles[nextProfInx].type) {
                    this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                        "The plugin's profiles at indexes = '" + currProfInx +
                        "' and '" + nextProfInx + "' have the same 'type' property = '" +
                        pluginProfiles[currProfInx].type + "'."
                    );
                }
                nextProfInx++;
            }

            /* Reject a plugin profile that has the same profile type value as
             * an existing imperative profile.
             */
            if (impHasNoProfiles) {
                continue;
            }
            for (const impProfile of ImperativeConfig.instance.loadedConfig.profiles) {
                if (pluginProfiles[currProfInx].type === impProfile.type) {
                    this.pluginIssues.recordIssue(pluginName, IssueSeverity.ERROR,
                        "The plugin's profile type = '" + pluginProfiles[currProfInx].type +
                        "' already exists within existing profiles."
                    );
                }
            }
        }
    }
} // end PluginManagementFacility
