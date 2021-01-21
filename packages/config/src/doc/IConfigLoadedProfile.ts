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

import { IConfigProfile } from "./IConfigProfile";

export interface IConfigLoadedProperty {
    value?: any;
    secure: boolean;
    user: boolean;
    global: boolean;
}

export interface IConfigLoadedProfile extends IConfigProfile {
    properties: { [key: string]: IConfigLoadedProperty };
    profiles?: { [key: string]: IConfigLoadedProfile };
}
