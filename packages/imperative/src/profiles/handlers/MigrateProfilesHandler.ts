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
import { spawn } from "child_process";
import { ICommandHandler, IHandlerParameters } from "../../../../cmd";
import { Config, ConfigSchema, IConfig } from "../../../../config";
import { ProfileIO, ProfilesConstants, ProfileUtils } from "../../../../profiles";
import { ImperativeConfig } from "../../../../utilities";
import { CredentialManagerFactory } from "../../../../security";
import { AppSettings } from "../../../../settings";
import { PluginIssues } from "../../plugins/utilities/PluginIssues";
import { uninstall as uninstallPlugin } from "../../plugins/utilities/npm-interface";
import { OverridesLoader } from "../../OverridesLoader";

/**
 * Handler for the auto-generated migrate profiles command.
 */
export default class MigrateProfilesHandler implements ICommandHandler {
    private commandParameters: IHandlerParameters;

    /**
     * The process command handler for the "profiles migrate" command.
     * @return {Promise<ICommandResponse>}: The promise to fulfill when complete.
     */
    public async process(params: IHandlerParameters): Promise<void> {
        this.commandParameters = params;
        const profilesRootDir = ProfileUtils.constructProfilesRootDirectory(ImperativeConfig.instance.cliHome);
        const listOfProfileTypes = ProfileIO.getAllProfileDirectories(profilesRootDir);
        const oldProfiles: { name: string; type: string }[] = [];
        for (const profileType of listOfProfileTypes) {
            const profileTypeDir = path.join(profilesRootDir, profileType);
            const profileNames = ProfileIO.getAllProfileNames(profileTypeDir, ".yaml", `${profileType}_meta`);
            profileNames.forEach(name => oldProfiles.push({ name, type: profileType }));
        }

        if (oldProfiles.length === 0) {
            params.response.console.log("No old profiles were found to migrate from Zowe v1 to v2.");
            return;
        }

        params.response.console.log(`Detected ${oldProfiles.length} profile(s) to be migrated from Zowe v1 to v2.\n`);
        const answer = await params.response.console.prompt("Are you sure you want to continue? [y/N]: ");
        if (answer == null || !(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")) {
            return;
        }

        params.response.console.log("");
        // await this.ensureCredentialManagerLoaded();
        const newConfig = await this.generateTeamConfig(profilesRootDir, listOfProfileTypes, oldProfiles);
        const credMgrName = this.disableCredentialManager();
        this.uninstallCredentialManager(credMgrName);
        params.response.console.log("");

        const teamConfig = ImperativeConfig.instance.config;
        teamConfig.api.layers.activate(false, true);
        teamConfig.api.layers.merge(newConfig);
        teamConfig.setSchema(ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles));
        teamConfig.save(false);
        // params.response.console.log(JSON.stringify(newConfig, null, 2));

        const oldProfilesDir = `${profilesRootDir.replace(/[\\\/]$/, "")}-old`;
        fs.renameSync(profilesRootDir, oldProfilesDir);

        const cliBin = ImperativeConfig.instance.rootCommandName;
        // TODO Implement config edit command
        params.response.console.log(`Your profiles have been saved to ${teamConfig.layerActive().path}.\n` +
            `Run "${cliBin} config edit --global-config" to open this file in your default editor.\n\n` +
            `The old profiles have been moved to ${oldProfilesDir}.\n` +
            `Run "${cliBin} config migrate --delete" if you want to completely remove them.`);
    }

    private disableCredentialManager(): string {
        const credMgrSetting = AppSettings.instance.get("overrides", "CredentialManager");
        if (credMgrSetting) {
            this.commandParameters.response.console.log(`Disabling credential manager: ${credMgrSetting}`);
            AppSettings.instance.set("overrides", "CredentialManager", false);
        }
        // TODO Fix hardcoded plugin name which doesn't belong in Imperative
        return (typeof credMgrSetting === "string") ? credMgrSetting : "@zowe/secure-credential-store-for-zowe-cli";
    }

    private uninstallCredentialManager(credMgrName: string): void {
        if (Object.keys(PluginIssues.instance.getInstalledPlugins()).includes(credMgrName)) {
            this.commandParameters.response.console.log(`Uninstalling credential manager: ${credMgrName}`);
            // TODO Handle plug-in uninstall failure
            // TODO Add timeout and retry a 2nd time because Windows hangs
            // uninstallPlugin(credMgrName);
            spawn(ImperativeConfig.instance.rootCommandName, ["plugins", "uninstall", credMgrName], { detached: true }).unref();
        }
    }

    /**
     * If CredentialManager was not already loaded by Imperative.init, load it
     * now before performing config operations in the migrate handler.
     */
    private async ensureCredentialManagerLoaded() {
        if (!CredentialManagerFactory.initialized) {
            const packageJson = {
                ...ImperativeConfig.instance.callerPackageJson,
                dependencies: {
                    ...ImperativeConfig.instance.callerPackageJson.dependencies,
                    "keytar": "*"
                }
            };
            await OverridesLoader.loadCredentialManager(ImperativeConfig.instance.loadedConfig, packageJson);
        }
    }

    private async generateTeamConfig(profilesRootDir: string, listOfProfileTypes: string[],
                                     oldProfiles: { name: string, type: string }[]): Promise<IConfig> {
        const newConfig = Config.empty();

        for (const profileType of listOfProfileTypes) {
            // TODO Thoroughly handle error cases for invalid folders/profile YAMLs/meta YAMLs
            const oldProfilesByType = oldProfiles.filter(({ type }) => type === profileType);
            if (oldProfilesByType.length === 0) {
                continue;
            }
            this.commandParameters.response.console.log(`Migrating ${profileType} profiles: ${oldProfilesByType.map(p => p.name).join(", ")}`);

            const profileTypeDir = path.join(profilesRootDir, profileType);
            for (const { name } of oldProfilesByType) {
                const profileProps = ProfileIO.readProfileFile(path.join(profileTypeDir, `${name}.yaml`), profileType);
                const secureProps = [];

                for (const [key, value] of Object.entries(profileProps)) {
                    if (value.toString().startsWith(ProfilesConstants.PROFILES_OPTION_SECURELY_STORED)) {
                        // TODO Is it safe to assume credential manager is loaded?
                        const secureValue = await CredentialManagerFactory.manager.load(
                            ProfileUtils.getProfilePropertyKey(profileType, name, key), true);
                        if (secureValue != null) {
                            profileProps[key] = JSON.parse(secureValue);
                            secureProps.push(key);
                        } else {
                            delete profileProps[key];
                        }
                    }
                }

                newConfig.profiles[ProfileUtils.getProfileMapKey(profileType, name)] = {
                    type: profileType,
                    properties: profileProps,
                    secure: secureProps
                };
            }

            const profileMetaFile = ProfileIO.readMetaFile(path.join(profileTypeDir, `${profileType}_meta.yaml`));
            if (profileMetaFile.defaultProfile != null) {
                newConfig.defaults[profileType] = ProfileUtils.getProfileMapKey(profileType, profileMetaFile.defaultProfile);
            }
        }

        return newConfig;
    }
}
