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
        get: (type: string, name: string) => any;
        loadSecure: () => void;
        names: (type: string) => string[];
        validate: (type: string, name: string) => void;
        exists: (type: string, name: string) => boolean;
        set: (type: string, name: string, contents: {[key: string]: any}) => void;
    },
    plugins: {
        write: () => void;
        new: () => string[];
    },
};