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
    name: string;
    type: string;
    properties: { [key: string]: string }
    secure: string[],
};

export interface IConfgProfile {
    name: string;
    properties?: { [key: string]: string },
    secure?: string[],
    types?: IConfigType[]
};

export interface IConfig {
    defaults: { [key: string]: string },
    profiles: IConfgProfile[],
    plugins: string[],
}