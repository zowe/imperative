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

import { IConfig } from "../../../../../../../../packages/config";

export const expectedSchemaObject = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $version: 3,
    type: "object",
    description: "config",
    properties: {
        profiles: {
            type: "object",
            description: "named profiles config",
            patternProperties: {
                "^\\S*$": {
                    type: "object",
                    description: "a profile",
                    properties: {
                        type: {
                            description: "the profile type",
                            type: "string"
                        },
                        properties: {
                            description: "the profile properties",
                            type: "object"
                        },
                        profiles: {
                            description: "additional sub-profiles",
                            type: "object",
                            $ref: "#/properties/profiles"
                        },
                        secure: {
                            description: "secure property names",
                            type: "array",
                            prefixItems: {
                                type: "string"
                            },
                            uniqueItems: true
                        }
                    },
                    allOf: [
                        {
                            if: {
                                properties: {
                                    type: {
                                        const: "secured"
                                    }
                                }
                            },
                            then: {
                                properties: {
                                    properties: {
                                        type: "object",
                                        title: "Test Secured Fields",
                                        description: "Test Secured Fields",
                                        properties: {
                                            info: {
                                                type: "string",
                                                description: "The info the keep in the profile."
                                            },
                                            secret: {
                                                type: "string",
                                                description: "The secret info the keep in the profile."
                                            }
                                        }
                                    },
                                    secure: {
                                        prefixItems: {
                                            enum: [
                                                "secret"
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        {
                            if: {
                                properties: {
                                    type: {
                                        const: "base"
                                    }
                                }
                            },
                            then: {
                                properties: {
                                    properties: {
                                        type: "object",
                                        title: "Secure Profile",
                                        description: "Secure Profile",
                                        properties: {
                                            info: {
                                                type: "string",
                                                description: "The info the keep in the profile."
                                            },
                                            secret: {
                                                type: "string",
                                                description: "The secret info the keep in the profile."
                                            },
                                            host: {
                                                type: "string",
                                                description: "Fruit host"
                                            },
                                            port: {
                                                type: "number",
                                                description: "Fruit port"
                                            },
                                            user: {
                                                type: "string",
                                                description: "Fruit username"
                                            },
                                            password: {
                                                type: "string",
                                                description: "Fruit password"
                                            },
                                            tokenType: {
                                                type: "string",
                                                description: "Fruit token type"
                                            },
                                            tokenValue: {
                                                type: "string",
                                                description: "Fruit token value"
                                            }
                                        }
                                    },
                                    secure: {
                                        prefixItems: {
                                            enum: [
                                                "secret",
                                                "user",
                                                "password",
                                                "tokenValue"
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        },
        defaults: {
            type: "object",
            description: "default profiles config",
            properties: {
                secured: {
                    type: "string"
                },
                base: {
                    type: "string"
                }
            }
        }
    }
};

export const expectedConfigObject: IConfig = {
    $schema: "./imperative-test-cli.schema.json",
    profiles: {
        secured: {
            type: "secured",
            properties: {
                info: ""
            },
            secure: []
        },
        base: {
            type: "base",
            properties: {},
            secure: ["secret"]
        },
    },
    defaults: {
        secured: "secured",
        base: "base"
    },
    autoStore: true
};

export const expectedUserConfigObject: IConfig = {
    $schema: "./imperative-test-cli.schema.json",
    profiles: {
        secured: {
            type: "secured",
            properties: {},
            secure: []
        },
        base: {
            type: "base",
            properties: {},
            secure: []
        }
    },
    defaults: {},
    autoStore: true
};
