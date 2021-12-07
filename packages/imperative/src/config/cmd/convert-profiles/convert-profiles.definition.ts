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
import { ImperativeConfig } from "../../../../../utilities";

/**
 * Definition of the convert-profiles command.
 * @type {ICommandDefinition}
 */
export const convertProfilesDefinition: ICommandDefinition = {
    name: "convert-profiles",
    aliases: ["convert"],
    type: "command",
    handler: join(__dirname, "convert-profiles.handler"),
    summary: "Convert profiles to team config",
    description: `Convert v1 profiles to a global ${ImperativeConfig.instance.rootCommandName}.config.json file.`,
    options: [{
        name: "force",
        description: "Bypass prompt for user confirmation before profile conversion.",
        type: "boolean"
    }],
    examples: [{
        description: "Convert profiles to team config without prompting",
        options: "--force"
    }]
};
