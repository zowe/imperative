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

import * as fs from "fs";
import * as node_path from "path";
import * as deepmerge from "deepmerge";
import * as JSONC from "comment-json";
import { ImperativeError } from "../../../error";
import { ConfigConstants } from "../ConfigConstants";
import { IConfigLayer } from "../doc/IConfigLayer";
import { ConfigApi } from "./ConfigApi";
import { IConfig } from "../doc/IConfig";

/**
 * API Class for manipulating config layers.
 */
export class ConfigLayers extends ConfigApi {

    // _______________________________________________________________________
    /**
     * Read a config layer from disk into memory for application use.
     *
     * @param opts The user and global flags that indicate which of the four
     *             config files (aka layers) is to be read.
     */
    public async read(opts?: { user: boolean; global: boolean }) {
        // Attempt to populate the layer
        const layer = opts ? this.mConfig.findLayer(opts.user, opts.global) : this.mConfig.layerActive();
        if (fs.existsSync(layer.path)) {
            let fileContents: any;
            try {
                fileContents = fs.readFileSync(layer.path);
            } catch (e) {
                throw new ImperativeError({ msg: `An error was encountered while trying to read the file '${layer.path}'.` +
                    `\nError details: ${e.message}`,
                                            suppressDump: true });
            }
            try {
                layer.properties = JSONC.parse(fileContents.toString());
                layer.exists = true;
            } catch (e) {
                throw new ImperativeError({ msg: `Error parsing JSON in the file '${layer.path}'.\n` +
                    `Please check this configuration file for errors.\nError details: ${e.message}\nLine ${e.line}, Column ${e.column}`,
                                            suppressDump: true});
            }
        }

        // Populate any undefined defaults
        layer.properties.defaults = layer.properties.defaults || {};
        layer.properties.profiles = layer.properties.profiles || {};
        layer.properties.plugins = layer.properties.plugins || [];
        layer.properties.secure = layer.properties.secure || [];
    }

    // _______________________________________________________________________
    /**
     * Write a config layer to disk.
     *
     * @param opts The user and global flags that indicate which of the four
     *             config files (aka layers) is to be written.
     */
    public async write(opts?: { user: boolean; global: boolean }) {
        // TODO: should we prevent a write if there is no vault
        // TODO: specified and there are secure fields??

        // If fields are marked as secure
        const layer = JSONC.parse(JSONC.stringify(opts ? this.mConfig.findLayer(opts.user, opts.global) : this.mConfig.layerActive()));
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
            fs.writeFileSync(layer.path, JSONC.stringify(layer.properties, null, ConfigConstants.INDENT));
        } catch (e) {
            throw new ImperativeError({ msg: `error writing "${layer.path}": ${e.message}` });
        }
        layer.exists = true;
    }

    // _______________________________________________________________________
    /**
     * Select which layer is the currently active layer.
     *
     * @param user True if you want the user layer.
     * @param global True if you want the global layer.
     * @param inDir The directory to which you want to set the file path
     *              for this layer.
     */
    public activate(user: boolean, global: boolean, inDir?: string) {
        this.mConfig.mActive.user = user;
        this.mConfig.mActive.global = global;

        if (inDir != null) {
            const layer = this.mConfig.layerActive();
            layer.path = node_path.join(inDir, node_path.basename(layer.path));
            this.read();
        }
    }

    // _______________________________________________________________________
    /**
     * Gets a json object that represents the currently active layer.
     *
     * @returns The json object
     */
    public get(): IConfigLayer {
        // Note: Add indentation to allow comments to be accessed via config.api.layers.get(), otherwise use layerActive()
        // return JSONC.parse(JSONC.stringify(this.mConfig.layerActive(), null, ConfigConstants.INDENT));
        return JSONC.parse(JSONC.stringify(this.mConfig.layerActive()));
    }

    // _______________________________________________________________________
    /**
     * Set the the currently active layer to the supplied json object.
     *
     * @param user True if you want the user layer.
     */
    public set(cnfg: IConfig) {
        for (const i in this.mConfig.mLayers) {
            if (this.mConfig.mLayers[i].user === this.mConfig.mActive.user &&
                this.mConfig.mLayers[i].global === this.mConfig.mActive.global) {
                this.mConfig.mLayers[i].properties = cnfg;
                this.mConfig.mLayers[i].properties.defaults = this.mConfig.mLayers[i].properties.defaults || {};
                this.mConfig.mLayers[i].properties.profiles = this.mConfig.mLayers[i].properties.profiles || {};
                this.mConfig.mLayers[i].properties.plugins = this.mConfig.mLayers[i].properties.plugins || [];
                this.mConfig.mLayers[i].properties.secure = this.mConfig.mLayers[i].properties.secure || [];
            }
        }
    }

    // _______________________________________________________________________
    /**
     * Merge properties from the supplied Config object into the active layer.
     *
     * @param cnfg The Config object to merge.
     */
    public merge(cnfg: IConfig) {
        const layer = this.mConfig.layerActive();
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
}
