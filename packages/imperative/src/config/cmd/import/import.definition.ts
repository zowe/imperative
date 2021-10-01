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
    description: "Import config files from another location on disk or from an Internet URL.\n\n" +
        "If the config `$schema` property points to a relative path, the schema will also be imported.",
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
        },
        {
            name: "overwrite",
            description: "Overwrite config file if one already exists.",
            aliases: ["ow"],
            type: "boolean",
            defaultValue: false
        }
    ],
    examples: [
        {
            description: "Import config from local file on disk",
            options: "~/Downloads/zowe.config.json"
        },
        {
            description: "Import global config from Internet URL",
            options: "https://example.com/zowe.config.json --global-config"
        }
    ]
};
