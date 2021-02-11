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
import { IImperativeConfig } from "../../imperative";
import { Config } from "./Config";
import { IConfig } from "./doc/IConfig";
import { IConfigBuilderOpts } from "./doc/IConfigBuilderOpts";
import { IConfigProfile } from "./doc/IConfigProfile";

export class ConfigBuilder {
    private static readonly DEFAULT_ROOT_PROFILE_NAME = "my_profiles";

    /**
     * Build a new Config object from an Imperative CLI app configuration.
     * @param impConfig The Imperative CLI app configuration.
     * @param opts Options to control aspects of the builder.
     */
    public static async build(impConfig: IImperativeConfig, opts?: IConfigBuilderOpts): Promise<IConfig> {
        opts = opts || {};
        const config: IConfig = Config.empty();

        const baseProfileType: string = impConfig.baseProfile?.type;
        const rootProfileName: string = impConfig.templateProfileName || ConfigBuilder.DEFAULT_ROOT_PROFILE_NAME;

        for (const profile of impConfig.profiles) {
            let profileShortPath = `my_${profile.type}`;
            let profileLongPath = `profiles.${profileShortPath}`;
            if (baseProfileType && profile.type !== baseProfileType) {
                // Path should have two levels for non-base profiles
                profileShortPath = `${rootProfileName}.${profile.type}`;
                profileLongPath = `profiles.${rootProfileName}.profiles.${profile.type}`;
                lodash.set(config.profiles, `${rootProfileName}.properties`, {});
            }

            const properties: { [key: string]: any } = {};
            for (const [k, v] of Object.entries(profile.schema.properties)) {
                if (opts.populateProperties && v.includeInTemplate) {
                    if (v.secure) {
                        const propPath = `${profileLongPath}.properties.${k}`;
                        config.secure.push(propPath);

                        const propValue = opts.getSecureValue ? await opts.getSecureValue(k, v) : null;
                        if (propValue != null) {
                            // Save this value to be stored securely after profile is built
                            properties[k] = propValue;
                        }
                    } else {
                        if ((v as any).optionDefinition != null) {
                            // Use default value of ICommandOptionDefinition if present
                            properties[k] = (v as any).optionDefinition.defaultValue;
                        }
                        if (properties[k] === undefined) {
                            // Fall back to an empty value
                            properties[k] = this.getDefaultValue(v.type);
                        }
                    }
                }
            }

            // Add the profile to config and set it as default
            lodash.set(config, profileLongPath, {
                type: profile.type,
                properties
            });

            if (opts.populateProperties) {
                config.defaults[profile.type] = profileShortPath;
            }
        }

        // Hoist duplicate default properties
        if (config.profiles != null && config.profiles[rootProfileName] != null) {
            config.profiles[rootProfileName] = this.hoistTemplateProperties(config.profiles[rootProfileName]);
        }

        return config;
    }

    /**
     * Returns empty value that is appropriate for the property type.
     * @param propType The type of profile property
     * @returns Null or empty object
     */
    private static getDefaultValue(propType: string | string[]): any {
        // TODO How to handle profile property with multiple types
        if (Array.isArray(propType)) {
            propType = propType[0];
        }
        switch (propType) {
            case "string":  return "";
            case "number":  return 0;
            case "object":  return {};
            case "array":   return [];
            case "boolean": return false;
            default:        return null;
        }
    }

    /**
     * Moves duplicate default properties across child profiles up to root
     * profile.
     * @param rootProfile The root profile object of the config JSON
     * @returns The root profile with duplicate properties hoisted
     */
    private static hoistTemplateProperties(rootProfile: IConfigProfile): IConfigProfile {
        // Flatten properties into object that maps property name to list of values
        const flattenedProps: { [key: string]: any[] } = {};
        for (const childProfile of Object.values(rootProfile.profiles)) {
            for (const [k, v] of Object.entries(childProfile.properties)) {
                flattenedProps[k] = [...(flattenedProps[k] || []), v];
            }
        }
        // List property names defined multiple times with the same value
        const duplicateProps: string[] = [];
        for (const [k, v] of Object.entries(flattenedProps)) {
            if (v.length > 1 && (new Set(v)).size === 1) {
                duplicateProps.push(k);
            }
        }
        // Remove duplicate properties from child profiles and store them in root profile
        for (const propName of duplicateProps) {
            rootProfile.properties[propName] = flattenedProps[propName][0];
            for (const childProfile of Object.values(rootProfile.profiles)) {
                delete childProfile.properties[propName];
            }
        }
        return rootProfile;
    }
}
