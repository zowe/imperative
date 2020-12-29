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
import * as findUp from "find-up";
import * as JSONC from "comment-json";
import * as lodash from "lodash";

import { IConfig } from "./doc/IConfig";
import { IConfigLayer } from "./doc/IConfigLayer";
import { ImperativeError } from "../../error";
import { IConfigProfile } from "./doc/IConfigProfile";
import { IConfigOpts } from "./doc/IConfigOpts";
import { IConfigSecure, IConfigSecureProperties } from "./doc/IConfigSecure";
import { IConfigVault } from "./doc/IConfigVault";
import { Logger } from "../../logger";
import { IConfigLoadedProfile, IConfigLoadedProperty } from "./doc/IConfigLoadedProfile";

enum layers {
    project_user = 0,
    project_config,
    global_user,
    global_config
};

export class Config {
    private static readonly SECURE_ACCT = "secure_config_props";

    private _app: string;
    private _paths: string[];
    private _layers: IConfigLayer[];
    private _home: string;
    private _name: string;
    private _user: string;
    private _schema: string;
    private _active: {
        user: boolean;
        global: boolean
    };
    private _vault: IConfigVault;
    private _secure: IConfigSecure;

    private constructor() { }

    public static readonly INDENT: number = 4;

    public static empty(): IConfig {
        return {
            profiles: {},
            defaults: {},
            plugins: [],
            secure: []
        };
    }

    public static async load(app: string, opts?: IConfigOpts): Promise<Config> {
        opts = opts || {};

        ////////////////////////////////////////////////////////////////////////
        // Create the basic empty configuration
        const _ = new Config();
        (_ as any).config = {};
        _._layers = [];
        _._home = opts.homeDir || node_path.join(require("os").homedir(), `.${app}`);
        _._paths = [];
        _._name = `${app}.config.json`;
        _._user = `${app}.config.user.json`;
        _._schema = `${app}.schema.json`;
        _._active = { user: false, global: false };
        _._app = app;
        _._vault = opts.vault;
        _._secure = { configs: {} };

        ////////////////////////////////////////////////////////////////////////
        // Populate configuration file layers
        const home = require("os").homedir();

        // Find/create project user layer
        let user = Config.search(_._user, { stop: home, gbl: _._home });
        if (user == null)
            user = node_path.join(process.cwd(), _._user);
        _._paths.push(user);
        _._layers.push({ path: user, exists: false, properties: Config.empty(), global: false, user: true });

        // Find/create project layer
        let project = Config.search(_._name, { stop: home, gbl: _._home });
        if (project == null)
            project = node_path.join(process.cwd(), _._name);
        _._paths.push(project);
        _._layers.push({ path: project, exists: false, properties: Config.empty(), global: false, user: false });

        // create the user layer
        const usrGlbl = node_path.join(_._home, _._user);
        _._paths.push(usrGlbl);
        _._layers.push({ path: usrGlbl, exists: false, properties: Config.empty(), global: true, user: true });

        // create the global layer
        const glbl = node_path.join(_._home, _._name);
        _._paths.push(glbl);
        _._layers.push({ path: glbl, exists: false, properties: Config.empty(), global: true, user: false });

        ////////////////////////////////////////////////////////////////////////
        // Read and populate each configuration layer
        try {
            let setActive = true;
            _._layers.forEach((layer: IConfigLayer) => {
                // Attempt to populate the layer
                if (fs.existsSync(layer.path)) {
                    try {
                        layer.properties = JSONC.parse(fs.readFileSync(layer.path).toString());
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
                layer.properties.defaults = layer.properties.defaults || {};
                layer.properties.profiles = layer.properties.profiles || {};
                layer.properties.plugins = layer.properties.plugins || [];
                layer.properties.secure = layer.properties.secure || [];
            });
        } catch (e) {
            throw new ImperativeError({ msg: `error reading config file: ${e.message}` });
        }

        ////////////////////////////////////////////////////////////////////////
        // load secure fields
        try {
            await _.secureLoad();
        } catch (err) {
            // Secure vault is optional since we can prompt for values instead
            Logger.getImperativeLogger().warn(`Secure vault not enabled. Reason: ${err.message}`);
        }

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

                // TODO: If asked for inner layer profile, if profile doesn't exist, returns outer layer profile values (bug?)
                public get(path: string): { [key: string]: string } {
                    return Config.buildProfile(path, JSONC.parse(JSONC.stringify(outer.properties.profiles)));
                }

                public exists(path: string): boolean {
                    return (Config.findProfile(path, outer.properties.profiles) != null);
                }

                public load(path: string): IConfigLoadedProfile {
                    return outer.loadProfile(this.expandPath(path));
                }

                public defaultSet(key: string, value: string) {
                    outer.layerActive().properties.defaults[key] = value;
                }

                public defaultGet(key: string): { [key: string]: string } {
                    const dflt = outer.properties.defaults[key];
                    if (dflt == null || !this.exists(dflt))
                        return null;
                    return this.get(dflt);
                }

                public expandPath(shortPath: string): string {
                    return shortPath.replace(/(^|\.)/g, "$1profiles.");
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
                    const layer: IConfigLayer = JSONC.parse(JSONC.stringify(outer.layerActive()));
                    if (layer.properties.secure != null) {
                        for (const path of layer.properties.secure) {
                            const segments = path.split(".");
                            let obj: any = layer.properties;
                            for (let x = 0; x < segments.length; x++) {
                                const segment = segments[x];
                                const v = obj[segment];
                                if (v == null) break;
                                if (x === segments.length - 1) {
                                    delete obj[segment];
                                    break;
                                }
                                obj = obj[segment];
                            }
                        }
                    }

                    // Write the layer
                    try {
                        fs.writeFileSync(layer.path, JSONC.stringify(layer.properties, null, Config.INDENT));
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
                    // Note: Add indentation to allow comments to be accessed via config.api.layers.get(), otherwise use layerActive()
                    // return JSONC.parse(JSONC.stringify(outer.layerActive(), null, Config.INDENT));
                    return JSONC.parse(JSONC.stringify(outer.layerActive()));
                }

                public set(cnfg: IConfig) {
                    for (const i in outer._layers) {
                        if (outer._layers[i].user === outer._active.user &&
                            outer._layers[i].global === outer._active.global) {
                            outer._layers[i].properties = cnfg;
                            outer._layers[i].properties.defaults = outer._layers[i].properties.defaults || {};
                            outer._layers[i].properties.profiles = outer._layers[i].properties.profiles || {};
                            outer._layers[i].properties.plugins = outer._layers[i].properties.plugins || [];
                            outer._layers[i].properties.secure = outer._layers[i].properties.secure || [];
                        }
                    }
                }

                public merge(cnfg: IConfig) {
                    const layer = outer.layerActive();
                    layer.properties.profiles = deepmerge(cnfg.profiles, layer.properties.profiles);
                    layer.properties.defaults = deepmerge(cnfg.defaults, layer.properties.defaults);
                    for (const pluginName of cnfg.plugins) {
                        if (!layer.properties.plugins.includes(pluginName)) {
                            layer.properties.plugins.push(pluginName);
                        }
                    }
                    for (const propPath of cnfg.secure) {
                        if (!layer.properties.secure.includes(propPath)) {
                            layer.properties.secure.push(propPath);
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
        return this._paths;
    }

    public get layers(): IConfigLayer[] {
        return JSONC.parse(JSONC.stringify(this._layers));
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

        if (opts.secure) {
            if (!layer.properties.secure.includes(path))
                layer.properties.secure.push(path);
        } else if (opts.secure != null) {
            const propIndex = layer.properties.secure.indexOf(path);
            if (propIndex !== -1) {
                layer.properties.secure.splice(propIndex, 1);
            }
        }
    }

    public delete(path: string, opts?: { secure?: boolean }) {
        opts = opts || {};

        const layer = this.layerActive();
        lodash.unset(layer.properties, path);

        if (opts.secure !== false) {
            const propIndex = layer.properties.secure.indexOf(path);
            if (propIndex !== -1) {
                layer.properties.secure.splice(propIndex, 1);
            }
        }
    }

    /**
     * Sets the $schema value at the top of the config JSONC, and saves the
     * schema to disk if an object is provided.
     * @param schema The URI of JSON schema, or a schema object to use
     */
    public setSchema(schema: string | object) {
        const schemaUri = (typeof schema === "string") ? schema : `./${this._schema}`;
        const schemaObj = (typeof schema !== "string") ? schema : null;

        const layer = this.layerActive();
        delete layer.properties.$schema;
        layer.properties = { $schema: schemaUri, ...layer.properties };

        if (schemaObj != null) {
            const filePath = node_path.resolve(node_path.dirname(layer.path), schemaUri);
            fs.writeFileSync(filePath, JSONC.stringify(schemaObj, null, Config.INDENT));
        }
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
        const c = Config.empty();

        // merge each layer
        this._layers.forEach((layer: IConfigLayer) => {

            // Merge "plugins" - create a unique set from all entries
            c.plugins = Array.from(new Set(layer.properties.plugins.concat(c.plugins)));

            // Merge "defaults" - only add new properties from this layer
            for (const [name, value] of Object.entries(layer.properties.defaults))
                c.defaults[name] = c.defaults[name] || value;
        });

        // Merge the project layer profiles
        const usrProject = JSONC.parse(JSONC.stringify(this._layers[layers.project_user].properties.profiles));
        const project = JSONC.parse(JSONC.stringify(this._layers[layers.project_config].properties.profiles));
        const proj: { [key: string]: IConfigProfile } = deepmerge(project, usrProject);

        // Merge the global layer profiles
        const usrGlobal = JSONC.parse(JSONC.stringify(this._layers[layers.global_user].properties.profiles));
        const global = JSONC.parse(JSONC.stringify(this._layers[layers.global_config].properties.profiles));
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
        for (const layer of (this._layers || [])) {
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

        // load the secure fields
        const s: string = await this._vault.load(Config.SECURE_ACCT);
        if (s == null) return;
        this._secure.configs = JSONC.parse(s);

        // populate each layers properties
        for (const layer of this._layers) {

            // Find the matching layer
            for (const [filePath, secureProps] of Object.entries(this._secure.configs)) {
                if (filePath === layer.path) {

                    // Only set those indicated by the config
                    for (const p of layer.properties.secure) {

                        // Extract and set secure properties
                        for (const [sPath, sValue] of Object.entries(secureProps)) {
                            if (sPath === p) {
                                const segments = sPath.split(".");
                                let obj: any = layer.properties;
                                for (let x = 0; x < segments.length; x++) {
                                    const segment = segments[x];
                                    if (x === segments.length - 1) {
                                        obj[segment] = sValue;
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
        const beforeLen = Object.keys(this._secure.configs).length;

        // Build the entries for each layer
        for (const layer of this._layers) {

            // Create all the secure property entries
            const sp: IConfigSecureProperties = {};
            for (const path of layer.properties.secure) {
                const segments = path.split(".");
                let obj: any = layer.properties;
                for (let x = 0; x < segments.length; x++) {
                    const segment = segments[x];
                    const value = obj[segment];
                    if (value == null) break;
                    if (x === segments.length - 1) {
                        sp[path] = value;
                        break;
                    }
                    obj = obj[segment];
                }
            }

            // Clear the entry and rebuild it
            delete this._secure.configs[layer.path];

            // Create the entry to set the secure properties
            if (Object.keys(sp).length > 0) {
                this._secure.configs[layer.path] = sp;
            }
        }

        // Save the entries if needed
        if (Object.keys(this._secure.configs).length > 0 || beforeLen > 0 ) {
            await this._vault.save(Config.SECURE_ACCT, JSONC.stringify(this._secure.configs));
        }
    }

    // TODO Does this need to recurse up through nested profiles?
    private loadProfile(path: string): IConfigLoadedProfile {
        const profile = lodash.get(this.properties, path);
        if (profile == null) {
            return null;
        }

        const loadedProfile = require("lodash-deep").deepMapValues(profile, (value: any, p: string) => {
            if (p.includes("properties.")) {
                for (const layer of this._layers) {
                    const propertyPath = `${path}.${p}`;
                    if (lodash.get(layer.properties, propertyPath) != null) {
                        const property: IConfigLoadedProperty = {
                            value,
                            secure: layer.properties.secure.includes(propertyPath),
                            user: layer.user,
                            global: layer.global
                        };
                        return property;
                    }
                }
            }
            return value;
        });

        for (const layer of this._layers) {
            for (const secureProp of layer.properties.secure) {
                if (secureProp.startsWith(`${path}.`)) {
                    const subpath = secureProp.slice(path.length + 1);
                    if (lodash.get(loadedProfile, subpath) == null) {
                        lodash.set(loadedProfile, subpath, { secure: true, user: layer.user, global: layer.global });
                    }
                }
            }
        }

        return loadedProfile;
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    // Static Utilities
    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    public static search(file: string, opts?: any): string {
        opts = opts || {};
        if (opts.stop) opts.stop = node_path.resolve(opts.stop);
        if (opts.gbl) opts.gbl = node_path.resolve(opts.gbl);
        const p = findUp.sync((directory: string) => {
            if (directory === opts.stop) return findUp.stop;
            if (directory === opts.gbl) return;
            return fs.existsSync(node_path.join(directory, file)) && directory;
        }, { type: "directory" });
        return p ? node_path.join(p, file) : null;
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
