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

import * as JSONC from "comment-json";
import { ConfigApi } from "./ConfigApi";
import { IConfigVault } from "../doc/IConfigVault";
import { IConfigSecureProperties } from "../doc/IConfigSecure";
import { ConfigConstants } from "../ConfigConstants";

/**
 * API Class for manipulating config layers.
 */
export class ConfigSecure extends ConfigApi {

    // _______________________________________________________________________
    /**
     * Load the secure application properties from secure storage using the
     * specified vault interface. The vault interface is placed into our
     * Config object. The secure values are placed into our Config layers.
     *
     * @param vault Interface for loading and saving to secure storage.
     */
    public async load(vault?: IConfigVault) {
        if (vault != null) {
            this.mConfig._vault = vault;
        }
        if (this.mConfig._vault == null) return;

        // load the secure fields
        const s: string = await this.mConfig._vault.load(ConfigConstants.SECURE_ACCT);
        if (s == null) return;
        this.mConfig._secure = JSONC.parse(s);

        // populate each layers properties
        for (const layer of this.mConfig._layers) {

            // Find the matching layer
            for (const [filePath, secureProps] of Object.entries(this.mConfig._secure)) {
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

    // _______________________________________________________________________
    /**
     * Save the secure application properties into secure storage using
     * the vault interface from our config object.
     *
     * @param allLayers Save all Config layers when true.
     *                  Only save the active layer when false.
     */
    public async save(allLayers?: boolean) {
        if (this.mConfig._vault == null) return;
        const beforeLen = Object.keys(this.mConfig._secure).length;

        // Build the entries for each layer
        for (const layer of this.mConfig._layers) {
            if ((allLayers === false) && (layer.user !== this.mConfig._active.user || layer.global !== this.mConfig._active.global)) {
                continue;
            }

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
            delete this.mConfig._secure[layer.path];

            // Create the entry to set the secure properties
            if (Object.keys(sp).length > 0) {
                this.mConfig._secure[layer.path] = sp;
            }
        }

        // Save the entries if needed
        if (Object.keys(this.mConfig._secure).length > 0 || beforeLen > 0 ) {
            await this.mConfig._vault.save(ConfigConstants.SECURE_ACCT, JSONC.stringify(this.mConfig._secure));
        }
    }

    // _______________________________________________________________________
    /**
     * Do we have secure fields in any layer of our Config object?
     *
     * @returns true -> we have secure fields.
     *          false -> no secure fields.
     */
    private secureFields(): boolean {
        for (const l of this.mConfig.layers)
            if (l.properties.secure.length > 0) return true;
        return false;
    }
}
