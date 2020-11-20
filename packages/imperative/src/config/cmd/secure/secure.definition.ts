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

import { ICommandDefinition } from "../../../../../cmd";
import { join } from "path";

export const secureDefinition: ICommandDefinition = {
    name: "secure",
    type: "command",
    handler: join(__dirname, "secure.handler"),
    summary: "secure configuration properties",
    description: "prompt for secure configuration properties",
    options: [
        {
            name: "global",
            description: "Secure properties in global config.",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "user",
            description: "Secure properties in user config.",
            type: "boolean",
            defaultValue: false
        }
    ]
};
