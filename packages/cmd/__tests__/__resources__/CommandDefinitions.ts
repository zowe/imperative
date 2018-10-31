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

import { ICommandDefinition } from "../../src/doc/ICommandDefinition";

export const COMPLEX_COMMAND: ICommandDefinition = {
    name: "test-group",
    description: "my group",
    type: "group",
    children: [
        {
            name: "test-command",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string",
                    required: false
                }
            ]
        }
    ]
};

export const MULTIPLE_GROUPS: ICommandDefinition = {
    name: "test-outer-group",
    description: "test group",
    type: "group",
    children: [COMPLEX_COMMAND]
};

export const PASS_ON_COMPLEX_COMMAND: ICommandDefinition = {
    name: "test-group",
    description: "my group",
    type: "group",
    children: [
        {
            name: "test-command-child1",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ]
        },
        {
            name: "test-command-child2",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ]
        },
        {
            name: "test-command-child3",
            description: "my command",
            type: "command",
            enableStdin: false,
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ],
            profile: {
                required: ["apple"]
            }
        }
    ]
};

export const PASS_ON_MULTIPLE_GROUPS: ICommandDefinition = {
    name: "test-outer-group",
    description: "test group",
    type: "group",
    options: [
        {
            name: "outer-group-option",
            type: "string",
            description: "This is outer group option"
        }
    ],
    children: [PASS_ON_COMPLEX_COMMAND]
};


export const VALIDATE_COMPLEX_COMMAND: any = {
    name: "test-group",
    description: "my group",
    type: "group",
    children: [
        {
            name: "test-command-child1",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ]
        },
        {
            name: "test-command-child2",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ],
        },
        {
            name: "test-command-child3",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ],
            profile: {
                required: ["apple"]
            }
        }
    ]
};

export const VALIDATE_MULTIPLE_GROUPS: any = {
    name: "test-outer-group",
    description: "test group",
    type: "group",
    children: [VALIDATE_COMPLEX_COMMAND]
};

export const VALID_COMPLEX_COMMAND: any = {
    name: "test-group",
    description: "my group",
    type: "group",
    children: [
        {
            name: "test-command-child1",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ]
        },
        {
            name: "test-command-child2",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ],
            children: [
                {
                    name: "test-command-child-child2",
                    description: "my command",
                    type: "command",
                    options: [
                        {
                            name: "test-option",
                            description: "the option",
                            type: "string"
                        },
                        {
                            name: "test-boolean",
                            description: "the boolean option",
                            type: "boolean"
                        }
                    ],
                    positionals: [
                        {
                            name: "positional1",
                            description: "the positional option",
                            type: "string"
                        }
                    ],
                }
            ]
        },
        {
            name: "test-command-child3",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ],
            profile: {
                required: ["apple"]
            }
        }
    ]
};

export const VALID_MULTIPLE_GROUPS: any = {
    name: "test-outer-group",
    description: "test group",
    type: "group",
    children: [VALID_COMPLEX_COMMAND]
};

export const SUPRESS_OPTION_COMPLEX_COMMAND: ICommandDefinition = {
    name: "test-group",
    description: "my group",
    type: "group",
    children: [
        {
            name: "test-command-child1",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ]
        },
        {
            name: "test-command-child2",
            description: "my command",
            type: "command",
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ]
        },
        {
            name: "test-command-child3",
            description: "my command",
            type: "command",
            enableStdin: false,
            options: [
                {
                    name: "test-option",
                    description: "the option",
                    type: "string"
                },
                {
                    name: "test-boolean",
                    description: "the boolean option",
                    type: "boolean"
                }
            ],
            positionals: [
                {
                    name: "positional1",
                    description: "the positional option",
                    type: "string"
                }
            ],
            profile: {
                required: ["apple"],
                optional: ["grape"],
                suppressOptions: ["grape"]
            }
        }
    ]
};

export const SUPPRESS_OPTION_MULTIPLE_GROUPS: ICommandDefinition = {
    name: "test-outer-group",
    description: "test group",
    type: "group",
    children: [SUPRESS_OPTION_COMPLEX_COMMAND]
};

export const ORIGINAL_DEFINITIONS: ICommandDefinition[] = [
    {
        name: "test-command",
        type: "command",
        description: "Test Command",
        profile: {
            required: ["banana"],
            optional: ["apple"]
        }
    },
    {
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
    }
];
