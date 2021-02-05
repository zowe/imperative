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
import * as os from "os";
import * as fs from "fs";
import * as deepmerge from "deepmerge";
import * as findUp from "find-up";
import * as JSONC from "comment-json";
import * as lodash from "lodash";

import { ConfigConstants } from "./ConfigConstants";
import { IConfig } from "./doc/IConfig";
import { IConfigLayer } from "./doc/IConfigLayer";
import { ImperativeError } from "../../error";
import { IConfigProfile } from "./doc/IConfigProfile";
import { IConfigOpts } from "./doc/IConfigOpts";
import { IConfigSecure } from "./doc/IConfigSecure";
import { IConfigVault } from "./doc/IConfigVault";
import { ConfigLayers, ConfigPlugins, ConfigProfiles, ConfigSecure } from "./api";

/**
 * Enum used by Config class to maintain order of config layers
 */
enum Layers {
    ProjectUser = 0,
    ProjectConfig,
    GlobalUser,
    GlobalConfig
};

export class Config {
    /**
     * The trailing portion of a shared config file name
     */
    private static readonly END_OF_TEAM_CONFIG = ".config.json";

    /**
     * The trailing portion of a user-specific config file name
     */
    private static readonly END_OF_USER_CONFIG = ".config.user.json";

    /**
     * App name used in config filenames (e.g., *my_cli*.config.json)
     * @internal
     */
    public _app: string;

    /**
     * List to store each of the config layers enumerated in `layers` enum
     * @internal
     */
    public _layers: IConfigLayer[];

    /**
     * Directory where global config files are located. Defaults to `~/.appName`.
     * @internal
     */
    public _home: string;

    /**
     * Currently active layer whose properties will be manipulated
     * @internal
     */
    public _active: {
        user: boolean;
        global: boolean
    };

    /**
     * Vault object with methods for loading and saving secure credentials
     * @internal
     */
    public _vault: IConfigVault;

    /**
     * Secure properties object stored in credential vault
     * @internal
     */
    public _secure: IConfigSecure;

    // _______________________________________________________________________
    /**
     * Constructor for Config class. Don't use this directly. Await `Config.load` instead.
     * @param opts Options to control how Config class behaves
     * @private
     */
    private constructor(public opts?: IConfigOpts) { }

    // _______________________________________________________________________
    /**
     * Return a Config interface with required fields initialized as empty.
     */
    public static empty(): IConfig {
        return {
            profiles: {},
            defaults: {},
            plugins: [],
            secure: []
        };
    }

    // _______________________________________________________________________
    /**
     * Load config files from disk and secure properties from vault.
     * @param app App name used in config filenames (e.g., *my_cli*.config.json)
     * @param opts Options to control how Config class behaves
     */
    public static async load(app: string, opts?: IConfigOpts): Promise<Config> {
        opts = opts || {};

        // Create the basic empty configuration
        const _ = new Config(opts);
        _._app = app;
        _._layers = [];
        _._home = opts.homeDir || node_path.join(os.homedir(), `.${app}`);
        _._active = { user: false, global: false };
        _._vault = opts.vault;
        _._secure = {};

        // Populate configuration file layers
        for (const layer of [
            Layers.ProjectUser, Layers.ProjectConfig,
            Layers.GlobalUser, Layers.GlobalConfig
        ]) {
            _._layers.push({
                path: _.layerPath(layer),
                exists: false,
                properties: Config.empty(),
                global: layer === Layers.GlobalUser || layer === Layers.GlobalConfig,
                user: layer === Layers.ProjectUser || layer === Layers.GlobalUser
            });
        }

        // Read and populate each configuration layer
        try {
            let setActive = true;
            for (const currLayer of _._layers) {
                await _.api.layers.read(currLayer);

                // Find the active layer
                if (setActive && currLayer.exists) {
                    _._active.user = currLayer.user;
                    _._active.global = currLayer.global;
                    setActive = false;
                }

                // Populate any undefined defaults
                currLayer.properties.defaults = currLayer.properties.defaults || {};
                currLayer.properties.profiles = currLayer.properties.profiles || {};
                currLayer.properties.plugins = currLayer.properties.plugins || [];
                currLayer.properties.secure = currLayer.properties.secure || [];
            }
        } catch (e) {
            if (e instanceof ImperativeError) {
                throw e;
            } else {
                throw new ImperativeError({ msg: `An unexpected error occurred during config load: ${e.message}` });
            }
        }

        // Load secure fields
        await _.api.secure.load();

        return _;
    }

    // _______________________________________________________________________
    /**
     * Save config files to disk and store secure properties in vault.
     * @param allLayers Specify false to save only the active config layer
     */
    public async save(allLayers?: boolean) {
        // Save secure fields
        await this.api.secure.save(allLayers);

        try {
            for (const currLayer of this._layers) {
                if ((allLayers !== false) ||
                    (currLayer.user === this._active.user && currLayer.global === this._active.global))
                {
                    await this.api.layers.write(currLayer);
                }
            }
        } catch (e) {
            if (e instanceof ImperativeError) {
                throw e;
            } else {
                throw new ImperativeError({ msg: `An unexpected error occurred during config save: ${e.message}` });
            }
        }
    }

    // _______________________________________________________________________
    /**
     * Get absolute file path for a config layer.
     * For project config files, We search up from our current directory and
     * ignore the Zowe hone directory (in case our current directory is under
     * Zowe home.). For golbal config files we only retrieve config files
     * from the Zowe home directory.
     *
     * @param layer Enum value for config layer
     */
    private layerPath(layer: Layers): string {
        switch (layer) {
            case Layers.ProjectUser:
                return Config.search(this.userConfigName, { ignoreDirs: [this._home] }) || node_path.join(process.cwd(), this.userConfigName);
            case Layers.ProjectConfig:
                return Config.search(this.configName, { ignoreDirs: [this._home] }) || node_path.join(process.cwd(), this.configName);
            case Layers.GlobalUser:
                return node_path.join(this._home, this.userConfigName);
            case Layers.GlobalConfig:
                return node_path.join(this._home, this.configName);
        }
    }

    // _______________________________________________________________________
    /**
     * Access the config API for manipulating profiles, plugins, layers, and secure values.
     */
    get api() {
        return {
            profiles: new ConfigProfiles(this),
            plugins: new ConfigPlugins(this),
            layers: new ConfigLayers(this),
            secure: new ConfigSecure(this)
        };
    }

    // _______________________________________________________________________
    /**
     * True if any config layers exist on disk, otherwise false.
     */
    public get exists(): boolean {
        for (const layer of this._layers)
            if (layer.exists) return true;
        return false;
    }

    // _______________________________________________________________________
    /**
     * List of absolute file paths for all config layers.
     */
    public get paths(): string[] {
        return this._layers.map((layer: IConfigLayer) => layer.path);
    }

    // _______________________________________________________________________
    /**
     * List of all config layers.
     * Returns a clone to prevent accidental edits of the original object.
     */
    public get layers(): IConfigLayer[] {
        return JSONC.parse(JSONC.stringify(this._layers));
    }

    // _______________________________________________________________________
    /**
     * List of properties across all config layers.
     * Returns a clone to prevent accidental edits of the orignal object.
     */
    public get properties(): IConfig {
        return this.layerMerge(false);
    }

    // _______________________________________________________________________
    /**
     * App name used in config filenames (e.g., *my_cli*.config.json)
     */
    public get appName(): string {
        return this._app;
    }

    // _______________________________________________________________________
    /**
     * Filename used for config JSONC files
     */
    public get configName(): string {
        return `${this._app}${Config.END_OF_TEAM_CONFIG}`;
    }

    // _______________________________________________________________________
    /**
     * Filename used for user config JSONC files
     */
    public get userConfigName(): string {
        return `${this._app}${Config.END_OF_USER_CONFIG}`;
    }

    // _______________________________________________________________________
    /**
     * Filename used for config schema JSON files
     */
    public get schemaName(): string {
        return `${this._app}.schema.json`;
    }

    // _______________________________________________________________________
    /**
     * Search for up the directory tree for the directory containing the
     * specified config file.
     *
     * @param file Contains the name of the desired config file
     * @param opts.ignoreDirs Contains an array of direcory names to be
     *        ignored (skipped) during the search.
     *
     * @returns The full path name to config file or null if not found.
     */
    public static search(file: string, opts?: { ignoreDirs?: string[] }): string {
        opts = opts || {};
        const p = findUp.sync((directory: string) => {
            if (opts.ignoreDirs?.includes(directory)) return;
            return fs.existsSync(node_path.join(directory, file)) && directory;
        }, { type: "directory" });
        return p ? node_path.join(p, file) : null;
    }

    // _______________________________________________________________________
    /**
     * The properties object with secure values masked.
     * @type {IConfig}
     * @memberof Config
     */
    public get maskedProperties(): IConfig {
        return this.layerMerge(true);
    }

    // _______________________________________________________________________
    /**
     * Set value of a property in the active config layer.
     * TODO: more validation
     *
     * @param path Property path
     * @param value Property value
     * @param opts Include `secure: true` to store the property securely
     */
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

    // _______________________________________________________________________
    /**
     * Unset value of a property in the active config layer.
     * @param path Property path
     * @param opts Include `secure: false` to preserve property in secure array
     */
    public delete(path: string, opts?: { secure?: boolean }) {
        opts = opts || {};

        const layer = this.layerActive();
        lodash.unset(layer.properties, path);

        if (opts.secure !== false) {
            layer.properties.secure = layer.properties.secure.filter((secureProp: string) => {
                return secureProp !== path && !secureProp.startsWith(`${path}.`);
            });
        }
    }

    // _______________________________________________________________________
    /**
     * Set the $schema value at the top of the config JSONC.
     * Also save the schema to disk if an object is provided.
     * @param schema The URI of JSON schema, or a schema object to use
     */
    public setSchema(schema: string | object) {
        const schemaUri = (typeof schema === "string") ? schema : `./${this.schemaName}`;
        const schemaObj = (typeof schema !== "string") ? schema : null;

        const layer = this.layerActive();
        delete layer.properties.$schema;
        layer.properties = { $schema: schemaUri, ...layer.properties };

        if (schemaObj != null) {
            const filePath = node_path.resolve(node_path.dirname(layer.path), schemaUri);
            fs.writeFileSync(filePath, JSONC.stringify(schemaObj, null, ConfigConstants.INDENT));
        }
    }

    // _______________________________________________________________________
    /**
     * Merge the properties from multiple layers into a single Config object.
     *
     * @internal
     * @param maskSecure Indicates whether we should mask off secure properties.
     *
     * @returns The resulting Config object
     */
    private layerMerge(maskSecure?: boolean): IConfig {
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
        const usrProject = this.layerProfiles(this._layers[Layers.ProjectUser], maskSecure);
        const project = this.layerProfiles(this._layers[Layers.ProjectConfig], maskSecure);
        const proj: { [key: string]: IConfigProfile } = deepmerge(project, usrProject);

        // Merge the global layer profiles
        const usrGlobal = this.layerProfiles(this._layers[Layers.GlobalUser], maskSecure);
        const global = this.layerProfiles(this._layers[Layers.GlobalConfig], maskSecure);
        const glbl: { [key: string]: IConfigProfile } = deepmerge(global, usrGlobal);

        // Traverse all the global profiles merging any missing from project profiles
        c.profiles = proj;
        for (const [n, p] of Object.entries(glbl)) {
            if (c.profiles[n] == null)
                c.profiles[n] = p;
        }

        return c;
    }

    // _______________________________________________________________________
    /**
     * Obtain the profiles object for a specified layer object.
     *
     * @internal
     * @param layer The layer for which we want the profiles.
     * @param maskSecure If true, we will mask the values of secure properties.
     *
     * @returns The resulting profile object
     */
    public layerProfiles(layer: IConfigLayer, maskSecure?: boolean): { [key: string]: IConfigProfile } {
        const properties = JSONC.parse(JSONC.stringify(layer.properties));
        if (maskSecure) {
            for (const secureProp of properties.secure) {
                lodash.set(properties, secureProp, ConfigConstants.SECURE_VALUE);
            }
        }
        return properties.profiles;
    }

    // _______________________________________________________________________
    /**
     * Find the layer with the specified user and global properties.
     *
     * @internal
     * @param user True specifies that you want the user layer.
     * @param global True specifies that you want the layer at the global level.
     *
     * @returns The desired layer object. Null if no layer matches.
     */
    public findLayer(user: boolean, global: boolean): IConfigLayer {
        for (const layer of (this._layers || [])) {
            if (layer.user === user && layer.global === global)
                return layer;
        }
    }

    // _______________________________________________________________________
    /**
     * Obtain the layer object that is currently active.
     *
     * @internal
     *
     * @returns The active layer object
     */
    public layerActive(): IConfigLayer {
            const layer = this.findLayer(this._active.user, this._active.global);
            if (layer != null) return layer;
            throw new ImperativeError({ msg: `internal error: no active layer found` });
    }

    // _______________________________________________________________________
    /**
     * Form the path name of the team config file to display in messages.
     * Always return the team name (not the user name).
     * If the a team configuration is active, return the full path to the
     * config file.
     *
     * @param options - a map containing option properties. Currently, the only
     *                  property supported is a boolean named addPath.
     *                  {addPath: true | false}
     *
     * @returns The path (if requested) and file name of the team config file.
     */
    public formMainConfigPathNm(options: any): string {
        // if a team configuration is not active, just return the file name.
        let configPathNm: string = this._app + Config.END_OF_TEAM_CONFIG;
        if (options.addPath === false) {
            // if our caller does not want the path, just return the file name.
            return configPathNm;
        }

        if (this.exists){
            // form the full path to the team config file
            configPathNm = this.api.layers.get().path;

            // this.api.layers.get() returns zowe.config.user.json
            // when both shared and user config files exit.
            // Ensure that we use zowe.config.json, not zowe.config.user.json.
            configPathNm = configPathNm.replace(Config.END_OF_USER_CONFIG, Config.END_OF_TEAM_CONFIG);
        }
        return configPathNm;
    }

}
