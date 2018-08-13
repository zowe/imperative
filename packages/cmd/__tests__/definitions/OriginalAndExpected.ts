/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import {ICommandDefinition} from "../../src/doc/ICommandDefinition";

/**
 * Interface used in the set of original and expected command definitions that are run through the command
 * preparer.
 */
export interface IDefinitionAndExpected {
    original: ICommandDefinition;
    expected: ICommandDefinition;
}

export const OriginalAndExpected: IDefinitionAndExpected[] = [
    {
        original: {
            name: "test-command",
            type: "command",
            description: "Test Command",
            profile: {
                required: ["banana"],
                optional: ["apple"]
            }
        },
        expected: {
            name: "test-command",
            type: "command",
            description: "Test Command",
            profile: {required: ["banana"]},
            options:
                [{
                    name: "response-format-json",
                    aliases: ["rfj"],
                    group: "Global options",
                    description: "Produce the command response as a JSON document",
                    type: "boolean"
                },
                    {
                        name: "help",
                        aliases: ["h"],
                        group: "Global options",
                        description: "Display help text",
                        type: "boolean"
                    },
                    {
                        name: "banana-profile",
                        aliases: ["bp"],
                        group: "Profile Options",
                        description: "The name of a (banana) profile to load for this command execution.",
                        type: "string"
                    }],
            aliases: [],
            positionals: [],
            children: []
        }
    },
    {
        original: {
            name: "test-group",
            type: "group",
            description: "Test Group",
            children: [{
                experimental: true,
                name: "test-command",
                type: "command",
                description: "Test Command",
                profile: {
                    required: ["banana"]
                }
            }]
        },
        expected: {
            name: "test-group",
            type: "group",
            description: "Test Group",
            experimental: true,
            options:
                [
                    {
                        name: "response-format-json",
                        aliases: ["rfj"],
                        group: "Global options",
                        description: "Produce the command response as a JSON document",
                        type: "boolean"
                    },
                    {
                        name: "help",
                        aliases: ["h"],
                        group: "Global options",
                        description: "Display help text",
                        type: "boolean"
                    }
                ],
            aliases: [],
            positionals: [],
            children: [
                {
                    name: "test-command",
                    type: "command",
                    description: "Test Command",
                    profile: {required: ["banana"]},
                    experimental: true,
                    options:
                        [{
                            name: "response-format-json",
                            aliases: ["rfj"],
                            group: "Global options",
                            description: "Produce the command response as a JSON document",
                            type: "boolean"
                        },
                            {
                                name: "help",
                                aliases: ["h"],
                                group: "Global options",
                                description: "Display help text",
                                type: "boolean"
                            },
                            {
                                name: "banana-profile",
                                aliases: ["bp"],
                                group: "Profile Options",
                                description: "The name of a (banana) profile to load for this command execution.",
                                type: "string"
                            }],
                    aliases: [],
                    positionals: [],
                    children: []
                }
            ]
        }
    }
];
