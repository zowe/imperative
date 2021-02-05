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
import * as lodash from "lodash";
import * as lodashDeep from "lodash-deep";
import { IConfigLoadedProfile, IConfigLoadedProperty } from "../doc/IConfigLoadedProfile";
import { IConfigProfile } from "../doc/IConfigProfile";
import { ConfigApi } from "./ConfigApi";

export class ConfigProfiles extends ConfigApi {
    public set(path: string, profile: IConfigProfile): void {
        profile.properties = profile.properties || {};
        const layer = this.mConfig.layerActive();
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
        return this.buildProfile(path, JSONC.parse(JSONC.stringify(this.mConfig.properties.profiles)));
    }

    public exists(path: string): boolean {
        return (this.findProfile(path, this.mConfig.properties.profiles) != null);
    }

    public load(path: string): IConfigLoadedProfile {
        return this.loadProfile(this.expandPath(path));
    }

    public defaultSet(key: string, value: string) {
        this.mConfig.layerActive().properties.defaults[key] = value;
    }

    public defaultGet(key: string): { [key: string]: string } {
        const dflt = this.mConfig.properties.defaults[key];
        if (dflt == null || !this.exists(dflt))
            return null;
        return this.get(dflt);
    }

    public expandPath(shortPath: string): string {
        return shortPath.replace(/(^|\.)/g, "$1profiles.");
    }

    // TODO Does this need to recurse up through nested profiles?
    private loadProfile(path: string): IConfigLoadedProfile {
        const profile = lodash.get(this.mConfig.properties, path);
        if (profile == null) {
            return null;
        }

        const loadedProfile = lodashDeep.deepMapValues(profile, (value: any, p: string) => {
            if (p.includes("properties.")) {
                for (const layer of this.mConfig._layers) {
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

        for (const layer of this.mConfig._layers) {
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

    /* Static Utilities */
    private buildProfile(path: string, profiles: { [key: string]: IConfigProfile }): { [key: string]: string } {
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

    private findProfile(path: string, profiles: { [key: string]: IConfigProfile }): IConfigProfile {
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
