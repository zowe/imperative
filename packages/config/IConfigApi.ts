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
        get: (key: string) => { name: string, profile: IConfgProfile };
        set: (key: string, value: string) => void;
    };
    profiles: {
        set: (name: string, profile: IConfgProfile) => void;
        get: (name: string, opts?: { active?: boolean }) => IConfgProfile;
        exists: (name: string) => boolean;
        names: () => string[];

        typeNames: (profile: string) => string[];
        typeExists: (profile: string, type: string) => boolean;
        typeDefaultSet: (profile: string, type: string, name: string) => void;
        typeDefaultGet: (profile: string, type: string) => { name: string, profile: IConfigType };
        typeProfileGet: (profile: string, type: string, name: string) => IConfigType;
        typeProfileSet: (profile: string, type: string, name: string, properties: { [key: string]: string }, opts?: { secure: string[] }) => void;
        typeProfileNames: (profile: string, type: string) => string[];
        typeProfileExists: (profile: string, type: string, name: string) => boolean;
    };
    plugins: {
        get: () => string[];
        append: () => void;
        new: () => string[];
    };
}