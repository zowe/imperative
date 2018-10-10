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

import { IImperativeConfig } from "../../../../../packages/index";

// Example to use with tsnode: */*CommandDefinitions!(.d).*s
export const config: IImperativeConfig = {
    commandModuleGlobs: ["**/cli/*/*definition!(.d).*s"],
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
                    "color": {
                        type: "string",
                        optionDefinition: {
                            name: "color",
                            aliases: ["c"],
                            description: "The color of the banana.",
                            type: "string",
                            required: true,
                        },
                    },
                    "bananaDescription": {
                        type: "string",
                        optionDefinition: {
                            name: "banana-description",
                            aliases: ["bd"],
                            description: "A description of the banana",
                            type: "string"
                        },
                    },
                    /**
                     * One option in kebab case to make sure fields are still mapped
                     */
                    "mold-type": {
                        type: "string",
                        optionDefinition: {
                            name: "mold-type",
                            aliases: ["mt"],
                            description: "The type of mold on the banana if any",
                            type: "string"
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
        },
        {
            type: "insecure",
            schema: {
                type: "object",
                title: "Test Secured Fields",
                description: "Test Secured Fields",
                properties: {
                    info: {
                        type: "string",
                        optionDefinition: {
                            name: "info",
                            description: "The info the keep in the profile.",
                            type: "string",
                            required: true,
                        }
                    },
                    secret: {
                        type: "string",
                        secure: true,
                        optionDefinition: {
                            name: "secret",
                            description: "The secret info the keep in the profile.",
                            type: "string",
                            required: true,
                        }
                    }
                }
            }
        }
    ]
};

module.exports = config;
