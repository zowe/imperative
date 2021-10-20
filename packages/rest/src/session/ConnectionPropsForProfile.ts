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

import { ImperativeConfig, IProfileProperty, IProfileTypeConfiguration } from "../../..";
import { IHandlerParameters } from "../../../cmd";
import { IConfigLoadedProfile } from "../../../config";

interface IActiveProfileData {
    profileType: string;
    profileName: string;
    profileConfig: IProfileTypeConfiguration;
    loadedProfile?: IConfigLoadedProfile;
    user: boolean;
    global: boolean;
}

export class ConnectionPropsForProfile {
    private mActiveProfile: IActiveProfileData;
    private mProfileProps: string[];

    constructor(params: IHandlerParameters, promptProps: string[]) {
        this.mProfileProps = promptProps.map(propName => propName === "hostname" ? "host" : propName);

        if (params != null) {
            this.mActiveProfile = this.findActiveProfile(params);
        }
    }

    public async autoStoreSessCfgProps(sessCfgProps: { [key: string]: any }): Promise<void> {
        const config = ImperativeConfig.instance.config;
        // TODO Figure out how autoStore should work when value conflicts between layers
        if (this.mActiveProfile == null || !config.exists || !config.properties.autoStore) {
            return;
        }

        const beforeLayer = config.api.layers.get();
        config.api.layers.activate(this.mActiveProfile.user, this.mActiveProfile.global);

        for (const [k, v] of Object.entries(sessCfgProps)) {
            const profileName = config.api.profiles.expandPath(this.mActiveProfile.profileName);
            const propName = k === "hostname" ? "host" : k;
            config.set(`${profileName}.properties.${propName}`, v, {
                secure: this.mActiveProfile.profileConfig.schema.properties[k].secure
            });
        }

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
            schemas[propName === "host" ? "hostname" : propName] = this.mActiveProfile.profileConfig.schema.properties[propName];
        }
        return schemas;
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

        // Look for profile name first in command line arguments, second in
        // default profiles defined in config, and finally fall back to using
        // the profile type as the profile name.
        const profileType = profileConfig.type;
        const profileName: string = params.arguments[`${profileType}-profile`] ||
            ImperativeConfig.instance.config.properties.defaults[profileType] || profileType;
        const loadedProfile = ImperativeConfig.instance.config.api.profiles.load(profileName);

        return {
            profileType, profileName, profileConfig, loadedProfile,
            user: (loadedProfile != null) ? Object.values(loadedProfile.properties).every(v => v.user) : false,
            global: (loadedProfile != null) ? Object.values(loadedProfile.properties).some(v => v.global) : false
        };
    }
}
