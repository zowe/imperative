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
import * as path from "path";
import * as keytar from "keytar";
import * as rimraf from "rimraf";
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ConfigBuilder, ConfigSchema } from "../../../../../config";
import { ProfileIO, ProfileUtils } from "../../../../../profiles";
import { ImperativeConfig } from "../../../../../utilities";
import { AppSettings } from "../../../../../settings";
import { PluginIssues } from "../../../plugins/utilities/PluginIssues";
import { uninstall as uninstallPlugin } from "../../../plugins/utilities/npm-interface";
import { OverridesLoader } from "../../../OverridesLoader";

/**
 * Info for obsolete CLI plug-in to be uninstalled
 */
interface IPluginToUninstall {
    /**
     * Name of plug-in to uninstall
     */
    name: string;
    /**
     * Callback to be run before uninstall
     */
    preUninstall?: () => void | Promise<void>;
    /**
     * Callback to be run after uninstall
     */
    postUninstall?: () => void | Promise<void>;
}

/**
 * Handler for the convert profiles command.
 */
export default class ConvertProfilesHandler implements ICommandHandler {
    private readonly ZOWE_CLI_PACKAGE_NAME = "@zowe/cli";

    private readonly ZOWE_CLI_SECURE_PLUGIN_NAME = "@zowe/secure-credential-store-for-zowe-cli";

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const profilesRootDir = ProfileUtils.constructProfilesRootDirectory(ImperativeConfig.instance.cliHome);
        const obsoletePlugins = this.getObsoletePlugins();
        const oldProfileCount = this.getOldProfileCount(profilesRootDir);

        if (obsoletePlugins.length == 0 && oldProfileCount === 0) {
            params.response.console.log("No old profiles were found to convert from Zowe v1 to v2.");
            // Exit if we're not deleting
            if (!(params.arguments.delete != null && params.arguments.delete === true &&
                  params.arguments.forSure != null && params.arguments.forSure === true)) {
                return;
            }
        }

        const listToConvert = [];
        if (obsoletePlugins.length > 0) {
            listToConvert.push(`${obsoletePlugins.length} obsolete plug-in(s)`);
        }
        if (oldProfileCount > 0) {
            listToConvert.push(`${oldProfileCount} old profile(s)`);
        }
        params.response.console.log(`Detected ${listToConvert.join(" and ")} to convert from Zowe v1 to v2.\n`);

        if (!params.arguments.force) {
            const answer = await params.response.console.prompt("Are you sure you want to continue? [y/N]: ");
            if (answer == null || !(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")) {
                return;
            }
        }

        params.response.console.log("");
        for (const pluginInfo of obsoletePlugins) {
            if (pluginInfo.preUninstall) await pluginInfo.preUninstall();
            try {
                this.uninstallPlugin(pluginInfo.name);
                params.response.console.log(`Removed obsolete plug-in: ${pluginInfo.name}`);
            } catch (error) {
                params.response.console.error(`Failed to uninstall plug-in "${pluginInfo.name}":\n    ${error}`);
            }
            if (pluginInfo.postUninstall) await pluginInfo.postUninstall();
        }

        if (oldProfileCount == 0) return;
        await OverridesLoader.ensureCredentialManagerLoaded();

        const convertResult = await ConfigBuilder.convert(profilesRootDir);
        for (const [k, v] of Object.entries(convertResult.profilesConverted)) {
            params.response.console.log(`Converted ${k} profiles: ${v.join(", ")}`);
        }
        if (convertResult.profilesFailed.length > 0) {
            params.response.console.log("");
            params.response.console.errorHeader(`Failed to convert ${convertResult.profilesFailed.length} profile(s). See details below`);
            for (const { name, type, error } of convertResult.profilesFailed) {
                if (name != null) {
                    params.response.console.error(`Failed to load ${type} profile "${name}":\n    ${error}`);
                } else {
                    params.response.console.error(`Failed to find default ${type} profile:\n    ${error}`);
                }
            }
        }

        params.response.console.log("");
        const teamConfig = ImperativeConfig.instance.config;
        teamConfig.api.layers.activate(false, true);
        teamConfig.api.layers.merge(convertResult.config);
        ConfigSchema.updateSchema();
        await teamConfig.save(false);

        const oldProfilesDir = `${profilesRootDir.replace(/[\\/]$/, "")}-old`;
        try {
            fs.renameSync(profilesRootDir, oldProfilesDir);
        } catch (error) {
            params.response.console.error(`Failed to rename profiles directory to ${oldProfilesDir}:\n    ${error}`);
        }

        const cliBin = ImperativeConfig.instance.rootCommandName;
        params.response.console.log(`Your new profiles have been saved to ${teamConfig.layerActive().path}.\n` +
            `Run "${cliBin} config edit --global-config" to open this file in your default editor.\n\n`);

        if (params.arguments.delete == null || params.arguments.delete === false ||
            params.arguments.forSure == null || params.arguments.forSure === false) {
            params.response.console.log(`Your old profiles have been moved to ${oldProfilesDir}.\n` +
                `Run "${cliBin} config convert-profiles --delete" if you want to completely remove them.`);
        } else {
            // Delete the profiles directory
            try {
                rimraf.sync(oldProfilesDir);
                params.response.console.log(`Deleting the profiles directory '${oldProfilesDir}'... done`);
            } catch (err) {
                params.response.console.error(`Failed to delete the profiles directory '${oldProfilesDir}':\n    ${err}`);
            }

            // Delete the securely stored credentials
            const keytarAvailable = await this.checkKeytarAvailable();
            if (keytarAvailable) {
                const knownServices = ["@brightside/core", "@zowe/cli", "Zowe-Plugin", "Broadcom-Plugin", "Zowe"];
                for (const service of knownServices) {
                    const accounts = await this.findOldSecureProps(service, params);
                    for (const account of accounts) {
                        if (!account.includes("secure_config_props")) {
                            const success = this.deleteOldSecureProps(service, account, params);
                            params.response.console.log(`Deleting secure value for "${service}/${account}"... ${success ? "done" : "failed"}`);
                        }
                    }
                }
            } else {
                params.response.console.error(`Keytar or the credential vault are unavailable. Unable to delete old secure values.`);
            }
        }
    }

    /**
     * Retrieve list of obsolete CLI plug-ins that should be uninstalled.
     * @returns List of plugins to uninstall containing the following properties:
     *  - `name` - Name of plugin to uninstall
     *  - `preuninstall` - Optional callback to be run before uninstall
     *  - `postuninstall` - Optional callback to be run after uninstall
     */
    private getObsoletePlugins(): IPluginToUninstall[] {
        const obsoletePlugins: IPluginToUninstall[] = [];

        if (ImperativeConfig.instance.hostPackageName === this.ZOWE_CLI_PACKAGE_NAME) {
            let credMgrSetting = AppSettings.instance.get("overrides", "CredentialManager");
            if (credMgrSetting === ImperativeConfig.instance.hostPackageName) {
                credMgrSetting = undefined;
            }
            obsoletePlugins.push({
                name: typeof credMgrSetting === "string" ? credMgrSetting : this.ZOWE_CLI_SECURE_PLUGIN_NAME,
                preUninstall: credMgrSetting ? this.disableCredentialManager : undefined
            });
        }

        return obsoletePlugins;
    }

    /**
     * Get the number of old profiles present in the CLI home dir.
     * @param profilesRootDir Root profiles directory
     * @returns Number of old profiles found
     */
    private getOldProfileCount(profilesRootDir: string): number {
        const profileTypes = ProfileIO.getAllProfileDirectories(profilesRootDir);
        let oldProfileCount = 0;
        for (const profileType of profileTypes) {
            const profileTypeDir = path.join(profilesRootDir, profileType);
            const profileNames = ProfileIO.getAllProfileNames(profileTypeDir, ".yaml", `${profileType}_meta`);
            oldProfileCount += profileNames.length;
        }
        return oldProfileCount;
    }

    /**
     * Disable the CredentialManager override in app settings. This is called
     * before uninstalling `ZOWE_CLI_SECURE_PLUGIN_NAME`.
     * This method is private because only the convert-profiles command is able
     * to disable the credential manager and reload it. For all other commands,
     * the credential manager is loaded in `Imperative.init` and frozen with
     * `Object.freeze` so cannot be modified later on.
     */
    private disableCredentialManager() {
        AppSettings.instance.set("overrides", "CredentialManager", ImperativeConfig.instance.hostPackageName);
        if (ImperativeConfig.instance.loadedConfig.overrides.CredentialManager != null) {
            delete ImperativeConfig.instance.loadedConfig.overrides.CredentialManager;
        }
    }

    /**
     * Uninstall a CLI plug-in if it is installed, otherwise do nothing. This
     * overrides the default behavior of the plugin uninstall helper method
     * which throws an error if the plugin is not installed.
     * @param pluginName Name of plug-in to uninstall
     */
    private uninstallPlugin(pluginName: string): void {
        if (Object.keys(PluginIssues.instance.getInstalledPlugins()).includes(pluginName)) {
            uninstallPlugin(pluginName);
        }
    }

    private async checkKeytarAvailable(): Promise<boolean> {
        let success: boolean = undefined;
        try {
            await keytar.findCredentials(this.ZOWE_CLI_PACKAGE_NAME);
            success = true;
        } catch (err) {
            success = false;
        }
        return success;
    }

    private async findOldSecureProps(acct: string, params: IHandlerParameters): Promise<string[]> {
        const oldSecurePropNames: string[] = [];
        try {
            const credentialsArray = await keytar.findCredentials(acct);
            for (const element of credentialsArray) {
                oldSecurePropNames.push(element.account);
            }
        } catch (err) {
            params.response.console.error(`Encountered an error while gathering profiles for service '${acct}':\n    ${err}`);
        }
        return oldSecurePropNames;
    }

    private async deleteOldSecureProps(acct: string, propName: string, params: IHandlerParameters): Promise<boolean> {
        let success = false;
        try {
            success = await keytar.deletePassword(acct, propName);
        } catch (err) {
            params.response.console.error(`Encountered an error while deleting secure data for service '${acct}/${propName}':\n    ${err}`);
            success = false;
        }
        return success;
    }
}
