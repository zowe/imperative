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
import { IConfigProfile } from "../doc/IConfigProfile";

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
            this.mConfig.mVault = vault;
        }
        if (this.mConfig.mVault == null) return;

        // load the secure fields
        const s: string = await this.mConfig.mVault.load(ConfigConstants.SECURE_ACCT);
        if (s == null) return;
        this.mConfig.mSecure = JSONC.parse(s);

        // populate each layers properties
        for (const layer of this.mConfig.mLayers) {

            // Find the matching layer
            for (const [filePath, secureProps] of Object.entries(this.mConfig.mSecure)) {
                if (filePath === layer.path) {

                    // Only set those indicated by the config
                    for (const p of this.secureFields(layer)) {

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
        if (this.mConfig.mVault == null) return;
        const beforeLen = Object.keys(this.mConfig.mSecure).length;

        // Build the entries for each layer
        for (const layer of this.mConfig.mLayers) {
            if ((allLayers === false) && (layer.user !== this.mConfig.mActive.user || layer.global !== this.mConfig.mActive.global)) {
                continue;
            }

            // Create all the secure property entries
            const sp: IConfigSecureProperties = {};
            for (const path of this.secureFields(layer)) {
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
            delete this.mConfig.mSecure[layer.path];

            // Create the entry to set the secure properties
            if (Object.keys(sp).length > 0) {
                this.mConfig.mSecure[layer.path] = sp;
            }
        }

        // Save the entries if needed
        if (Object.keys(this.mConfig.mSecure).length > 0 || beforeLen > 0 ) {
            await this.mConfig.mVault.save(ConfigConstants.SECURE_ACCT, JSONC.stringify(this.mConfig.mSecure));
        }
    }

    // _______________________________________________________________________
    /**
     * Do we have secure fields in any layer of our Config object?
     *
     * This function is never called. To avoid skewing code coverage of tests,
     * this function is commented out. If you ever need it, you know what to do.
     *
     * @returns true -> we have secure fields.
     *          false -> no secure fields.
     */
    public secureFields(opts?: { user: boolean; global: boolean }): string[] {
        const layer = opts ? this.mConfig.findLayer(opts.user, opts.global) : this.mConfig.layerActive();
        return this.findSecure(layer.properties.profiles, "profiles");
    }

    private findSecure(profiles: { [key: string]: IConfigProfile }, path: string): string[] {
        const secureProps = [];
        for (const profName of Object.keys(profiles)) {
            for (const propName of (profiles[profName].secure || [])) {
                secureProps.push(`${path}.${profName}.properties.${propName}`);
            }
            if (profiles[profName].profiles != null) {
                secureProps.push(...this.findSecure(profiles[profName].profiles, `${path}.${profName}.profiles`));
            }
        }
        return secureProps;
    }

    public secureInfoForProp(propertyPath: string): { path: string, prop: string } {
        if (!propertyPath.includes(".properties.")) {
            return null;
        }
        return {
            path: propertyPath.replace(/\.properties.+/, ".secure"),
            prop: propertyPath.split(".").pop()
        }
    }
}
