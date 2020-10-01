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
import { ICommandProfileSchema } from "../cmd";
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

            // Set empty objects if not present
            params.config.properties = params.config.properties || {};
            params.config.defaults = params.config.defaults || {};
            params.config.profiles = params.config.profiles || {};
            params.config.plugins = params.config.plugins || [];

            // read and parse any additional configs - merge with the original config
            if (params.merge != null) {
                for (const mergePath of params.merge) {
                    if (IO.existsSync(mergePath)) {
                        const mergeConfigContents = IO.readFileSync(params.path).toString();
                        try {
                            const mergeConfigJSON = JSON.parse(mergeConfigContents);
                            params.config = DeepMerge(params.config, mergeConfigJSON);
                        } catch (e) {
                            throw new ImperativeError({ msg: `error parsing config: ${e}` });
                        }
                    }
                }
            }
        } else {
            params.exists = false;
        }

        if (params.config.properties == null) {
            params.config.properties = {};
        }

        return new Config(params);
    }

    public async loadSecure() {
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
                                    Config.constructSecureKey(profileName, typeName, schemaPropertyName), false);
                                this.params.config.profiles[typeName][profileName][schemaPropertyName] =
                                    (retrievedValue != null) ? JSON.parse(retrievedValue) : undefined;
                            }
                        }
                    }
                }
            }
        }
    }

    public profileValidate(type: string, name: string, schema: ICommandProfileSchema) {
        // TODO
    }

    public profileNames(type: string): string[] {
        return this.params.config.profiles[type] == null ? [] : Object.keys(this.params.config.profiles[type]);
    }

    public profileExists(type: string, name: string): boolean {
        return !(this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null);
    }

    public profileGet(type: string, name: string) {
        if (this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null) {
            return {};
        }

        return this.params.config.profiles[type][name];
    }

    public async profileSave(type: string, name: string, opts?: any): Promise<any> {
        // Fail if the profile doesn't exist
        if (this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null) {
            throw new ImperativeError({ msg: `profile "${name}" of type "${type}" does not exist` });
        }

        // If the schema is present, validate the profile
        if (opts.schema != null) {
            this.profileValidate(type, name, opts.schema);
        }

        // If the schema is present, and secure loading was requested, attempt
        // to load properties from the OS operating system vault
        const profile: any = this.params.config.profiles[type][name];
        if (opts.schema != null && opts.secure && CredentialManagerFactory.initialize) {
            for (const [schemaPropertyName, schemaProperty] of Object.keys(opts.schema.properties)) {
                if ((schemaProperty as any)[schemaPropertyName].secure && profile[schemaProperty] != null) {
                    const value = JSON.stringify(profile[schemaProperty]);
                    await CredentialManagerFactory.manager.save(Config.constructSecureKey(name, type, schemaProperty), value);
                }
            }
        }
    }

    private static constructSecureKey(name: string, type: string, field: string): string {
        return name + "_" + type + "_" + field.split(".").join("_");
    }

    public save(keyword: string) {
        const copy: any = this.original;
        copy[keyword] = this.params.config[keyword];
        try {
            IO.writeFile(this.params.path, Buffer.from(JSON.stringify(copy, null, 4)));
        } catch (e) {
            throw new ImperativeError({ msg: `unable to save "${keyword}" to "${this.params.path}": ${e.message}` });
        }
    }

    public get properties(): any {
        return this.params.config.properties;
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