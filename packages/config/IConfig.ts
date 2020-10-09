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

export interface IConfigType {
    properties: { [key: string]: string }
    secure: string[],
};

export interface IConfgProfile {
    properties?: { [key: string]: string },
    secure?: string[],
    defaults?: { [key: string]: string },
    types?: { [key: string]: { [key: string]: IConfigType } }
};

export interface IConfig {
    defaults: { [key: string]: string },
    profiles: { [key: string]: IConfgProfile },
    plugins: string[],
}