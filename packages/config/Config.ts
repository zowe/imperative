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

const setable = ["defaults", "all", "profiles"];

import { CredentialManagerFactory } from "../security";
import { IConfigParams } from "./IConfigParams";
import { IConfigApi } from "./IConfigApi";
import * as fs from "fs";
import * as path from "path";
import { IConfig } from "./IConfig";
import { IConfigLayer } from "./IConfigLayer";
import { ImperativeError } from "../error";


interface ICnfg {
    app: string;
    paths?: string[];
    exists?: boolean;
    config?: IConfig;
    base?: IConfig;
    api?: IConfigApi;
    layers?: IConfigLayer[];
    schemas?: any;
    home?: string;
    name?: string;
    user?: string;
    active?: {
        user: boolean;
        global: boolean;
    };
};

export class Config {
    private static readonly IDENT: number = 4;

    private constructor(private _: ICnfg) { }

    public static load(app: string, opts?: IConfigParams): Config {
        const _: ICnfg = { ...opts, app }; // copy the parameters

        ////////////////////////////////////////////////////////////////////////
        // Create the basic empty configuration
        _.config = {};
        _.config.profiles = {};
        _.config.defaults = {};
        _.config.all = {};
        _.config.plugins = [];
        _.layers = [];
        _.schemas = _.schemas || {};
        _.home = _.home || path.join(require("os").homedir(), `.${app}`);
        _.paths = [];
        _.name = `${app}.config.json`;
        _.user = `${app}.config.user.json`;
        _.active = { user: false, global: false };
        (_ as any).api = {};

        ////////////////////////////////////////////////////////////////////////
        // Populate configuration file layers
        const home = require('os').homedir();

        // Find/create project user layer
        let user = Config.search(_.user, { stop: home });
        if (user == null)
            user = path.join(process.cwd(), _.user);
        _.paths.push(user);
        _.layers.push({ path: user, exists: false, properties: {}, global: false, user: true });

        // Find/create project layer
        let project = Config.search(_.name, { stop: home });
        if (project == null)
            project = path.join(process.cwd(), _.name);
        _.paths.push(project);
        _.layers.push({ path: project, exists: false, properties: {}, global: false, user: false });

        // create the user layer
        const usrGlbl = path.join(_.home, _.user);
        _.paths.push(usrGlbl);
        _.layers.push({ path: usrGlbl, exists: false, properties: {}, global: true, user: true });

        // create the global layer
        const glbl = path.join(_.home, _.name);
        _.paths.push(glbl);
        _.layers.push({ path: glbl, exists: false, properties: {}, global: true, user: false });

        ////////////////////////////////////////////////////////////////////////
        // Create the config and setup the APIs
        const config = new Config(_);

        // setup the API for profiles
        config.api.profiles = {
            get: config.api_profiles_get.bind(config),
            loadSecure: config.api_profiles_load_secure.bind(config),
            names: config.api_profiles_names.bind(config),
            validate: config.api_profiles_validate.bind(config),
            exists: config.api_profiles_exists.bind(config),
            set: config.api_profiles_set.bind(config)
        };

        // setup the API for plugins
        config.api.plugins = {
            write: config.api_plugins_write.bind(config),
            new: config.api_plugins_new.bind(config)
        };

        ////////////////////////////////////////////////////////////////////////
        // Read and populate each configuration layer
        try {
            config._.layers.forEach((layer: IConfigLayer) => {
                // Attempt to popluate the layer
                if (fs.existsSync(layer.path)) {
                    try {
                        layer.properties = JSON.parse(fs.readFileSync(layer.path).toString());
                        layer.exists = true;
                        config._.exists = true;
                    } catch (e) {
                        throw new ImperativeError({ msg: `${layer.path}: ${e.message}` });
                    }
                }

                // Populate any undefined defaults
                layer.properties.defaults = layer.properties.defaults || {};
                layer.properties.profiles = layer.properties.profiles || {};
                layer.properties.all = layer.properties.all || {};
                layer.properties.plugins = layer.properties.plugins || [];
            });
        } catch (e) {
            throw new ImperativeError({ msg: `error reading config file: ${e.message}` });
        }

        ////////////////////////////////////////////////////////////////////////
        // Merge the configuration layers
        config.layerMerge();

        ////////////////////////////////////////////////////////////////////////
        // Complete - retain the "base" aka original configuration
        config._.base = JSON.parse(JSON.stringify(config._.config));
        return config;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Plugins APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private api_plugins_write(): void {
        try {
            const layer = this.layerActive();
            if (layer.exists) {
                const c = JSON.parse(JSON.stringify(layer.properties));
                c.plugins = c.plugins.concat(this.api_plugins_new());
                try {
                    fs.writeFileSync(layer.path, JSON.stringify(c, null, Config.IDENT))
                } catch (e) {
                    throw new ImperativeError({ msg: `${layer.path}: ${e.message}` });
                }
            }
        } catch (e) {
            throw new ImperativeError({ msg: `write plugins failed: ${e.message}` });
        }
    }

    private api_plugins_new(): string[] {
        const base = this._.base.plugins;
        return this._.config.plugins.filter((plugin: string) => {
            return base.indexOf(plugin) < 0
        });
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Profile APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

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
                                const value = await CredentialManagerFactory.manager.load(
                                    Config.constructSecureKey(typeName, profileName, schemaPropertyName), true);
                                if (value != null) {
                                    for (const layer of this._.layers) {
                                        if (layer.properties.profiles[typeName] != null && layer.properties.profiles[typeName][profileName]) {
                                            layer.properties.profiles[typeName][profileName][schemaPropertyName] =
                                                (value != null) ? JSON.parse(value) : undefined;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        this.layerMerge();
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

    private api_profiles_set(type: string, name: string, contents: { [key: string]: any }) {
        const layer = this.layerActive();
        if (layer.properties.profiles[type] == null) {
            layer.properties.profiles[type] = {};
        }
        layer.properties.profiles[type][name] = contents;
        this.layerMerge();
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Accessors
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    public get api(): IConfigApi {
        return this._.api;
    }

    public get exists(): boolean {
        return this._.exists;
    }

    public get paths(): string[] {
        return this._.paths;
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

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Manipulate config properties
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    public set(property: string, value: any) {
        if (!this.isSetable(property))
            throw new ImperativeError({ msg: `property '${property}' is not able to be set. Root must be: ${setable.toString()}` });

        // TODO: make a copy and validate that the update would be legit
        // TODO: based on schema
        const layer = this.layerActive();
        let obj: any = layer.properties;
        const segments = property.split(".");
        property.split(".").forEach((segment: string) => {
            if (obj[segment] == null && segments.indexOf(segment) < segments.length - 1) {
                obj[segment] = {};
                obj = obj[segment];
            } else if (segments.indexOf(segment) === segments.length - 1) {

                // TODO: add ability to escape these values to string
                if (value === "true")
                    value = true;
                if (value === "false")
                    value = false;
                if (!isNaN(value) && !isNaN(parseFloat(value)))
                    value = parseInt(value, 10);
                obj[segment] = value;
            } else {
                obj = obj[segment];
            }
        });

        this.layerMerge();
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Utilities
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    public static search(file: string, opts?: any): string {
        opts = opts || {};
        if (opts.stop) opts.stop = path.resolve(opts.stop);
        let p = path.join(process.cwd(), file);
        const root = path.parse(process.cwd()).root;
        let prev = null;
        do {
            // this should never happen, but we'll add a check to prevent
            if (prev != null && prev === p)
                throw new ImperativeError({ msg: `internal search error: prev === p (${prev})` });
            if (fs.existsSync(p))
                return p;
            prev = p;
            p = path.resolve(path.dirname(p), "..", file);
        } while (p !== path.join(root, file) && opts.stop != null && path.dirname(p) !== opts.stop)
        return null;
    }

    private isSetable(property: string) {
        const properties = property.split(".");
        return setable.indexOf(properties[0]) >= 0;
    }

    private static constructSecureKey(type: string, name: string, field: string): string {
        return type + "_" + name + "_" + field.split(".").join("_");
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Layer APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    public async layerWrite(): Promise<any> {
        const layer = JSON.parse(JSON.stringify(this.layerActive()));

        // If the credential manager factory is initialized then we must iterate
        // through the profiles and securely store the values
        if (CredentialManagerFactory.initialized) {
            for (const [type, obj] of Object.entries(layer.properties.profiles)) {
                const schema = this._.schemas[type];
                if (schema) {
                    for (const [name, profile] of Object.entries(layer.properties.profiles[type])) {
                        for (const [schemaPropertyName, schemaProperty] of Object.entries(schema.properties)) {
                            if ((schemaProperty as any).secure && (profile as any)[schemaPropertyName] != null) {
                                const value = JSON.stringify((profile as any)[schemaPropertyName]);
                                (profile as any)[schemaPropertyName] = `managed by ${CredentialManagerFactory.manager.name}`;
                                await CredentialManagerFactory.manager.save(Config.constructSecureKey(type, name, schemaPropertyName), value);
                            }
                        }
                    }
                }
            }
        }

        // Write the layer
        try {
            fs.writeFileSync(layer.path, JSON.stringify(layer.properties, null, 4));
        } catch (e) {
            throw new ImperativeError({ msg: `error writing "${layer.path}": ${e.message}` });
        }
        layer.exists = true;
    }

    public layerActivate(user: boolean, global: boolean) {
        this._.active.user = user;
        this._.active.global = global;
    }

    public layerGet(): IConfigLayer {
        return JSON.parse(JSON.stringify(this.layerActive()));
    }

    public layerSet(config: IConfig) {
        for (const i in this._.layers) {
            if (this._.layers[i].user === this._.active.user && this._.layers[i].global === this._.active.global) {
                this._.layers[i].properties = config;
                this._.layers[i].properties.defaults = this._.layers[i].properties.defaults || {};
                this._.layers[i].properties.profiles = this._.layers[i].properties.profiles || {};
                this._.layers[i].properties.all = this._.layers[i].properties.all || {};
                this._.layers[i].properties.plugins = this._.layers[i].properties.plugins || [];
            }
        }
        this.layerMerge();
    }

    private layerMerge() {
        // clear the config as it currently stands
        this._.config.all = {};
        this._.config.defaults = {};
        this._.config.profiles = {};
        this._.config.plugins = [];

        // merge each layer
        this._.layers.forEach((layer: IConfigLayer) => {
            // Merge "plugins" - create a unique set from all entires
            this._.config.plugins = Array.from(new Set(layer.properties.plugins.concat(this._.config.plugins)));

            // Merge "defaults" - only add new properties from this layer
            for (const [name, value] of Object.entries(layer.properties.defaults)) {
                this._.config.defaults[name] = this._.config.defaults[name] || value;
            }

            // Merge "all" - only add new properties from this layer
            for (const [name, value] of Object.entries(layer.properties.all)) {
                this._.config.all[name] = this._.config.all[name] || value;
            }

            // Merge "profiles" - only add new profiles from this layer
            for (const [type, entries] of Object.entries(layer.properties.profiles)) {
                if (this._.config.profiles[type] == null) {
                    this._.config.profiles[type] = JSON.parse(JSON.stringify(entries));
                } else {
                    for (const [name, profile] of Object.entries(layer.properties.profiles[type])) {
                        this._.config.profiles[type][name] = this._.config.profiles[type][name] || JSON.parse(JSON.stringify(profile));
                    }
                }
            }
        });
    }

    private layerActive(): IConfigLayer {
        for (const layer of this._.layers) {
            if (layer.user === this._.active.user && layer.global === this._.active.global)
                return layer;
        }
        throw new ImperativeError({ msg: `internal error: no active layer found` });
    }
}