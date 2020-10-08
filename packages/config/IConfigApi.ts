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

import { IConfgProfile, IConfigType } from "./IConfig";

export interface IConfigApi {
    defaults: {
        get: (key: string) => any;
        set: (key: string, value: string) => void;
    };
    profiles: {
        set: (profile: IConfgProfile) => void;
        get: (name: string, opts?: {active?: boolean}) => IConfgProfile;
        loadSecure: () => void;
        names: () => string[];
        exists: (name: string) => boolean;
        typeSet: (profile: string, type: string, name: string, properties: { [key: string]: string }, opts?: { secure: string[] }) => void;
        typeGet: (profile: string, type: string, name: string) => IConfigType;
        typeExists: (profile: string, type: string, name: string) => boolean;
    };
    plugins: {
        append: () => void;
        get: () => string[];
        new: () => string[];
    };
}