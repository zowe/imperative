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
export const pathsDefinition: ICommandDefinition = {
    name: "paths",
    aliases: ["p"],
    type: "command",
    handler: join(__dirname, "paths.handler"),
    summary: "Search and lists the configuration files",
    description: "Search and lists the configuration files",
    outputFormatOptions: true
};
