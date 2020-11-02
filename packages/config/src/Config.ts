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

import * as node_path from "path";
import * as fs from "fs";
import * as deepmerge from "deepmerge";

import { IConfig } from "./doc/IConfig";
import { IConfigLayer } from "./doc/IConfigLayer";
import { ImperativeError } from "../../error";
import { IConfigProfile } from "./doc/IConfigProfile";
import { IConfigVault } from "./doc/IConfigVault";
import { IConfigOpts } from "./doc/IConfigOpts";
import { IConfigSecure, IConfigSecureEntry, IConfigSecureProperty } from "./doc/IConfigSecure";

enum layers {
    project_user = 0,
    project_config,
    global_user,
    global_config
};

export class Config {
    private static readonly IDENT: number = 4;

    private _app: string;
    private _paths: string[];
    private _layers: IConfigLayer[];
    private _home: string;
    private _name: string;
    private _user: string;
    private _active: {
        user: boolean;
        global: boolean
    };
    private _vault: IConfigVault;
    private _secure: IConfigSecure;

    private constructor() { }

    public static async load(app: string, opts?: IConfigOpts): Promise<Config> {
        opts = opts || {};

        ////////////////////////////////////////////////////////////////////////
        // Create the basic empty configuration
        const _ = new Config();
        (_ as any).config = {};
        _._layers = [];
        _._home = node_path.join(require("os").homedir(), `.${app}`);
        _._paths = [];
        _._name = `${app}.config.json`;
        _._user = `${app}.config.user.json`;
        _._active = { user: false, global: false };
        _._app = app;
        _._vault = opts.vault;
        _._secure = { configs: [] };

        ////////////////////////////////////////////////////////////////////////
        // Populate configuration file layers
        const home = require('os').homedir();
        const properties: IConfig = {
            profiles: {},
            active: [],
            plugins: [],
            secure: []
        };

        // Find/create project user layer
        let user = Config.search(_._user, { stop: home });
        if (user == null)
            user = node_path.join(process.cwd(), _._user);
        _._paths.push(user);
        _._layers.push({ path: user, exists: false, properties, global: false, user: true });

        // Find/create project layer
        let project = Config.search(_._name, { stop: home });
        if (project == null)
            project = node_path.join(process.cwd(), _._name);
        _._paths.push(project);
        _._layers.push({ path: project, exists: false, properties, global: false, user: false });

        // create the user layer
        const usrGlbl = node_path.join(_._home, _._user);
        _._paths.push(usrGlbl);
        _._layers.push({ path: usrGlbl, exists: false, properties, global: true, user: true });

        // create the global layer
        const glbl = node_path.join(_._home, _._name);
        _._paths.push(glbl);
        _._layers.push({ path: glbl, exists: false, properties, global: true, user: false });

        ////////////////////////////////////////////////////////////////////////
        // Read and populate each configuration layer
        try {
            let setActive = true;
            _._layers.forEach((layer: IConfigLayer) => {
                // Attempt to popluate the layer
                if (fs.existsSync(layer.path)) {
                    try {
                        layer.properties = JSON.parse(fs.readFileSync(layer.path).toString());
                        layer.exists = true;
                    } catch (e) {
                        throw new ImperativeError({ msg: `${layer.path}: ${e.message}` });
                    }
                }

                // Find the active layer
                if (setActive && layer.exists) {
                    _._active.user = layer.user;
                    _._active.global = layer.global;
                    setActive = false;
                }

                // Populate any undefined defaults
                layer.properties.active = layer.properties.active || [];
                layer.properties.profiles = layer.properties.profiles || {};
                layer.properties.plugins = layer.properties.plugins || [];
                layer.properties.secure = layer.properties.secure || [];
            });
        } catch (e) {
            throw new ImperativeError({ msg: `error reading config file: ${e.message}` });
        }

        ////////////////////////////////////////////////////////////////////////
        // load secure fields
        await _.secureLoad();

        ////////////////////////////////////////////////////////////////////////
        // Complete
        return _;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // APIs
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    get api() {
        // tslint:disable-next-line
        const outer = this;

        return new class {

            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////
            // Profiles API
            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////

            // tslint:disable-next-line
            public profiles = new class {

                public set(path: string, profile: IConfigProfile): void {
                    profile.properties = profile.properties || {};
                    const layer = outer.layerActive();
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
                }

                public get(path: string): { [key: string]: string } {
                    // find the layer where the profile exists and apply the
                    // active values from that layer.
                    let active = {};
                    for (let l = layers.project_user; l <= layers.global_config; l++) {
                        if (Config.findProfile(path, outer._layers[l].properties.profiles) != null) {
                            const i1 = (l > layers.project_config) ? layers.global_user : layers.project_user;
                            const i2 = (l > layers.project_config) ? layers.global_config : layers.project_config;
                            const aArr = outer._layers[i1].properties.active.concat(outer._layers[i2].properties.active);
                            aArr.forEach((a) => {
                                const p1 = Config.buildProfile(a, outer._layers[i1].properties.profiles);
                                const p2 = Config.buildProfile(a, outer._layers[i2].properties.profiles);
                                const merged = deepmerge(p2, p1);
                                active = deepmerge(merged, active);
                            });
                        }
                    }

                    // build the profile and merge with any active properties
                    let p = Config.buildProfile(path, JSON.parse(JSON.stringify(outer.properties.profiles)));
                    p = deepmerge(active, p);
                    p = deepmerge(this.active(), p);
                    return p;
                }

                public exists(path: string): boolean {
                    return (Config.findProfile(path, outer.properties.profiles) != null);
                }

                public active(): { [key: string]: string } {
                    let active: { [key: string]: string } = {};

                    // Merge together the active profiles at the project layer
                    const projActive = outer._layers[layers.project_user].properties.active
                        .concat(outer._layers[layers.project_config].properties.active);
                    projActive.forEach((pActive) => {
                        const p1 = Config.buildProfile(pActive, outer._layers[layers.project_user].properties.profiles);
                        const p2 = Config.buildProfile(pActive, outer._layers[layers.project_config].properties.profiles);
                        const merged = deepmerge(p2, p1);
                        active = deepmerge(merged, active);
                    });

                    // Merge together the active profiles at the global layer
                    const glblActive = outer._layers[layers.global_user].properties.active
                        .concat(outer._layers[layers.global_config].properties.active);
                    glblActive.forEach((gActive) => {
                        const p1 = Config.buildProfile(gActive, outer._layers[layers.global_user].properties.profiles);
                        const p2 = Config.buildProfile(gActive, outer._layers[layers.global_config].properties.profiles);
                        const merged = deepmerge(p2, p1);
                        active = deepmerge(merged, active);
                    });

                    return active;
                }

            }(); // end of profiles inner class


            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////
            // Plugins API
            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////

            // tslint:disable-next-line
            public plugins = new class {

                public get(): string[] {
                    return outer.properties.plugins;
                }
            }(); // end of plugins inner class

            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////
            // Layers API
            ////////////////////////////////////////////////////////////////////
            ////////////////////////////////////////////////////////////////////

            // tslint:disable-next-line
            public layers = new class {

                public async write() {
                    // TODO: should we prevent a write if there is no vault
                    // TODO: specified and there are secure fields??

                    // Save the secure fields in the credential vault
                    await outer.secureSave();

                    // If fields are marked as secure
                    const layer: IConfigLayer = JSON.parse(JSON.stringify(outer.layerActive()));
                    if (layer.properties.secure != null) {
                        for (const path of layer.properties.secure) {
                            const segments = path.split(".");
                            let obj: any = layer.properties;
                            for (let x = 0; x < segments.length; x++) {
                                const segment = segments[x];
                                const v = obj[segment];
                                if (v == null) break;
                                if (x === segments.length - 1) {
                                    obj[segment] = `managed by ${outer._vault.name}`;
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

                public activate(user: boolean, global: boolean) {
                    outer._active.user = user;
                    outer._active.global = global;
                }

                public get(): IConfigLayer {
                    return JSON.parse(JSON.stringify(outer.layerActive()));
                }

                public set(cnfg: IConfig) {
                    for (const i in outer._layers) {
                        if (outer._layers[i].user === outer._active.user &&
                            outer._layers[i].global === outer._active.global) {
                            outer._layers[i].properties = cnfg;
                            outer._layers[i].properties.active = outer._layers[i].properties.active || [];
                            outer._layers[i].properties.profiles = outer._layers[i].properties.profiles || {};
                            outer._layers[i].properties.plugins = outer._layers[i].properties.plugins || [];
                            outer._layers[i].properties.secure = outer._layers[i].properties.secure || [];
                        }
                    }
                }
            }(); // end of layers inner class

        }(); // end of api inner class
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Accessors
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    public get exists(): boolean {
        for (const layer of this._layers)
            if (layer.exists) return true;
        return false;
    }

    public get paths(): string[] {
        return this._paths
    }

    public get layers(): IConfigLayer[] {
        return JSON.parse(JSON.stringify(this._layers));
    }

    public get properties(): IConfig {
        return this.layerMerge();
    }

    public get app(): string {
        return this._app;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Generic Property Manipulation
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    // TODO: more validation
    public set(path: string, value: any, opts?: { secure?: boolean }) {
        opts = opts || {};

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
                if (Array.isArray(obj[segment])) {
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
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Layer Utilities
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private layerMerge(): IConfig {
        // config starting point
        // NOTE: "properties" and "secure" only apply to the individual layers
        // NOTE: they will be blank for the merged config
        const c: IConfig = {
            profiles: {},
            plugins: [],
            secure: [],
            active: []
        };

        // merge each layer
        this._layers.forEach((layer: IConfigLayer) => {

            // Merge "plugins" - create a unique set from all entires
            c.plugins = Array.from(new Set(layer.properties.plugins.concat(c.plugins)));

            // Concat all active profiles
            c.active = c.active.concat(layer.properties.active);
        });

        // Merge the project layer profiles
        const usrProject = JSON.parse(JSON.stringify(this._layers[layers.project_user].properties.profiles));
        const project = JSON.parse(JSON.stringify(this._layers[layers.project_config].properties.profiles));
        const proj: { [key: string]: IConfigProfile } = deepmerge(project, usrProject);

        // Merge the global layer profiles
        const usrGlobal = JSON.parse(JSON.stringify(this._layers[layers.global_user].properties.profiles));
        const global = JSON.parse(JSON.stringify(this._layers[layers.global_config].properties.profiles));
        const glbl: { [key: string]: IConfigProfile } = deepmerge(global, usrGlobal);

        // Traverse all the global profiles merging any missing from project profiles
        c.profiles = proj;
        for (const [n, p] of Object.entries(glbl)) {
            if (c.profiles[n] == null)
                c.profiles[n] = p;
        }

        return c;
    }

    private layerActive(): IConfigLayer {
        for (const layer of this._layers) {
            if (layer.user === this._active.user && layer.global === this._active.global)
                return layer;
        }
        throw new ImperativeError({ msg: `internal error: no active layer found` });
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Secure Utilities
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    private async secureLoad() {
        if (this._vault == null) return;
        if (!this.secureFields()) return;

        // load the secure fields
        const s: string = await this._vault.load(Config.secureKey(this._app));
        if (s == null) return;
        this._secure = JSON.parse(s);

        // populate each layers properties
        for (const layer of this._layers) {

            // Find the matching layer
            for (const sCnfg of this._secure.configs) {
                if (sCnfg.path === layer.path) {

                    // Only set those indicated by the config
                    for (const p of layer.properties.secure) {

                        // Extract and set secure properties
                        for (const sp of sCnfg.properties) {
                            if (sp.path === p) {
                                const segments = sp.path.split(".");
                                let obj: any = layer.properties;
                                for (let x = 0; x < segments.length; x++) {
                                    const segment = segments[x];
                                    if (x === segments.length - 1) {
                                        obj[segment] = sp.value;
                                        break;
                                    }
                                    obj = obj[segment];
                                    if (obj == null) break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private async secureSave() {
        if (this._vault == null) return;
        if (!this.secureFields()) return;

        // Build the entries for each layer
        for (const layer of this._layers) {

            // Create all the secure property entries
            const sp: IConfigSecureProperty[] = [];
            for (const path of layer.properties.secure) {
                const segments = path.split(".");
                let obj: any = layer.properties;
                for (let x = 0; x < segments.length; x++) {
                    const segment = segments[x];
                    const value = obj[segment];
                    if (value == null) break;
                    if (x === segments.length - 1) {
                        sp.push({ path, value });
                        break;
                    }
                    obj = obj[segment];
                }
            }

            // Attempt to locate an existing entry
            let sCnfgEntry: IConfigSecureEntry;
            for (const sCnfg of this._secure.configs) {
                if (sCnfg.path === layer.path) {
                    sCnfgEntry = sCnfg;
                    break;
                }
            }

            // If it exists, set the secure properties,
            // otherwise create the entry
            if (sCnfgEntry != null)
                sCnfgEntry.properties = sp;
            else {
                this._secure.configs.push({
                    path: layer.path,
                    properties: sp
                });
            }
        }

        // Save the entries if needed
        if (this._secure.configs.length > 0)
            await this._vault.save(Config.secureKey(this._app), JSON.stringify(this._secure));
    }

    private secureFields(): boolean {
        for (const l of this.layers)
            if (l.properties.secure.length > 0)
                return true;
        return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Static Utilities
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

    private static secureKey(app: string): string {
        return app + "_config";
    }

    private static buildProfile(path: string, profiles: { [key: string]: IConfigProfile }): { [key: string]: string } {
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

    private static findProfile(path: string, profiles: { [key: string]: IConfigProfile }): IConfigProfile {
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
}