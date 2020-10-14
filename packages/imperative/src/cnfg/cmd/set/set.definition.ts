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
    summary: "set configuration properties",
    description: "set configuration properties",
    positionals: [
        {
            name: "property",
            description: "The property to set. You may specify a path using dot notation (e.g. profiles.host1.profiles.service1.properties.setting)",
            required: true,
            type: "string"
        },
        {
            name: "value",
            description: "The property value to set. The value may be JSON. Use '--json' to indicate.",
            required: true,
            type: "string"
        }
    ],
    options: [
        {
            name: "global",
            description: "Set the property in global config.",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "user",
            description: "Set the property in user config.",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "json",
            description: "The property value is JSON.",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "secure",
            description: "Secure the field in the active secure vault.",
            type: "boolean",
            defaultValue: false
        }
    ]
};
