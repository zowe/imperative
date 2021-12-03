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

import * as path from "path";
import * as lodash from "lodash";
import { IProfile, ProfileIO, ProfilesConstants, ProfileUtils } from "../../profiles";
import { IImperativeConfig } from "../../imperative";
import { Config } from "./Config";
import { IConfig } from "./doc/IConfig";
import { IConfigBuilderOpts } from "./doc/IConfigBuilderOpts";
import { IConfigProfile } from "./doc/IConfigProfile";
import { CredentialManagerFactory } from "../../security";
import { IConfigConvertResult } from "./doc/IConfigConvertResult";

export class ConfigBuilder {
    /**
     * Build a new Config object from an Imperative CLI app configuration.
     * @param impConfig The Imperative CLI app configuration.
     * @param opts Options to control aspects of the builder.
     */
    public static async build(impConfig: IImperativeConfig, opts?: IConfigBuilderOpts): Promise<IConfig> {
        opts = opts || {};
        const config: IConfig = Config.empty();

        for (const profile of impConfig.profiles) {
            const properties: { [key: string]: any } = {};
            const secureProps: string[] = [];
            for (const [k, v] of Object.entries(profile.schema.properties)) {
                if (opts.populateProperties && v.includeInTemplate) {
                    if (v.secure) {
                        secureProps.push(k);
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
            lodash.set(config, `profiles.${profile.type}`, {
                type: profile.type,
                properties,
                secure: secureProps
            });

            if (opts.populateProperties) {
                config.defaults[profile.type] = profile.type;
            }
        }

        // Hoist duplicate default properties
        if (config.profiles != null && impConfig.baseProfile != null) {
            this.hoistTemplateProperties(config.profiles, impConfig.baseProfile.type);
        }

        return { ...config, autoStore: true };
    }

    /**
     * Convert existing v1 profiles to a Config object and report any conversion failures.
     * @param profilesRootDir Root directory where v1 profiles are stored.
     * @returns Results object including new config and error details for profiles that failed to convert.
     */
    public static async convert(profilesRootDir: string): Promise<IConfigConvertResult> {
        const profileTypes = ProfileIO.getAllProfileDirectories(profilesRootDir);
        const oldProfiles: { name: string; type: string }[] = [];
        for (const profileType of profileTypes) {
            const profileTypeDir = path.join(profilesRootDir, profileType);
            const profileNames = ProfileIO.getAllProfileNames(profileTypeDir, ".yaml", `${profileType}_meta`);
            profileNames.forEach(name => oldProfiles.push({ name, type: profileType }));
        }
        const config = Config.empty();
        const profilesConverted: any = {};
        const profilesFailed = [];

        for (const profileType of profileTypes) {
            // TODO Thoroughly handle error cases for invalid folders/profile YAMLs/meta YAMLs
            const oldProfilesByType = oldProfiles.filter(({ type }) => type === profileType);
            if (oldProfilesByType.length === 0) {
                continue;
            }

            const profileTypeDir = path.join(profilesRootDir, profileType);
            for (const { name } of oldProfilesByType) {
                const profileFilePath = path.join(profileTypeDir, `${name}.yaml`);
                const secureProps = [];
                let convertError: Error;
                let profileProps: IProfile;

                try {
                    profileProps = ProfileIO.readProfileFile(profileFilePath, profileType);
                } catch (error) {
                    convertError = new Error(`Failed to read profile YAML file: ${profileFilePath}`);
                    continue;
                }

                for (const [key, value] of Object.entries(profileProps)) {
                    if (value.toString().startsWith(ProfilesConstants.PROFILES_OPTION_SECURELY_STORED)) {
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

                config.profiles[ProfileUtils.getProfileMapKey(profileType, name)] = {
                    type: profileType,
                    properties: profileProps,
                    secure: secureProps
                };

                if (convertError == null) {
                    profilesConverted[profileType] = [...(profilesConverted[profileType] || []), name];
                } else {
                    profilesFailed.push({ name, type: profileType, error: convertError });
                }
            }

            const metaFilePath = path.join(profileTypeDir, `${profileType}_meta.yaml`);
            try {
                const profileMetaFile = ProfileIO.readMetaFile(metaFilePath);
                if (profileMetaFile.defaultProfile != null) {
                    config.defaults[profileType] = ProfileUtils.getProfileMapKey(profileType, profileMetaFile.defaultProfile);
                }
            } catch (error) {
                profilesFailed.push({ type: profileType, error: new Error(`Failed to read profile meta YAML file: ${metaFilePath}`) });
            }
        }

        return {
            config: { ...config, autoStore: true },
            profilesConverted,
            profilesFailed
        };
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
     * Moves duplicate default properties across child profiles into a base
     * profile.
     * @param profiles The profiles object of the config JSON
     * @param baseProfileType The type of the base profile
     */
    private static hoistTemplateProperties(profiles: { [key: string]: IConfigProfile }, baseProfileType: string): void {
        // Flatten properties into object that maps property name to list of values
        const flattenedProps: { [key: string]: any[] } = {};
        for (const childProfile of Object.values(profiles).filter(({ type }) => type !== baseProfileType)) {
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
            profiles[baseProfileType].properties = {
                [propName]: flattenedProps[propName][0],
                ...profiles[baseProfileType].properties
            };
            for (const childProfile of Object.values(profiles).filter(({ type }) => type !== baseProfileType)) {
                delete childProfile.properties[propName];
            }
        }
    }
}
