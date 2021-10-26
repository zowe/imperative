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

import * as lodash from "lodash";
import { ICommandArguments, IHandlerParameters } from "../../cmd";
import { ICommandHandlerRequire } from "../../cmd/src/doc/handler/ICommandHandlerRequire";
import { ICommandProfileAuthConfig } from "../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";
import { IConfigLoadedProfile } from "./doc/IConfigLoadedProfile";
import * as ConfigUtils from "./ConfigUtils";
import { AbstractAuthHandler } from "../../imperative/src/auth/handlers/AbstractAuthHandler";
import { ImperativeConfig } from "../../utilities";
import { ISession } from "../../rest/src/session/doc/ISession";
import { Session } from "../../rest/src/session/Session";
import { AUTH_TYPE_TOKEN } from "../../rest/src/session/SessConstants";
import { Logger } from "../../logger";

export class ConfigAutoStore {
    public static findAuthHandlerForProfile(profilePath: string, cmdArguments: ICommandArguments): AbstractAuthHandler | undefined {
        const config = ImperativeConfig.instance.config;
        const profileType = lodash.get(config.properties, `${profilePath}.type`);
        const profile = config.api.profiles.get(profilePath.replace(/profiles\./g, ""));

        if (profile == null || profileType == null) {  // Profile must exist and have type defined
            return;
        } else if (profileType === "base") {
            if (profile.tokenType == null) {  // Base profile must have tokenType defined
                return;
            }
        } else {
            if (profile.basePath == null) {  // Service profiles must have basePath defined
                return;
            } else if (profile.tokenType == null) {  // If tokenType undefined in service profile, fall back to base profile
                const baseProfileName = ConfigUtils.getActiveProfileName("base", cmdArguments);
                return this.findAuthHandlerForProfile(config.api.profiles.expandPath(baseProfileName), cmdArguments);
            }
        }

        const authConfigs: ICommandProfileAuthConfig[] = [];
        ImperativeConfig.instance.loadedConfig.profiles.forEach((profCfg) => {
            if (profCfg.type === profileType && profCfg.authConfig != null) {
                authConfigs.push(...profCfg.authConfig);
            }
        });

        for (const authConfig of authConfigs) {
            const authHandler: ICommandHandlerRequire = require(authConfig.handler);
            const authHandlerClass = new authHandler.default();

            if (authHandlerClass instanceof AbstractAuthHandler) {
                const promptParams = authHandlerClass.getPromptParams()[0];

                if (profile.tokenType === promptParams.defaultTokenType) {
                    return authHandlerClass;  // Auth service must have matching token type
                }
            }
        }
    }

    /**
     * Finds the highest priority layer where a profile is stored.
     *
     * @param loadedProfile
     *
     * @returns User and global properties
     */
    public static getPriorityLayer(loadedProfile: IConfigLoadedProfile): { user: boolean, global: boolean } {
        return {
            user: Object.values(loadedProfile.properties).every(v => v.user),
            global: Object.values(loadedProfile.properties).some(v => v.global)
        };
    }

    public static async storeSessCfgProps(params: IHandlerParameters, sessCfg: { [key: string]: any }, propsToStore: string[]): Promise<void> {
        const config = ImperativeConfig.instance.config;
        // TODO Figure out how autoStore should work when value conflicts between layers
        if (propsToStore.length == 0 || !config?.exists || !config.properties.autoStore) {
            return;
        }

        let profileProps = propsToStore.map(propName => propName === "hostname" ? "host" : propName);
        const profileData = this.findActiveProfile(params, profileProps);
        if (profileData == null) {
            return;
        }
        const [profileType, profileName] = profileData;
        const profilePath = config.api.profiles.expandPath(profileName);

        // Replace user and password with tokenValue if tokenType is defined in config
        if (profileProps.includes("user") && profileProps.includes("password") &&
            await this.fetchTokenForSessCfg(params, sessCfg, profilePath)) {
            profileProps = profileProps.filter(propName => propName !== "user" && propName !== "password");
            profileProps.push("tokenValue");
        }

        const beforeLayer = config.api.layers.get();
        const loadedProfile = config.api.profiles.load(profileName);
        // TODO What if loadedProfile is null - should be impossible to get to this point?
        const { user, global } = this.getPriorityLayer(loadedProfile);
        config.api.layers.activate(user, global);

        const baseProfileName = ConfigUtils.getActiveProfileName("base", params.arguments);
        const baseProfileObj = lodash.get(config.properties, config.api.profiles.expandPath(baseProfileName));
        // TODO What if base profile is undefined - should be impossible?
        const baseProfileSchema = ImperativeConfig.instance.loadedConfig.baseProfile.schema;
        const profileSchema = ImperativeConfig.instance.loadedConfig.profiles.find(p => p.type === profileType).schema;

        for (const propName of profileProps) {
            let propProfilePath = profilePath;
            // Determine if property should be stored in base profile instead
            if (loadedProfile.properties[propName] == null && !loadedProfile.secure?.includes(propName) &&
                (baseProfileObj.properties[propName] != null || baseProfileObj.secure?.includes(propName) ||
                (propName === "tokenValue" && baseProfileObj.properties.tokenType != null))) {
                propProfilePath = config.api.profiles.expandPath(baseProfileName);
            }
            const sessCfgPropName = propName === "host" ? "hostname" : propName;
            const propDefinition = profileSchema.properties[propName] || baseProfileSchema.properties[propName];
            config.set(`${propProfilePath}.properties.${propName}`, sessCfg[sessCfgPropName], {
                secure: propDefinition.secure
            });
        }

        await config.save(false);
        params.response.console.log(`Stored properties in ${config.layerActive().path}: ${profileProps.join(", ")}`);
        // Restore original active layer
        config.api.layers.activate(beforeLayer.user, beforeLayer.global);
    }

    private static findActiveProfile(params: IHandlerParameters, profileProps: string[]): [string, string] | undefined {
        const profileTypes = [
            ...(params.definition.profile?.required || []),
            ...(params.definition.profile?.optional || [])
        ];

        for (const profType of profileTypes) {
            const profileMatch = ImperativeConfig.instance.loadedConfig.profiles.find(p => p.type === profType);
            if (profileMatch != null && profileProps.every(propName => propName in profileMatch.schema.properties)) {
                return [profType, ConfigUtils.getActiveProfileName(profType, params.arguments)];
            }
        }
    }

    private static async fetchTokenForSessCfg(params: IHandlerParameters, sessCfg: { [key: string]: any }, profilePath: string): Promise<boolean> {
        const authHandlerClass = this.findAuthHandlerForProfile(profilePath, params.arguments);

        if (authHandlerClass == null) {
            return false;
        }

        const [promptParams, loginHandler] = authHandlerClass.getPromptParams();
        sessCfg.type = AUTH_TYPE_TOKEN;
        sessCfg.tokenType = promptParams.defaultTokenType;
        const baseSessCfg: ISession = { type: sessCfg.type };

        for (const propName of Object.keys(ImperativeConfig.instance.loadedConfig.baseProfile.schema.properties)) {
            const sessCfgPropName = propName === "host" ? "hostname" : propName;
            if (sessCfg[sessCfgPropName] != null) {
                (baseSessCfg as any)[sessCfgPropName] = sessCfg[sessCfgPropName];
            }
        }

        Logger.getAppLogger().info(`Fetching ${sessCfg.tokenType} for ${profilePath}`);
        sessCfg.tokenValue = await loginHandler(new Session(baseSessCfg));
        return true;
    }
}
