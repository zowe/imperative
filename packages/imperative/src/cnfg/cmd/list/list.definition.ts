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

import { join } from "path";
import { ICommandDefinition } from "../../../../../cmd";
import { contentDefinition } from "./content/content.definition";
import { pathsDefinition } from "./paths/paths.definition";
import { profilesDefinition } from "./profiles/profiles.definition";

/**
 * Definition of the paths command.
 * @type {ICommandDefinition}
 */
export const listDefinition: ICommandDefinition = {
    name: "list",
    aliases: ["ls"],
    type: "command",
    positionals: [
        {
            name: "property",
            required: false,
            type: "string",
            description: "the root level property in the config file to list, specify blank to list everything"
        }
    ],
    options: [
        {
            name: "locations",
            description: "include the locations",
            type: "boolean"
        }
    ],
    handler: join(__dirname, "list.handler"),
    // children: [
    //     profilesDefinition,
    //     pathsDefinition,
    //     contentDefinition
    // ],
    summary: "list configuration items",
    description: "list configuration items"
};
