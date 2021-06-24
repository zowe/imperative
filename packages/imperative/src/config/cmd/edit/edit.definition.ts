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

/**
 * Definition of the edit command.
 * @type {ICommandDefinition}
 */
export const editDefinition: ICommandDefinition = {
    name: "edit",
    type: "command",
    handler: join(__dirname, "edit.handler"),
    summary: "edit config files",
    description: `Edit config file in your system's default text editor.`,
    options: [
        {
            name: "global-config",
            description: "Target the global config files.",
            aliases: ["gc"],
            type: "boolean",
            defaultValue: false
        },
        {
            name: "user-config",
            description: "Target the user config files.",
            aliases: ["uc"],
            type: "boolean",
            defaultValue: false
        }
    ]
};
