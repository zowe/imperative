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

import { CredentialManagerFactory } from "../security";
import { IConfigParams } from "./IConfigParams";
import { IConfigApi } from "./IConfigApi";
import * as fs from "fs";
import * as path from "path";
import { IConfig } from "./IConfig";
import { IConfigLayer } from "./IConfigLayer";


interface ICnfg {
    paths: string[];
    exists?: boolean;
    config?: IConfig;
    base?: IConfig;
    api?: IConfigApi;
    layers?: IConfigLayer[];
    schemas?: any;
};

export class Config {
    private static readonly IDENT: number = 4;

    private constructor(private _: ICnfg) { }

    public static load(params: IConfigParams): Config {
        const _: ICnfg = { ...params }; // copy the parameters

        ////////////////////////////////////////////////////////////////////////
        // Create the basic empty configuration
        (_ as any).config = {};
        (_ as any).config.profiles = {};
        (_ as any).config.defaults = {};
        (_ as any).config.all = {};
        (_ as any).config.plugins = [];
        (_ as any).api = {};
        (_ as any).layers = [];
        (_ as any).schemas = params.schemas || {};
        const config = new Config(_);

        // setup the API for profiles
        config.api.profiles = {
            get: config.api_profiles_get.bind(config),
            loadSecure: config.api_profiles_load_secure.bind(config),
            saveSecure: config.api_profiles_save_secure.bind(config),
            names: config.api_profiles_names.bind(config),
            validate: config.api_profiles_validate.bind(config),
            exists: config.api_profiles_exists.bind(config),
            set: config.api_profiles_set.bind(config),
            write: config.api_profiles_write.bind(config),
            location: config.api_profiles_location.bind(config)
        };

        // setup the API for plugins
        config.api.plugins = {
            write: config.api_plugins_write.bind(config),
            new: config.api_plugins_new.bind(config)
        };

        ////////////////////////////////////////////////////////////////////////
        // Read and create each configuration layer
        try {
            config.paths.forEach((p: string, idx: number) => {
                // Create an empty layer
                config._.layers[idx] = {
                    exists: false,
                    path: p,
                    properties: {}
                };

                // Attempt to popluate the layer
                if (fs.existsSync(p)) {
                    try {
                        config._.layers[idx].properties = JSON.parse(fs.readFileSync(p).toString());
                        config._.layers[idx].exists = true;
                        config._.exists = true;
                    } catch (e) {
                        throw new Error(`${p}: ${e.message}`);
                    }
                }

                // Populate any undefined defaults
                config._.layers[idx].properties.defaults = config._.layers[idx].properties.defaults || {};
                config._.layers[idx].properties.profiles = config._.layers[idx].properties.profiles || {};
                config._.layers[idx].properties.all = config._.layers[idx].properties.all || {};
                config._.layers[idx].properties.plugins = config._.layers[idx].properties.plugins || [];
            });
        } catch (e) {
            throw new Error(`error reading config file: ${e.message}`);
        }

        ////////////////////////////////////////////////////////////////////////
        // Merge the configuration layers
        config._.layers.forEach((layer: IConfigLayer) => {

            // Merge "plugins" - create a unique set from all entires
            config._.config.plugins = Array.from(new Set(layer.properties.plugins.concat(config._.config.plugins)));

            // Merge "defaults" - only add new properties from this layer
            for (const [name, value] of Object.entries(layer.properties.defaults)) {
                config._.config.defaults[name] = config._.config.defaults[name] || value;
            }

            // Merge "all" - only add new properties from this layer
            for (const [name, value] of Object.entries(layer.properties.all)) {
                config._.config.all[name] = config._.config.all[name] || value;
            }

            // Merge "profiles" - only add new profiles from this layer
            for (const [type, entries] of Object.entries(layer.properties.profiles)) {
                if (config._.config.profiles[type] == null) {
                    config._.config.profiles[type] = entries;
                } else {
                    for (const [name, profile] of Object.entries(layer.properties.profiles[type])) {
                        config._.config.profiles[type][name] = config._.config.profiles[type][name] || profile;
                    }
                }
            }
        });

        ////////////////////////////////////////////////////////////////////////
        // Complete - retain the "base" aka original configuration
        config._.base = JSON.parse(JSON.stringify(config._.config));
        return config;
    }

    public static search(file: string, opts?: any): string {
        opts = opts || {};
        if (opts.stop) opts.stop = path.resolve(opts.stop);
        let p = path.join(process.cwd(), file);
        const root = path.parse(process.cwd()).root;
        let prev = null;
        do {
            // this should never happen, but we'll add a check to prevent
            if (prev != null && prev === p)
                throw new Error(`internal search error: prev === p (${prev})`);
            if (fs.existsSync(p))
                return p;
            prev = p;
            p = path.resolve(path.dirname(p), "..", file);
        } while (p !== path.join(root, file) && opts.stop != null && path.dirname(p) !== opts.stop)
        return null;
    }

    public get api(): IConfigApi {
        return this._.api;
    }

    private api_profiles_location(type: string, name: string): string {
        for (const layer of this._.layers) {
            if (layer.exists && layer.properties.profiles[type] != null && layer.properties.profiles[type][name] != null)
                return layer.path;
            if (layer.properties.profiles[type] != null)
                break;
        }
        return null;
    }

    private api_profiles_set(type: string, name: string, contents: { [key: string]: any }) {
        if (this._.config.profiles[type] == null) {
            this._.config.profiles[type] = {};
        }
        this._.config.profiles[type][name] = contents;
    }

    private api_plugins_write(): void {
        try {
            if (this._.layers[this.activeLayer].exists) {
                const c = JSON.parse(JSON.stringify(this._.layers[this.activeLayer].properties));
                c.plugins = c.plugins.concat(this.api_plugins_new());
                try {
                    fs.writeFileSync(this._.layers[this.activeLayer].path, JSON.stringify(c, null, Config.IDENT))
                } catch (e) {
                    throw new Error(`${this._.layers[this.activeLayer].path}: ${e.message}`);
                }
            }
        } catch (e) {
            throw new Error(`write plugins failed: ${e.message}`);
        }
    }

    private api_plugins_new(): string[] {
        const base = this._.base.plugins;
        return this._.config.plugins.filter((plugin: string) => {
            return base.indexOf(plugin) < 0
        });
    }

    private async api_profiles_load_secure() {
        // If the secure option is set - load the secure values for the profiles
        if (this._.schemas != null && CredentialManagerFactory.initialized) {

            // Iterate over each profile type
            for (const [typeName, profiles] of Object.entries(this._.config.profiles)) {

                // Is there a schema for that type?
                const schema = this._.schemas[typeName];
                if (schema != null) {

                    // Iterate over each profile for the type
                    for (const [profileName, profile] of Object.entries(profiles)) {
                        for (const [schemaPropertyName, schemaProperty] of Object.entries(schema.properties)) {
                            if ((schemaProperty as any).secure) {
                                const retrievedValue = await CredentialManagerFactory.manager.load(
                                    Config.constructSecureKey(typeName, profileName, schemaPropertyName), true);
                                if (retrievedValue != null) {
                                    this._.config.profiles[typeName][profileName][schemaPropertyName] =
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
        return this._.config.profiles[type] == null ? [] : Object.keys(this._.config.profiles[type]);
    }

    private api_profiles_exists(type: string, name: string): boolean {
        return !(this._.config.profiles[type] == null || this._.config.profiles[type][name] == null);
    }

    private api_profiles_get(type: string, name: string): any {
        const all = JSON.parse(JSON.stringify(this._.config.all));
        if (this._.config.profiles[type] == null || this._.config.profiles[type][name] == null)
            return { ...all };
        return { ...this._.config.profiles[type][name], ...all };
    }

    private async api_profiles_save_secure(type: string, name: string, opts?: any): Promise<void> {
        if (this._.api.profiles.exists(type, name)) {
            const schema: any = this._.schemas[type];
            const profile: any = JSON.parse(JSON.stringify(this._.config.profiles[type][name]));
            if (CredentialManagerFactory.initialize) {
                for (const [schemaPropertyName, schemaProperty] of Object.entries(schema.properties)) {
                    if ((schemaProperty as any).secure && profile[schemaPropertyName] != null) {
                        const value = JSON.stringify(profile[schemaPropertyName]);
                        profile[schemaPropertyName] = `managed by ${CredentialManagerFactory.manager.name}`;
                        await CredentialManagerFactory.manager.save(Config.constructSecureKey(type, name, schemaPropertyName), value);
                    }
                }
            }
            if (opts.write) {
                await this.api_profiles_write(type, name, { contents: profile });
            }
        }
    }

    private async api_profiles_write(type: string, name: string, opts?: any): Promise<void> {
        if (opts.contents)
            this.api_profiles_set(type, name, opts.contents);

        if (this.api_profiles_exists(type, name)) {
            const p: any = JSON.parse(JSON.stringify(this._.config.profiles[type][name]));
            const c: IConfig = JSON.parse(JSON.stringify(this._.layers[this.activeLayer].properties));
            if (c.profiles[type] == null)
                c.profiles[type] = {};
            c.profiles[type][name] = p;
            try {
                fs.writeFileSync(this._.layers[this.activeLayer].path, JSON.stringify(c, null, Config.IDENT))
            } catch (e) {
                throw new Error(`${this._.layers[this.activeLayer].path}: ${e.message}`);
            }
        }
    }

    private get activeLayer(): number {
        for (const [i, layer] of this._.layers.entries()) {
            if (layer.exists)
                return i;
        }
        throw new Error(`no active config layer exists`);
    }

    private static constructSecureKey(type: string, name: string, field: string): string {
        return type + "_" + name + "_" + field.split(".").join("_");
    }

    public get profiles(): { [key: string]: any } {
        return this._.config.profiles;
    }

    public get exists(): boolean {
        return this._.exists;
    }

    public get defaults(): { [key: string]: any } {
        return this._.config.defaults;
    }

    public get paths(): string[] {
        return this._.paths;
    }

    public get plugins(): string[] {
        return this._.config.plugins;
    }

    public get base(): IConfig {
        return JSON.parse(JSON.stringify(this._.base));
    }

    public get layers(): IConfigLayer[] {
        return JSON.parse(JSON.stringify(this._.layers));
    }

    public get properties(): IConfig {
        return JSON.parse(JSON.stringify(this._.config));
    }
}