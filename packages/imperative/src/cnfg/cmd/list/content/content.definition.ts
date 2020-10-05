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
import { ICommandDefinition } from "../../../../../../cmd";

/**
 * Definition of the paths command.
 * @type {ICommandDefinition}
 */
export const contentDefinition: ICommandDefinition = {
    name: "content",
    aliases: ["c"],
    type: "command",
    handler: join(__dirname, "content.handler"),
    options: [
        {
            name: "locations",
            aliases: ["l"],
            description: "list location content",
            type: "boolean"
        }
    ],
    summary: "lists the config content",
    description: "list the config content",
    outputFormatOptions: true
};
