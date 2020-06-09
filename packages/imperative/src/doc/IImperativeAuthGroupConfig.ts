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

import { ICommandDefinition } from "../../../cmd";

export interface IImperativeAuthGroupConfig {
    /**
     * Command definition for "auth" command group
     */
    authGroup?: Partial<ICommandDefinition>;

    /**
     * Command definition for "auth login" command group
     */
    loginGroup?: Partial<ICommandDefinition>;

    /**
     * Command definition for "auth logout" command group
     */
    logoutGroup?: Partial<ICommandDefinition>;
}
