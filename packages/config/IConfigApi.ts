import { configure } from "log4js";
import { config } from "yargs";
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

import { IConfgProfile } from "./IConfig";

export interface IConfigApi {
    defaults: {
        build: (key: string) => {[key: string]: string};
        get: (key: string) => { name: string, profile: IConfgProfile };
        set: (key: string, value: string) => void;
    };
    profiles: {
        set: (path: string, profile: IConfgProfile) => void;
        get: (path: string, opts?: { active?: boolean }) => IConfgProfile;
        build: (path: string, opts?:  { active?: boolean }) => {[key: string]: string};
        exists: (path: string) => boolean;
        names: () => string[];
    };
    plugins: {
        get: () => string[];
        append: () => void;
        new: () => string[];
    };
}