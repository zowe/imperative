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
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ConfigBuilder, ConfigSchema } from "../../../../../config";
import { ProfileIO, ProfileUtils } from "../../../../../profiles";
import { ImperativeConfig } from "../../../../../utilities";
import { AppSettings } from "../../../../../settings";
import { PluginIssues } from "../../../plugins/utilities/PluginIssues";
import { uninstall as uninstallPlugin } from "../../../plugins/utilities/npm-interface";
import { OverridesLoader } from "../../../OverridesLoader";

/**
 * Handler for the convert profiles command.
 */
export default class ConvertProfilesHandler implements ICommandHandler {
    private commandParameters: IHandlerParameters;

    /**
     * The process command handler for the "config convert-profiles" command.
     * @return {Promise<ICommandResponse>}: The promise to fulfill when complete.
     */
    public async process(params: IHandlerParameters): Promise<void> {
        this.commandParameters = params;
        const profilesRootDir = ProfileUtils.constructProfilesRootDirectory(ImperativeConfig.instance.cliHome);
        const oldProfileCount = this.getOldProfileCount(profilesRootDir);

        if (oldProfileCount === 0) {
            params.response.console.log("No old profiles were found to convert from Zowe v1 to v2.");
            return;
        }

        params.response.console.log(`Detected ${oldProfileCount} profile(s) to be converted from Zowe v1 to v2.\n`);
        // TODO Add no-prompt flag
        const answer = await params.response.console.prompt("Are you sure you want to continue? [y/N]: ");
        if (answer == null || !(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")) {
            return;
        }

        params.response.console.log("");
        const credMgrName = this.disableCredentialManager();
        this.uninstallCredentialManager(credMgrName);
        await OverridesLoader.ensureCredentialManagerLoaded();
        const convertResult = await ConfigBuilder.convert(profilesRootDir);
        for (const [k, v] of Object.entries(convertResult.profilesConverted)) {
            params.response.console.log(`Converted ${k} profiles: ${v.join(", ")}`);
        }

        if (convertResult.profilesFailed.length > 0) {
            params.response.console.log("");
            const numProfilesFailed = convertResult.profilesFailed.filter(pf => pf.name != null).length;
            // TODO What if number is 0 because only failure is related to meta files
            params.response.console.errorHeader(`Failed to convert ${numProfilesFailed} profile(s). See details below`);
        }
        for (const { name, type, error } of convertResult.profilesFailed) {
            if (name != null) {
                params.response.console.error(`Failed to load ${type} profile "${name}":\n    ${error}`);
            } else {
                params.response.console.error(`Failed to find default ${type} profile:\n    ${error}`);
            }
        }

        params.response.console.log("");
        const teamConfig = ImperativeConfig.instance.config;
        teamConfig.api.layers.activate(false, true);
        teamConfig.api.layers.merge(convertResult.config);
        ConfigSchema.updateSchema();
        await teamConfig.save(false);

        const oldProfilesDir = `${profilesRootDir.replace(/[\\/]$/, "")}-old`;
        // TODO What if renaming directory fails? Lack of permissions, file inside is locked, etc?
        fs.renameSync(profilesRootDir, oldProfilesDir);

        const cliBin = ImperativeConfig.instance.rootCommandName;
        // TODO Implement config edit command
        params.response.console.log(`Your profiles have been saved to ${teamConfig.layerActive().path}.\n` +
            `Run "${cliBin} config edit --global-config" to open this file in your default editor.\n\n` +
            `The old profiles have been moved to ${oldProfilesDir}.\n` +
            `Run "${cliBin} config convert-profiles --delete" if you want to completely remove them.`);
    }

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

    private disableCredentialManager(): string {
        const credMgrSetting = AppSettings.instance.get("overrides", "CredentialManager");
        if (credMgrSetting && credMgrSetting !== ImperativeConfig.instance.hostPackageName) {
            AppSettings.instance.set("overrides", "CredentialManager", ImperativeConfig.instance.hostPackageName);
            if (ImperativeConfig.instance.loadedConfig.overrides.CredentialManager != null) {
                delete ImperativeConfig.instance.loadedConfig.overrides.CredentialManager;
            }
            this.commandParameters.response.console.log(`Disabled credential manager: ${credMgrSetting}`);
        }
        // TODO Fix hardcoded plugin name which doesn't belong in Imperative
        return (typeof credMgrSetting === "string") ? credMgrSetting : "@zowe/secure-credential-store-for-zowe-cli";
    }

    private uninstallCredentialManager(credMgrName: string): void {
        if (Object.keys(PluginIssues.instance.getInstalledPlugins()).includes(credMgrName)) {
            try {
                uninstallPlugin(credMgrName);
                this.commandParameters.response.console.log(`Uninstalled credential manager: ${credMgrName}`);
            } catch (error) {
                this.commandParameters.response.console.error(`Failed to uninstall credential manager: ${error}`);
            }
        }
    }
}
