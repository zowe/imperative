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
import * as ConfigUtils from "./ConfigUtils";
import { AbstractAuthHandler } from "../../imperative/src/auth/handlers/AbstractAuthHandler";
import { ImperativeConfig } from "../../utilities";
import { ISession } from "../../rest/src/session/doc/ISession";
import { Session } from "../../rest/src/session/Session";
import { AUTH_TYPE_TOKEN } from "../../rest/src/session/SessConstants";
import { Logger } from "../../logger";

/**
 * Class to manage automatic storage of properties in team config.
 */
export class ConfigAutoStore {
    /**
     * Finds the profile where auto-store properties should be saved.
     * @param params CLI handler parameters object
     * @param profileProps List of properties required in the profile schema
     * @returns Tuple containing profile type and name, or undefined if no
     *          profile was found
     */
    public static findActiveProfile(params: IHandlerParameters, profileProps: string[]): [string, string] | undefined {
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

    /**
     * Finds the token auth handler class for a team config profile.
     * @param profilePath JSON path of profile
     * @param cmdArguments CLI arguments which may specify a profile
     * @returns Auth handler class or undefined if none was found
     */
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
            if ((profCfg.type === profileType || profCfg.type === "base") && profCfg.authConfig != null) {
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
     * Stores session config properties into a team config profile.
     * @param params CLI handler parameters object
     * @param sessCfg Session config containing properties to store
     * @param propsToStore Names of properties that should be stored
     */
    public static async storeSessCfgProps(params: IHandlerParameters, sessCfg: { [key: string]: any }, propsToStore: string[]): Promise<void> {
        const config = ImperativeConfig.instance.config;
        // TODO Which autoStore value should take priority if it conflicts between layers
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
        if (config.api.profiles.exists(profileName)) {
            const { user, global } = config.api.layers.find(profileName);
            config.api.layers.activate(user, global);
        }

        const profileObj = config.api.profiles.get(profileName);
        const profileSchema = ImperativeConfig.instance.loadedConfig.profiles.find(p => p.type === profileType).schema;
        const profileSecureProps = config.api.secure.securePropsForProfile(profileName);

        const baseProfileName = ConfigUtils.getActiveProfileName("base", params.arguments);
        const baseProfileObj = config.api.profiles.get(baseProfileName);
        const baseProfileSchema = ImperativeConfig.instance.loadedConfig.baseProfile.schema;
        const baseProfileSecureProps = config.api.secure.securePropsForProfile(baseProfileName);

        for (const propName of profileProps) {
            let propProfilePath = profilePath;
            let isSecureProp = profileSchema.properties[propName].secure || profileSecureProps.includes(propName);
            /* If any of the following is true, then property should be stored in base profile:
                (1) Service profile does not exist, but base profile does
                (2) Property is missing from service profile properties/secure objects, but present in base profile
                (3) Property is tokenValue and tokenType is missing from service profile, but present in base profile
            */
            if ((!config.api.profiles.exists(profileName) && config.api.profiles.exists(baseProfileName)) ||
                (profileObj[propName] == null && !profileSecureProps.includes(propName) &&
                (baseProfileObj[propName] != null || baseProfileSecureProps.includes(propName))) ||
                (propName === "tokenValue" && profileObj.tokenType == null && baseProfileObj.tokenType != null)
            ) {
                propProfilePath = config.api.profiles.expandPath(baseProfileName);
                isSecureProp = baseProfileSchema.properties[propName].secure || baseProfileSecureProps.includes(propName);
            }

            // If secure array at higher level includes this property, then property should be stored at higher level
            if (isSecureProp) {
                const secureProfilePath = config.api.secure.secureInfoForProp(`${propProfilePath}.properties.${propName}`, true).path;
                if (secureProfilePath.split(".").length < propProfilePath.split(".").length) {
                    propProfilePath = secureProfilePath.slice(0, secureProfilePath.lastIndexOf("."));
                }
            }

            const sessCfgPropName = propName === "host" ? "hostname" : propName;
            config.set(`${propProfilePath}.properties.${propName}`, sessCfg[sessCfgPropName], {
                secure: isSecureProp
            });
        }

        await config.save();
        params.response.console.log(`Stored properties in ${config.layerActive().path}: ${profileProps.join(", ")}`);
        // Restore original active layer
        config.api.layers.activate(beforeLayer.user, beforeLayer.global);
    }

    /**
     * Retrieves token value that will be auto-stored into session config.
     * @param params CLI handler parameters object
     * @param sessCfg Session config with credentials for basic or cert auth
     * @param profilePath JSON path of profile containing tokenType
     * @returns True if auth handler was found and token was fetched
     */
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
