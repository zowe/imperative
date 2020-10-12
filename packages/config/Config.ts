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
import * as node_path from "path";
import { IConfgProfile, IConfig } from "./IConfig";
import { IConfigLayer } from "./IConfigLayer";
import { ImperativeError } from "../error";
import * as deepmerge from "deepmerge";

interface ICnfg {
    app: string;
    api?: IConfigApi;
    paths?: string[];
    exists?: boolean;
    config?: IConfig;
    base?: IConfig;
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

enum layers {
    project_user = 0,
    project_config,
    global_user,
    global_config
};

export class Config {
    private static readonly IDENT: number = 4;

    private constructor(private _: ICnfg) { }

    public static load(app: string, opts?: IConfigParams): Config {
        opts = opts || {};
        const _: ICnfg = { ...opts, app }; // copy the parameters

        ////////////////////////////////////////////////////////////////////////
        // Create the basic empty configuration
        (_ as any).config = {};
        (_ as any).api = { plugins: {}, profiles: {} };
        _.config.profiles = {};
        _.config.defaults = {};
        _.config.plugins = [];
        _.layers = [];
        _.schemas = _.schemas || {};
        _.home = _.home || node_path.join(require("os").homedir(), `.${app}`);
        _.paths = [];
        _.name = `${app}.config.json`;
        _.user = `${app}.config.user.json`;
        _.active = { user: false, global: false };

        ////////////////////////////////////////////////////////////////////////
        // Populate configuration file layers
        const home = require('os').homedir();
        const properties: IConfig = {
            profiles: {},
            defaults: {},
            plugins: [],
            secure: []
        };

        // Find/create project user layer
        let user = Config.search(_.user, { stop: home });
        if (user == null)
            user = node_path.join(process.cwd(), _.user);
        _.paths.push(user);
        _.layers.push({ path: user, exists: false, properties, global: false, user: true });

        // Find/create project layer
        let project = Config.search(_.name, { stop: home });
        if (project == null)
            project = node_path.join(process.cwd(), _.name);
        _.paths.push(project);
        _.layers.push({ path: project, exists: false, properties, global: false, user: false });

        // create the user layer
        const usrGlbl = node_path.join(_.home, _.user);
        _.paths.push(usrGlbl);
        _.layers.push({ path: usrGlbl, exists: false, properties, global: true, user: true });

        // create the global layer
        const glbl = node_path.join(_.home, _.name);
        _.paths.push(glbl);
        _.layers.push({ path: glbl, exists: false, properties, global: true, user: false });

        ////////////////////////////////////////////////////////////////////////
        // Create the config and setup the APIs
        const config = new Config(_);

        // setup the API for profiles
        config._.api.profiles = {
            set: config.api_profiles_set.bind(config),
            get: config.api_profiles_get.bind(config),
            build: config.api_profiles_build.bind(config),
            names: config.api_profiles_names.bind(config),
            exists: config.api_profiles_exists.bind(config),
        };

        // setup the API for plugins
        config._.api.plugins = {
            get: config.api_plugins_get.bind(config),
            new: config.api_plugins_new.bind(config),
            append: null,
        };

        // setup the API for defaults
        config._.api.defaults = {
            get: config.api_defaults_get.bind(config),
            set: config.api_defaults_set.bind(config),
            build: config.api_defaults_build.bind(config)
        };

        ////////////////////////////////////////////////////////////////////////
        // Read and populate each configuration layer
        try {
            let setActive = true;
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

                // Find the active layer
                if (setActive && layer.exists) {
                    _.active.user = layer.user;
                    _.active.global = layer.global;
                    setActive = false;
                }

                // Populate any undefined defaults
                layer.properties.defaults = layer.properties.defaults || {};
                layer.properties.profiles = layer.properties.profiles || {};
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

    private api_plugins_get(): string[] {
        return this._.config.plugins;
    }

    private api_plugins_new(): string[] {
        const base = this._.base.plugins;
        return this._.config.plugins.filter((plugin: string) => {
            return base.indexOf(plugin) < 0
        });
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // defaults APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private api_defaults_set(key: string, value: string) {
        this.layerActive().properties.defaults[key] = value;
    }

    private api_defaults_get(key: string): { name: string, profile: IConfgProfile } {
        const dflt = this._.config.defaults[key];
        if (dflt == null || !this.api_profiles_exists(dflt))
            return null;
        return { name: dflt, profile: this.api_profiles_get(dflt) };
    }

    private api_defaults_build(key: string): { [key: string]: string } {
        const dflt = this._.config.defaults[key];
        if (dflt == null || !this.api_profiles_exists(dflt))
            return null;
        return this.api_profiles_build(dflt);
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Profile APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private api_profiles_names(): string[] {
        return Object.keys(this._.config.profiles);
    }

    private api_profiles_exists(path: string): boolean {
        return (this.findProfile(path, this._.config.profiles) != null);
    }

    private api_profiles_get(path: string, opts?: { active?: boolean }): IConfgProfile {
        opts = opts || {};
        return this.findProfile(path, (opts.active) ?
            JSON.parse(JSON.stringify(this.layerActive().properties.profiles)) :
            JSON.parse(JSON.stringify(this._.config.profiles)));
    }

    private api_profiles_build(path: string, opts?: { active?: boolean }): { [key: string]: string } {
        opts = opts || {};
        return this.buildProfile(path, (opts.active) ?
            JSON.parse(JSON.stringify(this.layerActive().properties.profiles)) :
            JSON.parse(JSON.stringify(this._.config.profiles)));
    }

    private api_profiles_set(path: string, profile: IConfgProfile) {
        profile.properties = profile.properties || {};
        const layer = this.layerActive();
        const segments: string[] = path.split(".");
        let p: any = layer.properties;
        for (let x = 0; x < segments.length; x++) {
            const segment = segments[x];
            if (p.profiles == null)
                p.profiles = {};
            if (p.profiles[segment] == null)
                p.profiles[segment] = { properties: {} };
            if (x === segments.length - 1)
                p.profiles[segment] = profile;
            p = p.profiles[segment];
        }
        this.layerMerge();
    }

    private buildProfile(path: string, profiles: { [key: string]: IConfgProfile }): { [key: string]: string } {
        const segments: string[] = path.split(".");
        let properties = {};
        for (const [n, p] of Object.entries(profiles)) {
            if (segments[0] === n) {
                properties = { ...properties, ...p.properties };
                if (segments.length > 1) {
                    segments.splice(0, 1);
                    properties = { ...properties, ...this.buildProfile(segments.join("."), p.profiles) };
                }
                break;
            }
        }
        return properties;
    }

    private findProfile(path: string, profiles: { [key: string]: IConfgProfile }): IConfgProfile {
        const segments: string[] = path.split(".");
        for (const [n, p] of Object.entries(profiles)) {
            if (segments.length === 1 && segments[0] === n) {
                return p;
            } else if (segments[0] === n && p.profiles != null) {
                segments.splice(0, 1);
                return this.findProfile(segments.join("."), p.profiles);
            }
        }
        return null;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Accessors
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

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

    public get api(): IConfigApi {
        return this._.api;
    }

    public get properties(): IConfig {
        return JSON.parse(JSON.stringify(this._.config));
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Utilities
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    public static search(file: string, opts?: any): string {
        opts = opts || {};
        if (opts.stop) opts.stop = node_path.resolve(opts.stop);
        let p = node_path.join(process.cwd(), file);
        const root = node_path.parse(process.cwd()).root;
        let prev = null;
        do {
            // this should never happen, but we'll add a check to prevent
            if (prev != null && prev === p)
                throw new ImperativeError({ msg: `internal search error: prev === p (${prev})` });
            if (fs.existsSync(p))
                return p;
            prev = p;
            p = node_path.resolve(node_path.dirname(p), "..", file);
        } while (p !== node_path.join(root, file) && opts.stop != null && node_path.dirname(p) !== opts.stop)
        return null;
    }

    private static secureKey(cnfg: string, property: string): string {
        return cnfg + "_" + property;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Manipulate properties
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    // TODO: more validation
    public set(path: string, value: any, opts?: { secure?: boolean, append?: boolean }) {
        opts = opts || {};

        // TODO: additional validations
        if (path.startsWith("group") && !Array.isArray(value))
            throw new ImperativeError({ msg: `group property must be an array` });

        // TODO: make a copy and validate that the update would be legit
        // TODO: based on schema
        const layer = this.layerActive();
        let obj: any = layer.properties;
        const segments = path.split(".");
        path.split(".").forEach((segment: string) => {
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
                if (opts.append) {
                    if (!Array.isArray(obj[segment]))
                        throw new ImperativeError({ msg: `property ${path} is not an array` });
                    obj[segment].push(value);
                } else {
                    obj[segment] = value;
                }
            } else {
                obj = obj[segment];
            }
        });

        if (opts.secure)
            layer.properties.secure = Array.from(new Set(layer.properties.secure.concat([path])));

        this.layerMerge();
    }

    public async loadSecure() {
        // If the secure option is set - load the secure values for the profiles
        if (CredentialManagerFactory.initialized) {
            for (const layer of this._.layers) {
                if (layer.properties.secure != null) {
                    for (const path of layer.properties.secure) {
                        const segments = path.split(".");
                        let obj: any = this.layerActive().properties;
                        for (let x = 0; x < segments.length; x++) {
                            const segment = segments[x];
                            if (x === segments.length - 1) {
                                const v = await CredentialManagerFactory.manager.load(Config.secureKey(layer.path, path), true);
                                if (v != null)
                                    obj[segment] = JSON.parse(v);
                                break;
                            }
                            obj = obj[segment];
                            if (obj == null) break;
                        }
                    }
                }
            }
        }
        // merge into config
        this.layerMerge();
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Layer APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    public async layerWrite(): Promise<any> {
        const layer: IConfigLayer = JSON.parse(JSON.stringify(this.layerActive()));

        // If the credential manager factory is initialized then we must iterate
        // through the profiles and securely store the values
        if (CredentialManagerFactory.initialized && layer.properties.secure != null) {
            for (const path of layer.properties.secure) {
                const segments = path.split(".");
                let obj: any = layer.properties;
                for (let x = 0; x < segments.length; x++) {
                    const segment = segments[x];
                    const v = obj[segment];
                    if (v == null) break;
                    if (x === segments.length - 1) {
                        await CredentialManagerFactory.manager.save(Config.secureKey(layer.path, path), JSON.stringify(v));
                        obj[segment] = `managed by ${CredentialManagerFactory.manager.name}`;
                        break;
                    }
                    obj = obj[segment];
                }
            }
        }

        // Write the layer
        try {
            fs.writeFileSync(layer.path, JSON.stringify(layer.properties, null, Config.IDENT));
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
                this._.layers[i].properties.plugins = this._.layers[i].properties.plugins || [];
            }
        }
        this.layerMerge();
    }

    private layerMerge() {
        // clear the config as it currently stands
        this._.config.defaults = {};
        this._.config.profiles = {};
        this._.config.plugins = [];

        // merge each layer
        this._.layers.forEach((layer: IConfigLayer) => {

            // Merge "plugins" - create a unique set from all entires
            this._.config.plugins = Array.from(new Set(layer.properties.plugins.concat(this._.config.plugins)));

            // Merge "defaults" - only add new properties from this layer
            for (const [name, value] of Object.entries(layer.properties.defaults))
                this._.config.defaults[name] = this._.config.defaults[name] || value;
        });

        // Merge the project layer profiles together
        const usrProject = JSON.parse(JSON.stringify(this._.layers[layers.project_user].properties.profiles));
        const project = JSON.parse(JSON.stringify(this._.layers[layers.project_config].properties.profiles));
        const usr: any = deepmerge(project, usrProject);

        // Merge the global layer profiles together
        const usrGlobal = JSON.parse(JSON.stringify(this._.layers[layers.global_user].properties.profiles));
        const global = JSON.parse(JSON.stringify(this._.layers[layers.global_config].properties.profiles));
        const glbl: { [key: string]: IConfgProfile } = deepmerge(global, usrGlobal);

        // Traverse all the global profiles merging any missing from project profiles
        this._.config.profiles = usr;
        for (const [n, p] of Object.entries(glbl)) {
            if (this._.config.profiles[n] == null)
                this._.config.profiles[n] = p;
        }
    }

    private layerActive(): IConfigLayer {
        for (const layer of this._.layers) {
            if (layer.user === this._.active.user && layer.global === this._.active.global)
                return layer;
        }
        throw new ImperativeError({ msg: `internal error: no active layer found` });
    }
}