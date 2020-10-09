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
        _.config.profiles = {};
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
            profiles: {},
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
            names: config.api_profiles_names.bind(config),
            exists: config.api_profiles_exists.bind(config),
            typeExists: config.api_profiles_type_exists.bind(config),
            typeNames: config.api_profiles_type_names.bind(config),
            typeProfileNames: config.api_profiles_type_profile_names.bind(config),
            typeProfileSet: config.api_profiles_type_profile_set.bind(config),
            typeProfileGet: config.api_profiles_type_profile_get.bind(config),
            typeProfileExists: config.api_profiles_type_profile_exists.bind(config),
            typeDefaultGet: config.api_profiles_type_default_get.bind(config),
            typeDefaultSet: config.api_profiles_type_default_set.bind(config)
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
            set: config.api_defaults_set.bind(config)
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
        if (!this.api_profiles_exists(dflt))
            return null;
        return { name: dflt, profile: this.api_profiles_get(dflt) };
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Profile APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private api_profiles_type_names(profile: string): string[] {
        if (!this.api_profiles_exists(profile))
            return null;
        return Object.keys(this._.config.profiles[profile].types);
    }

    private api_profiles_type_default_set(profile: string, type: string, name: string) {
        if (this.api_profiles_type_profile_exists(profile, type, name))
            this._.config.profiles[profile].defaults[type] = name;
    }

    private api_profiles_type_default_get(profile: string, type: string): { name: string, profile: IConfigType } {
        if (!this.api_profiles_type_exists(profile, type))
            return null;
        const dflt = this._.config.profiles[profile].defaults[type];
        if (!this.api_profiles_type_profile_exists(profile, type, dflt))
            return null;
        return { name: dflt, profile: this.api_profiles_type_profile_get(profile, type, dflt) }
    }

    private api_profiles_type_profile_names(profile: string, type: string): string[] {
        if (!this.api_profiles_type_exists(profile, type))
            return null;
        return Object.keys(this._.config.profiles[profile].types[type]);
    }

    private api_profiles_names(): string[] {
        return Object.keys(this._.config.profiles);
    }

    private api_profiles_type_exists(profile: string, type: string): boolean {
        if (!this.api_profiles_exists(profile)) return false
        return !(this._.config.profiles[profile].types[type] == null)
    }

    private api_profiles_type_profile_exists(profile: string, type: string, name: string): boolean {
        // Look for matching profile name
        for (const [n, p] of Object.entries(this._.config.profiles)) {
            if (n === profile) {

                // Look for matching type name
                for (const [tn, tp] of Object.entries(p.types)) {
                    if (tn === type) {

                        // Look for matching type profile name
                        for (const [pn, pc] of Object.entries(tp)) {
                            if (pn === name) return true;
                        }
                        break;
                    }
                }
                break;
            }
        }
        return false;
    }

    private api_profiles_exists(name: string): boolean {
        // Look for matching profile name
        for (const [n, p] of Object.entries(this._.config.profiles))
            if (n === name) return true;
        return false;
    }

    private api_profiles_get(name: string, opts?: { active?: boolean }): IConfgProfile {
        opts = opts || {};
        if (!this.api_profiles_exists(name))
            return null;
        const profiles = (opts.active) ? this.layerActive().properties.profiles : this._.config.profiles;
        for (const [n, p] of Object.entries(profiles))
            if (n === name) return JSON.parse(JSON.stringify(p));
        return null;
    }

    private api_profiles_type_profile_get(profile: string, type: string, name: string): IConfigType {
        if (!this.api_profiles_type_profile_exists(profile, type, name))
            return null;
        for (const [n, p] of Object.entries(this._.config.profiles)) {
            if (n === profile) {

                // Look for matching type name
                for (const [tn, tp] of Object.entries(p.types)) {
                    if (tn === type) {

                        // Look for matching type profile name
                        for (const [pn, pc] of Object.entries(tp))
                            if (pn === name) return JSON.parse(JSON.stringify(pc));
                        break;
                    }
                }
                break;
            }
        }
        return null;
    }

    private api_profiles_type_profile_set(profile: string, type: string, name: string, properties: IConfigType): void {
        const layer = this.layerActive();

        // Create the profile if needed
        if (!this.api_profiles_exists(profile))
            layer.properties.profiles[profile] = { secure: [], properties: {}, types: {} };

        // Create the profile type if needed
        if (!this.api_profiles_type_exists(profile, type)) {
            layer.properties.profiles[profile].types = {};
            layer.properties.profiles[profile].types[type] = {};
        }

        // Set the profile
        layer.properties.profiles[profile].types[type][name] = properties;
        this.layerMerge();
    }

    private api_profiles_set(name: string, profile: IConfgProfile) {
        profile.properties = profile.properties || {};
        profile.types = profile.types || {};
        profile.secure = profile.secure || [];
        const layer = this.layerActive();
        layer.properties.profiles[name] = profile;
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
    // Manipulate properties
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    // TODO: more validation
    public set(property: string, value: any, opts?: { secure?: boolean, append?: boolean }) {
        opts = opts || {};

        // TODO: additional validations
        if (property.startsWith("group") && !Array.isArray(value))
            throw new ImperativeError({ msg: `group property must be an array` });

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
                if (opts.append) {
                    if (!Array.isArray(obj[segment]))
                        throw new ImperativeError({ msg: `property ${property} is not an array` });
                    obj[segment].push(value);
                } else {
                    obj[segment] = value;
                }
            } else {
                obj = obj[segment];
            }
        });

        // TODO: more validation
        if (segments[0] === "profiles" && segments[2] === "properties") {
            const name = segments[1];
            layer.properties.profiles[name].secure =
                layer.properties.profiles[name].secure || [];
            layer.properties.profiles[name].secure =
                Array.from(new Set(layer.properties.profiles[name].secure.concat(segments[3])));
        } else if (segments[0] === "profiles" && segments[2] === "types") {
            const name = segments[1];
            const type = segments[3];
            const tname = segments[4];
            layer.properties.profiles[name].types[type][tname].secure =
                layer.properties.profiles[name].types[type][tname].secure || [];
            layer.properties.profiles[name].types[type][tname].secure =
                Array.from(new Set(layer.properties.profiles[name].types[type][tname].secure.concat(segments[5])));
        }

        this.layerMerge();
    }

    public async loadSecure() {
        // If the secure option is set - load the secure values for the profiles
        if (CredentialManagerFactory.initialized) {
            for (const layer of this._.layers) {
                for (const [name, profile] of Object.entries(layer.properties.profiles)) {

                    // Load the secure fields at the root of the profile
                    for (const secure of profile.secure) {
                        const p = `${name}.properties.${secure}`;
                        const value = await CredentialManagerFactory.manager.load(Config.secureKey(layer.path, p), true);
                        if (value != null) profile.properties[secure] = JSON.parse(value);
                    }

                    // load the secure fields for each type
                    for (const [tname, types] of Object.entries(profile.types)) {
                        for (const [ptname, tprofile] of Object.entries(types)) {
                            for (const secure of tprofile.secure) {
                                const p = `${name}.${tname}.${ptname}.${secure}`;
                                const value = await CredentialManagerFactory.manager.load(Config.secureKey(layer.path, p), true);
                                if (value != null) profile.properties[secure] = JSON.parse(value);
                            }
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
        if (CredentialManagerFactory.initialized) {

            for (const [n, p] of Object.entries(layer.properties.profiles)) {
                // Secure the root level properties first
                for (const secure of p.secure) {
                    const s = `${n}.properties.${secure}`;
                    const v = JSON.stringify(p.properties[secure]);
                    CredentialManagerFactory.manager.save(Config.secureKey(layer.path, s), v);
                    p.properties[secure] = `managed by ${CredentialManagerFactory.manager.name}`;
                }

                // Look for matching type name
                for (const [tn, tp] of Object.entries(p.types)) {

                    // Look for matching type profile name
                    for (const [pn, pc] of Object.entries(tp)) {
                        for (const secure of pc.secure) {
                            const s = `${n}.${tn}.${pn}.${secure}`;
                            const v = JSON.stringify(pc.properties[secure]);
                            CredentialManagerFactory.manager.save(Config.secureKey(layer.path, s), v);
                            pc.properties[secure] = `managed by ${CredentialManagerFactory.manager.name}`;
                        }
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
            else {

                // Traverse types
                for (const [tn, tp] of Object.entries(p.types)) {
                    if (this._.config.profiles[n].types[tn] == null)
                        this._.config.profiles[n].types[tn] = tp;
                    else {

                        // Traverse profiles
                        for (const [pn, pc] of Object.entries(tp)) {
                            if (this._.config.profiles[n].types[tn][pn] == null)
                                this._.config.profiles[n].types[tn][pn] = pc;
                        }
                    }
                }
            }
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