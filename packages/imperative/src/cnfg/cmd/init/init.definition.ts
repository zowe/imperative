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
export const InitDefinition: ICommandDefinition = {
    name: "init",
    type: "command",
    handler: join(__dirname, "init.handler"),
    options: [
        {
            name: "global",
            description: "init global config",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "user",
            description: "init user config",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "url",
            description: "the url of the config",
            type: "string"
        },
        {
            name: "default",
            description: "apply defaults where possible",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "profile",
            description: "create a profile",
            type: "string",
        },
        {
            name: "profile-type",
            description: "create a profile type",
            type: "string",
        },
        {
            name: "update",
            description: "update the config if it already exists",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "secure",
            description: "only prompt for secret/secure fields",
            type: "boolean",
            defaultValue: false
        },
        {
            name: "set-default",
            description: "when profiles are created, set them as the default",
            type: "boolean",
            defaultValue: false
        }
    ],
    summary: "init configuration properties",
    description: "init configuration properties"
};
