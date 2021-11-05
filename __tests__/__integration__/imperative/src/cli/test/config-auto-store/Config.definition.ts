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

import { ICommandDefinition } from "../../../../../../../lib";

export const ConfigAutoStoreCommand: ICommandDefinition = {
    name: "test-config-auto-store",
    description: "Read some config",
    summary: "Read some config",
    type: "command",
    handler: __dirname + "/Config.handler",
    profile: {
        optional: ["base"]
    }
};
