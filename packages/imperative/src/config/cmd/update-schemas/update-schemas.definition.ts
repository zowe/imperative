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

export const updateSchemasDefinition: ICommandDefinition = {
    name: "update-schemas",
    aliases: ["us"],
    type: "command",
    summary: "update schema files",
    description: "Update schema files by looking up the directory structure.",
    handler: join(__dirname, "update-schemas.handler"),
    positionals: [],
    options: [
        {
            name: "depth",
            description: "Specifies how many levels down the directory structure should the schemas be updated.",
            type: "number",
            defaultValue: 0
        }
    ]
};
