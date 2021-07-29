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
import { ICommandHandler, IHandlerParameters } from "../../../../cmd";
import { Config, ConfigSchema } from "../../../../config";
import { ProfileIO, ProfilesConstants, ProfileUtils } from "../../../../profiles";
import { ImperativeConfig } from "../../../../utilities";
import { CredentialManagerFactory } from "../../../../security";
import { AppSettings } from "../../../../settings";
import { PluginIssues } from "../../plugins/utilities/PluginIssues";
import { uninstall as uninstallPlugin } from "../../plugins/utilities/npm-interface";

/**
 * Handler for the auto-generated migrate profiles command.
 */
export default class MigrateProfilesHandler implements ICommandHandler {
    /**
     * The process command handler for the "profiles migrate" command.
     * @return {Promise<ICommandResponse>}: The promise to fulfill when complete.
     */
    public async process(params: IHandlerParameters): Promise<void> {
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

        const credMgrSetting = ImperativeConfig.instance.loadedConfig.overrides?.CredentialManager;
        if (credMgrSetting != null) {
            params.response.console.log(`Disabling credential manager: ${credMgrSetting}`);
            AppSettings.instance.set("overrides", "CredentialManager", false);
        }

        // TODO Fix hardcoded plugin name which doesn't belong in Imperative
        const oldCredMgr = (typeof credMgrSetting === "string") ? credMgrSetting : "@zowe/secure-credential-store-for-zowe-cli";
        if (Object.keys(PluginIssues.instance.getInstalledPlugins()).includes(oldCredMgr)) {
            params.response.console.log(`Uninstalling credential manager: ${oldCredMgr}`);
            // TODO Figure out how to handle if plug-in uninstall fails
            uninstallPlugin(oldCredMgr);
        }

        const newConfig = Config.empty();
        for (const profileType of listOfProfileTypes) {
            // TODO Thoroughly handle error cases for invalid folders/profile YAMLs/meta YAMLs
            const oldProfilesByType = oldProfiles.filter(({ type }) => type === profileType);
            if (oldProfilesByType.length === 0) {
                continue;
            }
            params.response.console.log(`Migrating ${profileType} profiles: ${oldProfilesByType.map(p => p.name).join(", ")}`);

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
                            profileProps[key] = secureValue;
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
        params.response.console.log("");

        ImperativeConfig.instance.config.api.layers.activate(false, true);
        ImperativeConfig.instance.config.api.layers.set(newConfig);
        ImperativeConfig.instance.config.setSchema(ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles));
        ImperativeConfig.instance.config.save(false);
        // params.response.console.log(JSON.stringify(newConfig, null, 2));

        const oldProfilesDir = `${profilesRootDir.replace(/[\\\/]$/, "")}-old`;
        fs.renameSync(profilesRootDir, oldProfilesDir);

        const cliBin = ImperativeConfig.instance.rootCommandName;
        // TODO Implement config edit command
        params.response.console.log(`Your profiles have been saved to ${ImperativeConfig.instance.config.layerActive().path}.\n` +
            `Run "${cliBin} config edit --global-config" to open this file in your default editor.\n\n` +
            `The old profiles have been moved to ${oldProfilesDir}.\n` +
            `Run "${cliBin} config migrate --delete" if you want to completely remove them.`);
    }
}
