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

import { IConfigLayer } from "./IConfigLayer";

export interface IConfigApi {
    profiles: {
        get: (name: string) => any;
        loadSecure: () => void;
        names: () => string[];
        exists: (name: string) => boolean;
        set: (name: string, contents: {[key: string]: any}, opts?: {secure: string[]}) => void;
    },
    plugins: {
        write: () => void;
        new: () => string[];
    },
};