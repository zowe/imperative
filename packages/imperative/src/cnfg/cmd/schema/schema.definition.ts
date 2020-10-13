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
export const SchemaDefinition: ICommandDefinition = {
    name: "schema",
    type: "command",
    handler: join(__dirname, "schema.handler"),
    summary: "dumps the schema for profiles",
    description: "dumps the schema for profiles"
};
