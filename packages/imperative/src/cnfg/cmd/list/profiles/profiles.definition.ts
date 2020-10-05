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
export const profilesDefinition: ICommandDefinition = {
    name: "profiles",
    aliases: ["p"],
    type: "command",
    handler: join(__dirname, "profiles.handler"),
    summary: "lists profiles",
    options: [
        {
            name: "locations",
            aliases: ["l"],
            description: "list location content",
            type: "boolean"
        }
    ],
    description: "lists profiles",
    outputFormatOptions: true
};
