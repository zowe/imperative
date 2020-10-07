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
 * Definition of the paths command.
 * @type {ICommandDefinition}
 */
export const setDefinition: ICommandDefinition = {
    name: "set",
    type: "command",
    handler: join(__dirname, "set.handler"),
    positionals: [
        {
            name: "property",
            description: "the property to set",
            required: true,
            type: "string"
        },
        {
            name: "value",
            description: "the value",
            required: true,
            type: "string"
        }
    ],
    options: [
        {
            name: "global",
            description: "set in global config",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "user",
            description: "set in user config",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "json",
            description: "the value is JSON",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "secure",
            description: "secure the field",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "append",
            description: "append to an array",
            type: "boolean",
            defaultValue: false
        }
    ],
    summary: "set configuration properties",
    description: "set configuration properties"
};
