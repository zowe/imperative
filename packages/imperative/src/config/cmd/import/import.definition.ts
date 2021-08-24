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

/**
 * Definition of the import command.
 * @type {ICommandDefinition}
 */
export const importDefinition: ICommandDefinition = {
    name: "import",
    type: "command",
    handler: join(__dirname, "import.handler"),
    summary: "import config files",
    description: `Import config files from another location on disk or from an Internet URL.`,
    positionals: [
        {
            name: "location",
            description: "File path or URL to import from.",
            type: "string"
        }
    ],
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
