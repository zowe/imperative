/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import {IImperativeConfig} from "../../../../../packages/index";

// Example to use with tsnode: */*CommandDefinitions!(.d).*s
export const config: IImperativeConfig = {
    commandModuleGlobs: ["**/invoke/*definition!(.d).*s",
        "**/respond/*definition!(.d).*s",
        "**/invalid/*definition!(.d).*s",
        "**/chained/*definition!(.d).*s",
        "**/auto-format/*definition!(.d).*s",
        "**/nested/*definition!(.d).*s",
        "**/gen-help/*definition!(.d).*s"],
    rootCommandDescription: "A test CLI for the 'cmd' imperative package",
    defaultHome: "~/.cmd-cli",
    productDisplayName: "Cmd Package CLI",
    envVariablePrefix: "CMD_CLI",
    name: "cmd-cli",
    allowPlugins: false,
    profiles: [
        {
            type: "banana",
            schema: {
                type: "object",
                title: "Banana Profile",
                description: "Banana Profile",
                properties: {
                    color: {
                        type: "string",
                        optionDefinition: {
                            name: "color",
                            aliases: ["c"],
                            description: "The color of the banana.",
                            type: "string",
                            required: true,
                        },
                    },
                },
                required: ["color"],
            }
        },
        {
            type: "strawberry",
            schema: {
                type: "object",
                title: "Strawberry Profile",
                description: "Strawberry Profile",
                properties: {
                    amount: {
                        type: "number",
                        optionDefinition: {
                            name: "amount",
                            aliases: ["a"],
                            description: "The amount of strawberries.",
                            type: "number",
                            required: true,
                        },
                    },
                },
                required: ["amount"],
            }
        }
    ]
};

module.exports = config;
