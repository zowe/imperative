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
import { ICommandArguments, IHandlerParameters } from "../../../cmd";
import { ICommandHandlerRequire } from "../../../cmd/src/doc/handler/ICommandHandlerRequire";
import { ICommandProfileAuthConfig } from "../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";
import { IConfigLoadedProfile } from "../../../config/src/doc/IConfigLoadedProfile";
import * as ConfigUtils from "../../../config/src/ConfigUtils";
import { AbstractAuthHandler } from "../../../imperative/src/auth/handlers/AbstractAuthHandler";
import { IProfileProperty, IProfileTypeConfiguration } from "../../../profiles";
import { ImperativeConfig } from "../../../utilities";
import { ISession } from "./doc/ISession";
import { Session } from "./Session";
import { AUTH_TYPE_TOKEN } from "./SessConstants";

interface IActiveProfileData {
    cmdArguments: ICommandArguments;
    profileType: string;
    profileName: string;
    profileConfig: IProfileTypeConfiguration;
    loadedProfile?: IConfigLoadedProfile;
}

export class ConnectionPropsForProfile {
    private mActiveProfile: IActiveProfileData;
    private mProfileProps: string[];

    constructor(params: IHandlerParameters | undefined, promptProps: string[]) {
        this.mProfileProps = promptProps.map(propName => propName === "hostname" ? "host" : propName);

        if (params != null) {
            this.mActiveProfile = this.findActiveProfile(params);
        }
    }

    public async autoStoreSessCfgProps(sessCfg: { [key: string]: any }): Promise<void> {
        const config = ImperativeConfig.instance.config;
        // TODO Figure out how autoStore should work when value conflicts between layers
        if (this.mActiveProfile == null || this.mProfileProps.length == 0 || !config.exists || !config.layerActive().properties.autoStore) {
            return;
        }

        // TODO Should we only fetch token if user/password were prompted for
        const profilePath = config.api.profiles.expandPath(this.mActiveProfile.profileName);
        const authHandlerClass = ConnectionPropsForProfile.findAuthHandlerForProfile(profilePath, this.mActiveProfile.cmdArguments);
        if (authHandlerClass != null) {
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
            sessCfg.tokenValue = await loginHandler(new Session(baseSessCfg));
            this.mProfileProps = this.mProfileProps.filter(propName => propName !== "user" && propName !== "password");
            this.mProfileProps.push("tokenValue");
        }

        const beforeLayer = config.api.layers.get();
        // TODO What if loadedProfile is null - should be impossible to get to this point?
        const { user, global } = config.api.profiles.getPriorityLayer(this.mActiveProfile.loadedProfile);
        config.api.layers.activate(user, global);

        for (const propName of this.mProfileProps) {
            const sessCfgPropName = propName === "host" ? "hostname" : propName;
            const profileProp: IProfileProperty = this.mActiveProfile.profileConfig.schema.properties[propName] ||
                ImperativeConfig.instance.loadedConfig.baseProfile.schema.properties[propName];
            config.set(`${profilePath}.properties.${propName}`, sessCfg[sessCfgPropName], {
                secure: profileProp.secure
            });
        }

        // TODO Inform user credentials have been stored (and token fetched) for future use
        await config.save(false);
        // Restore original active layer
        config.api.layers.activate(beforeLayer.user, beforeLayer.global);
    }

    public loadSchemaForSessCfgProps(): { [key: string]: IProfileProperty } {
        if (this.mActiveProfile == null) {
            return {};
        }

        const schemas: { [key: string]: IProfileProperty } = {};
        for (const propName of this.mProfileProps) {
            const sessCfgPropName = propName === "host" ? "hostname" : propName;
            schemas[sessCfgPropName] = this.mActiveProfile.profileConfig.schema.properties[propName];
        }
        return schemas;
    }

    public static findAuthHandlerForProfile(profilePath: string, cmdArguments: ICommandArguments): AbstractAuthHandler | undefined {
        const config = ImperativeConfig.instance.config;
        const profileType = lodash.get(config.properties, `${profilePath}.type`);
        const profile = config.api.profiles.get(profilePath.replace(/profiles\./g, ""));

        if (profileType == null) {
            return;
        } else if (profileType === "base") {
            if (profile.tokenType == null) {
                return;
            }
        } else {
            if (profile.basePath == null) {
                return;
            } else if (profile.tokenType == null) {
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

    private findActiveProfile(params: IHandlerParameters): IActiveProfileData | undefined {
        const profileTypes = [
            ...(params.definition.profile?.required || []),
            ...(params.definition.profile?.optional || [])
        ];
        let profileConfig: IProfileTypeConfiguration;

        for (const profType of profileTypes) {
            const profileMatch = ImperativeConfig.instance.loadedConfig.profiles.find(p => p.type === profType);
            if (profileMatch != null && this.mProfileProps.every(propName => propName in profileMatch.schema.properties)) {
                profileConfig = profileMatch;
                break;
            }
        }

        if (profileConfig == null) {
            return;
        }

        const profileType = profileConfig.type;
        const profileName = ConfigUtils.getActiveProfileName(profileType, params.arguments);
        const loadedProfile = ImperativeConfig.instance.config.api.profiles.load(profileName);

        return {
            cmdArguments: params.arguments,
            profileType, profileName, profileConfig, loadedProfile
        };
    }
}
