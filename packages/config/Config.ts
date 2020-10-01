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

import { ImperativeError } from "../error";
import { IO } from "../io";
import * as DeepMerge from "deepmerge";

export class Config {
    private constructor(private params: any) { }

    public static load(params: any): Config {
        params.config = {};

        // Only proceed if the config exists
        if (IO.existsSync(params.path)) {

            // read and parse the config document
            const configContents = IO.readFileSync(params.path).toString();
            try {
                params.config = JSON.parse(configContents);
                params.original = { ...params.config };
                params.exists = true;
            } catch (e) {
                throw new ImperativeError({ msg: `error parsing config: ${e}` });
            }

            // Set empty objects if not present
            params.config.properties = params.config.properties || {};
            params.config.defaults = params.config.defaults || {};
            params.config.profiles = params.config.profiles || {};
            params.config.plugins = params.config.plugins || [];

            // read and parse any additional configs - merge with the original config
            if (params.merge != null) {
                for (const mergePath of params.merge) {
                    if (IO.existsSync(mergePath)) {
                        const mergeConfigContents = IO.readFileSync(params.path).toString();
                        try {
                            const mergeConfigJSON = JSON.parse(mergeConfigContents);
                            params.config = DeepMerge(params.config, mergeConfigJSON);
                        } catch (e) {
                            throw new ImperativeError({ msg: `error parsing config: ${e}` });
                        }
                    }
                }
            }
        } else {
            params.exists = false;
        }

        if (params.config.properties == null) {
            params.config.properties = {};
        }

        return new Config(params);
    }

    public allProfiles(type: string): string[] {
        return this.params.config.profiles[type] == null ? [] : Object.keys(this.params.config.profiles[type]);
    }

    public profileExists(type: string, name: string): boolean {
        return !(this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null);
    }

    public profile(type: string, name: string): any {
        if (this.params.config.profiles[type] == null || this.params.config.profiles[type][name] == null) {
            return {};
        }
        return DeepMerge(this.params.config.properties, this.params.config.profiles[type][name]);
    }

    public save(keyword: string) {
        const copy: any = this.original;
        copy[keyword] = this.params.config[keyword];
        try {
            IO.writeFile(this.params.path, Buffer.from(JSON.stringify(copy, null, 4)));
        } catch (e) {
            throw new ImperativeError({ msg: `unable to save "${keyword}" to "${this.params.path}": ${e.message}` });
        }
    }

    public get properties(): any {
        return this.params.config.properties;
    }

    public get profiles(): any {
        return this.params.config.profiles;
    }

    public get exists(): boolean {
        return this.params.exists;
    }

    public get defaults(): any {
        return this.params.config.defaults;
    }

    public get path(): string {
        return this.params.path;
    }

    public get plugins(): any {
        return this.params.config.plugins;
    }

    public get original(): any {
        return { ...this.params.original };
    }
}