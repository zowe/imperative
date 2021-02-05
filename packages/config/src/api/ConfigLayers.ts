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

export class ConfigLayers extends ConfigApi {
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

    public activate(user: boolean, global: boolean, inDir?: string) {
        this.mConfig._active.user = user;
        this.mConfig._active.global = global;

        if (inDir != null) {
            const layer = this.mConfig.layerActive();
            layer.path = node_path.join(inDir, node_path.basename(layer.path));
            this.read();
        }
    }

    public get(): IConfigLayer {
        // Note: Add indentation to allow comments to be accessed via config.api.layers.get(), otherwise use layerActive()
        // return JSONC.parse(JSONC.stringify(this.mConfig.layerActive(), null, ConfigConstants.INDENT));
        return JSONC.parse(JSONC.stringify(this.mConfig.layerActive()));
    }

    public set(cnfg: IConfig) {
        for (const i in this.mConfig._layers) {
            if (this.mConfig._layers[i].user === this.mConfig._active.user &&
                this.mConfig._layers[i].global === this.mConfig._active.global) {
                this.mConfig._layers[i].properties = cnfg;
                this.mConfig._layers[i].properties.defaults = this.mConfig._layers[i].properties.defaults || {};
                this.mConfig._layers[i].properties.profiles = this.mConfig._layers[i].properties.profiles || {};
                this.mConfig._layers[i].properties.plugins = this.mConfig._layers[i].properties.plugins || [];
                this.mConfig._layers[i].properties.secure = this.mConfig._layers[i].properties.secure || [];
            }
        }
    }

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
