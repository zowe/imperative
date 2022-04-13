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

import { IConfig } from "./IConfig";

export interface IConfigLayerInfo {
    global: boolean;
    user: boolean;
}

export interface IConfigLayerLoc {
    global?: boolean;
    user?: boolean;
    path: string;
}

export interface IConfigLayer extends IConfigLayerInfo {
    path: string;
    exists: boolean;
    properties: IConfig;
}
