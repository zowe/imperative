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

export interface IConfig {
    secure: {
        append: () => void;
        get: () => string[];
    },
    defaults: {
        get: (key: string) => any;
        set: (key: string, value: string) => void;
    },
    profiles: {
        get: (type: string, name: string) => any;
        set: (type: string, name: string, contents: { [key: string]: any }, opts?: { secure: string[] }) => void;
        loadSecure: () => void;
        names: () => string[];
        exists: (type: string, name: string) => boolean;
    };
    all: {
        get: (key: string) => any;
        set: (key: string, value: string) => void;
    },
    plugins: {
        append: () => void;
        get: () => string[];
        new: () => string[];
    },
}