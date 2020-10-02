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

import { ImperativeError } from "../error";
import { IO } from "../io";
import * as DeepMerge from "deepmerge";
import { CredentialManagerFactory } from "../security";

export class Config {
    private constructor(private params: any) { }

    public static load(params: any): Config {
        params.config = {};

        // Only proceed if the config exists
        if (IO.existsSync(params.path)) {

            // read and parse the config document
            const configContents = IO.readFileSync(params.path).toString();
            try {
                params.config = JSON.parse(configContents);
                params.original = { ...params.config };
                params.exists = true;
            } catch (e) {
                throw new ImperativeError({ msg: `error parsing config: ${e}` });
            }
        } else {
            params.exists = false;
        }

        // Set empty objects if not present
        params.config.merge = params.config.merge || { profiles: {}, options: {} };
        params.config.defaults = params.config.defaults || {};
        params.config.profiles = params.config.profiles || {};
        params.config.plugins = params.config.plugins || [];
        params.schemas = params.schemas || {};

        // Create the object
        params.api = {};
        const config = new Config(params);

        // setup the API for profiles
        config.api.profiles = {
            get: config.api_profiles_get.bind(config),
            loadSecure: config.api_profiles_load.bind(config),
            saveSecure: config.api_profiles_save.bind(config),
            names: config.api_profiles_names.bind(config),
            validate: config.api_profiles_validate.bind(config),
            exists: config.api_profiles_exists.bind(config),
            write: config.api_profiles_write.bind(config)
        };

        // setup the API for plugins
        config.api.plugins = {
            write: config.api_plugins_write.bind(config)
        };


        // read and parse any additional configs - merge with the original config
        if (params.merge != null) {
            for (const mergePath of params.merge) {
                if (IO.existsSync(mergePath)) {

                    // Create an instance of the config for the one we'd like to merge
                    const mergeConfig = Config.load({ path: mergePath });

                    // For profiles, only merge in entries that don't already exist
                    for (const [typeName, typeObject] of Object.entries(mergeConfig.profiles)) {
                        if (config.profiles[typeName] == null) {
                            params.config.profiles[typeName] = { ...(typeObject as any) };
                        } else {
                            const ourProfileNames = config.api.profiles.names(typeName);
                            const mergedProfileNames = mergeConfig.api.profiles.names(typeName).filter(
                                (name: string) => ourProfileNames.indexOf(name) >= 0);
                            mergedProfileNames.forEach((mergeProfile: string) => {
                                params.config.profiles[typeName][mergeProfile] = mergeConfig.profiles[typeName][mergeProfile];
                            });
                        }
                    }

                    // For plugins, concatenate and eliminate duplicates
                    params.config.plugins = new Set(mergeConfig.plugins.concat(params.config.plugins));

                    // For defaults, only add those that don't exist
                    for (const [defaultName, defaultObject] of Object.entries(mergeConfig.defaults)) {
                        if (params.config.defaults[defaultName] == null) {
                            params.config.defaults[defaultName] = { ...(defaultObject as any) };
                        }
                    }
                }
            }
        }

        return config;
    }

    public get api(): any {
        return this.params.api;
    }

    private api_plugins_write() {
        const original = this.original;
        original.plugins = this.params.plugins;
        IO.writeFile(this.params.path, Buffer.from(JSON.stringify(original, null, 4)));
    }

    private api_profiles_write(type: string, name: string) {
        const original = this.original;
        original.profiles[type][name] = this.params.config.profiles[type][name];
        IO.writeFile(this.params.path, Buffer.from(JSON.stringify(original, null, 4)));
    }

    private async api_profiles_load() {
        // If the secure option is set - load the secure values for the profiles
        if (this.params.schemas != null && CredentialManagerFactory.initialized) {

            // Iterate over each profile type
            for (const [typeName, profiles] of Object.entries(this.params.config.profiles)) {

                // Is there a schema for that type?
                const schema = this.params.schemas[typeName];
                if (schema != null) {

                    // Iterate over each profile for the type
                    for (const [profileName, profile] of Object.entries(profiles)) {
                        for (const [schemaPropertyName, schemaProperty] of Object.entries(schema.properties)) {
                            if ((schemaProperty as any).secure) {
                                const retrievedValue = await CredentialManagerFactory.manager.load(
                                    Config.constructSecureKey(typeName, profileName, schemaPropertyName), true);
                                if (retrievedValue != null) {
                                    this.params.config.profiles[typeName][profileName][schemaPropertyName] =
                                        (retrievedValue != null) ? JSON.parse(retrievedValue) : undefined;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private api_profiles_validate(type: string, name: string) {
        // TODO
    }

    private api_profiles_names(type: string): string[] {
        return this.params.config.profiles[type] == null ? [] : Object.keys(this.params.config.profiles[type]);
    }

    private api_profiles_exists(type: string, name: string): boolean {
        return !(this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null);
    }

    private api_profiles_get(type: string, name: string) {
        if (this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null) {
            return {};
        }

        return this.params.config.profiles[type][name];
    }

    private async api_profiles_save(type: string, name: string, opts?: any): Promise<any> {
        // Fail if the profile doesn't exist
        if (this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null) {
            throw new ImperativeError({ msg: `profile "${name}" of type "${type}" does not exist` });
        }

        // If the schema is present, validate the profile
        if (opts.schema != null) {
            this.api_profiles_validate(type, name);
        }

        // If the schema is present, and secure loading was requested, attempt
        // to load properties from the OS operating system vault
        const profile: any = this.params.config.profiles[type][name];
        if (CredentialManagerFactory.initialize) {
            for (const [schemaPropertyName, schemaProperty] of Object.keys(opts.schema.properties)) {
                if ((schemaProperty as any)[schemaPropertyName].secure && profile[schemaProperty] != null) {
                    const value = JSON.stringify(profile[schemaProperty]);
                    await CredentialManagerFactory.manager.save(Config.constructSecureKey(type, name, schemaProperty), value);
                }
            }
        }
    }

    private static constructSecureKey(type: string, name: string, field: string): string {
        return type + "_" + name + "_" + field.split(".").join("_");
    }

    public get merge(): any {
        return this.params.config.merge;
    }

    public get profiles(): any {
        return this.params.config.profiles;
    }

    public get exists(): boolean {
        return this.params.exists;
    }

    public get defaults(): any {
        return this.params.config.defaults;
    }

    public get path(): string {
        return this.params.path;
    }

    public get plugins(): any {
        return this.params.config.plugins;
    }

    public get original(): any {
        return { ...this.params.original };
    }
}