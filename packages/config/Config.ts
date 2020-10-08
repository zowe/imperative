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
import { IConfgProfile, IConfig, IConfigType } from "./IConfig";
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
    private static readonly LAYERS = layers.global_config;
    private static readonly LAYER_GROUP_PROJECT = [layers.project_user, layers.project_config];
    private static readonly LAYER_GROUP_GLOBAL = [layers.global_user, layers.global_config];

    private static readonly IDENT: number = 4;

    private constructor(private _: ICnfg) { }

    public static load(app: string, opts?: IConfigParams): Config {
        const _: ICnfg = { ...opts, app }; // copy the parameters

        ////////////////////////////////////////////////////////////////////////
        // Create the basic empty configuration
        (_ as any).config = {};
        (_ as any).api = { plugins: {}, profiles: {} };
        _.config.profiles = [];
        _.config.defaults = {};
        _.config.plugins = [];
        _.layers = [];
        _.schemas = _.schemas || {};
        _.home = _.home || path.join(require("os").homedir(), `.${app}`);
        _.paths = [];
        _.name = `${app}.config.json`;
        _.user = `${app}.config.user.json`;
        _.active = { user: false, global: false };

        ////////////////////////////////////////////////////////////////////////
        // Populate configuration file layers
        const home = require('os').homedir();
        const properties: IConfig = {
            profiles: [],
            defaults: {},
            plugins: []
        };

        // Find/create project user layer
        let user = Config.search(_.user, { stop: home });
        if (user == null)
            user = path.join(process.cwd(), _.user);
        _.paths.push(user);
        _.layers.push({ path: user, exists: false, properties, global: false, user: true });

        // Find/create project layer
        let project = Config.search(_.name, { stop: home });
        if (project == null)
            project = path.join(process.cwd(), _.name);
        _.paths.push(project);
        _.layers.push({ path: project, exists: false, properties, global: false, user: false });

        // create the user layer
        const usrGlbl = path.join(_.home, _.user);
        _.paths.push(usrGlbl);
        _.layers.push({ path: usrGlbl, exists: false, properties, global: true, user: true });

        // create the global layer
        const glbl = path.join(_.home, _.name);
        _.paths.push(glbl);
        _.layers.push({ path: glbl, exists: false, properties, global: true, user: false });

        ////////////////////////////////////////////////////////////////////////
        // Create the config and setup the APIs
        const config = new Config(_);

        // setup the API for profiles
        config._.api.profiles = {
            set: config.api_profiles_set.bind(config),
            get: config.api_profiles_get.bind(config),
            loadSecure: config.api_profiles_load_secure.bind(config),
            names: config.api_profiles_names.bind(config),
            exists: config.api_profiles_exists.bind(config),
            typeSet: config.api_profiles_type_set.bind(config),
            typeGet: config.api_profiles_type_get.bind(config),
            typeExists: config.api_profiles_type_exists.bind(config)
        };

        // setup the API for plugins
        config._.api.plugins = {
            get: config.api_plugins_get.bind(config),
            new: config.api_plugins_new.bind(config),
            append: null,
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
                layer.properties.profiles = layer.properties.profiles || [];
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
    // Profile APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private async api_profiles_load_secure() {
        // If the secure option is set - load the secure values for the profiles
        if (CredentialManagerFactory.initialized) {
            for (const layer of this._.layers) {
                for (const profile of layer.properties.profiles) {

                    // Load the secure fields at the root of the profile
                    for (const secure of profile.secure) {
                        const p = `${profile.name}.properties.${secure}`;
                        const value = await CredentialManagerFactory.manager.load(Config.secureKey(layer.path, p), true);
                        if (value != null) profile.properties[secure] = value;
                    }

                    // load the secure fields for each type
                    for (const type of profile.types) {
                        for (const secure of type.secure) {
                            const p = `${profile.name}.${type}.${type.name}.${secure}`;
                            const value = await CredentialManagerFactory.manager.load(Config.secureKey(layer.path, p), true);
                            if (value != null) profile.properties[secure] = value;
                        }
                    }
                }
            }
        }
        // merge into config
        this.layerMerge();
    }

    private api_profiles_names(): string[] {
        const names: string[] = [];
        this._.config.profiles.forEach(profile => names.push(profile.name));
        return names;
    }

    private api_profiles_type_exists(profile: string, type: string, name: string): boolean {
        for (const p of this._.config.profiles) {
            if (p.name === profile) {
                for (const t of p.types) if (t.type === type && t.name === name) return true;
                break;
            }
        }
        return false;
    }

    private api_profiles_exists(name: string): boolean {
        for (const p of this._.config.profiles)
            if (p.name === name) return true;
        return false;
    }

    private api_profiles_get(name: string, opts?: {active?: boolean}): IConfgProfile {
        opts = opts || {};
        if (!this.api_profiles_exists(name))
            return null;
        const profiles = (opts.active) ? this.layerActive().properties.profiles : this._.config.profiles;
        for (const profile of profiles)
            if (profile.name === name) return JSON.parse(JSON.stringify(profile));
        return null;
    }

    private api_profiles_type_get(profile: string, type: string, name: string): IConfigType {
        if (!this.api_profiles_exists(profile) || !this.api_profiles_type_exists(profile, type, name))
            return null;
        for (const t of this.api_profiles_get(profile).types) {
            if (t.name === name && t.type === type)
                return t;
        }
        return null;
    }

    private api_profiles_type_set(profile: string, type: string, name: string,
        properties: { [key: string]: string }, opts?: { secure?: string[] }): void {
        opts = opts || {};
        const layer = this.layerActive();
        const tmp: IConfgProfile = { types: [], secure: [], properties: {}, name: profile };

        if (!this.api_profiles_exists(profile)) {
            // Profile exist exists - create it and add to types
            tmp.types.push({ type, name, properties, secure: opts.secure || [] });
            layer.properties.profiles.push(tmp);
        }
        else {

            // The profile exists - find it
            for (const p of layer.properties.profiles) {
                if (p.name === profile) {

                    // find the type
                    for (const t of p.types) {

                        // If there is a match - set the properties
                        if (t.name === name && t.type === type) {
                            t.properties = properties;
                            t.secure = t.secure || opts.secure;
                            return;
                        }
                    }

                    // No match - push the new type
                    p.types.push({ name, type, properties, secure: opts.secure || [] });
                    return;
                }
            }
        }
    }

    private api_profiles_set(profile: IConfgProfile) {
        profile.properties = profile.properties || {};
        profile.secure = profile.secure || [];
        profile.types = profile.types || [];
        const layer = this.layerActive();
        let found = false;
        for (const i in layer.properties.profiles) {
            if (layer.properties.profiles[i].name === profile.name) {
                found = true;
                layer.properties.profiles[i] = profile;
            }
        }
        if (!found)
            layer.properties.profiles.push(profile);
        this.layerMerge();
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

    private static secureKey(cnfg: string, property: string): string {
        return cnfg + "_" + property;
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
        if (CredentialManagerFactory.initialized) {
            for (const profile of layer.properties.profiles) {

                // Secure the root level properties first
                for (const secure of profile.secure) {
                    const p = `${profile.name}.properties.${secure}`;
                    const v = JSON.stringify(profile.properties[secure]);
                    CredentialManagerFactory.manager.save(Config.secureKey(layer.path, p), v);
                    profile.properties[secure] = `managed by ${CredentialManagerFactory.manager.name}`;
                }

                // secure the properties for each type entry
                for (const type of profile.types) {
                    for (const secure of type.secure) {
                        const p = `${profile.name}.${type}.${type.name}.${secure}`;
                        const v = JSON.stringify(type.properties[secure]);
                        CredentialManagerFactory.manager.save(Config.secureKey(layer.path, p), v);
                        type.properties[secure] = `managed by ${CredentialManagerFactory.manager.name}`;
                    }
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
                this._.layers[i].properties.profiles = this._.layers[i].properties.profiles || [];
                this._.layers[i].properties.plugins = this._.layers[i].properties.plugins || [];
            }
        }
        this.layerMerge();
    }

    private layerMerge() {
        // clear the config as it currently stands
        this._.config.defaults = {};
        this._.config.profiles = [];
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
        const usrProject: IConfgProfile[] = JSON.parse(JSON.stringify(this._.layers[layers.project_user].properties.profiles));
        const project: IConfgProfile[] = JSON.parse(JSON.stringify(this._.layers[layers.project_config].properties.profiles));
        let p: IConfgProfile[] = [];
        for (const p1 of project) {
            let merged = false;
            // tslint:disable-next-line
            for (let p2 = 0; p2 < usrProject.length; p2++) {
                if (p1.name === usrProject[p2].name) {
                    p.push(deepmerge(p1, usrProject[p2]));
                    usrProject.splice(p2, 1);
                    merged = true;
                    break;
                }
            }

            // Add to the list if not merged
            if (!merged) p.push(p1);
        }

        // Add any remaining
        p = p.concat(usrProject);

        // Merge the global layer profiles together
        const usrGlobal = JSON.parse(JSON.stringify(this._.layers[layers.global_user].properties.profiles));
        const global = JSON.parse(JSON.stringify(this._.layers[layers.global_config].properties.profiles));
        let g: IConfgProfile[] = [];
        for (const g1 of global) {
            let merged = false;
            // tslint:disable-next-line
            for (let g2 = 0; g2 < usrGlobal.length; g2++) {
                if (g1.name === usrGlobal[g2].name) {
                    g.push(deepmerge(g1, usrGlobal[g2]));
                    usrGlobal.splice(g2, 1);
                    merged = true;
                    break;
                }
            }

            // Add to the list if not merged
            if (!merged) p.push(g1);
        }

        // Add any remaining
        g = g.concat(usrGlobal);

        // Merge to a final array - project takes precedence - if a global
        // profile doesn't exist in the project array - merge
        const all: IConfgProfile[] = p;
        for (const glbl of g) {
            let found = false;
            for (const user of p) {
                if (glbl.name === user.name) {
                    found = true;
                    break;
                }
            }
            if (!found) all.push(glbl);
        }

        // Set them in the config
        this._.config.profiles = all;
    }

    private layerActive(): IConfigLayer {
        for (const layer of this._.layers) {
            if (layer.user === this._.active.user && layer.global === this._.active.global)
                return layer;
        }
        throw new ImperativeError({ msg: `internal error: no active layer found` });
    }
}