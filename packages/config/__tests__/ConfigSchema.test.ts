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

import { IProfileTypeConfiguration } from "../../profiles";
import { ConfigSchema } from "../src/ConfigSchema";
import { cloneDeep } from "lodash";
import { ICommandProfileTypeConfiguration } from "../..";

describe("Config Schema", () => {
    const schema = ConfigSchema;
    const testProfileConfiguration: IProfileTypeConfiguration[] = [
        {
            type: "zosmf",
            schema: {
                title: "zosmf",
                description: "A fake zosmf profile",
                type: "object",
                required: [],
                properties: {
                    host: {
                        type: "string",
                        secure: false // jest.matchObject madness!
                    }
                }
            }
        },
        {
            type: "base",
            schema: {
                title: "base",
                description: "A fake base profile",
                type: "object",
                required: [],
                properties: {
                    port: {
                        type: "number",
                        secure: false // jest.matchObject madness!
                    }
                }
            }
        }
    ];
    const testProfileConfigurationSecure: IProfileTypeConfiguration[] = [
        {
            type: "zosmf",
            schema: {
                title: "zosmf",
                description: "A fake zosmf profile",
                type: "object",
                required: [],
                properties: {
                    host: {
                        type: "string",
                        secure: true
                    }
                }
            }
        }
    ];
    const testProfileConfigurationOptionDefinition: ICommandProfileTypeConfiguration[] = [
        {
            type: "zosmf",
            schema: {
                title: "zosmf",
                description: "A fake zosmf profile",
                type: "object",
                required: [],
                properties: {
                    host: {
                        type: "string",
                        optionDefinition: {
                            name: "host",
                            aliases: ["h"], // jest.matchObject madness!
                            description: "The fake host to connect to",
                            type: "string",
                            defaultValue: "fake",
                            allowableValues: {
                                values: ["fake", "real"]
                            }
                        }
                    }
                }
            }
        }
    ];

    it("should be able to successfully build with no profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = [];
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAnyOf: any = [
          {
            if: {
                properties: {
                    type: {
                        const: null
                    }
                }
            },
            then: {
                properties: {
                    properties: {
                        additionalProperties: true,
                        title: "a generic profile",
                        type: "object"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].anyOf).toEqual(expectedAnyOf)
    });

    it("should be able to successfully build with a single profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfiguration);
        testConfig.pop();
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAnyOf: any[] = [{
            if: {
                properties: {
                    type: {
                        const: "zosmf"
                    }
                }
            },
            then: {
                properties: {
                    properties: {
                        additionalProperties: false,
                        description: "A fake zosmf profile",
                        properties: {
                            host: {
                                type: "string"
                            },
                        },
                        required: [],
                        title: "zosmf",
                        type: "object"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].anyOf.slice(1)).toEqual(expectedAnyOf)
    });

    it("should be able to successfully build with two profile type configurations", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfiguration);
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAnyOf: any[] = [
            {
                if: {
                    properties: {
                        type: {
                            const: "zosmf"
                        }
                    }
                },
                then: {
                    properties: {
                        properties: {
                            additionalProperties: false,
                            description: "A fake zosmf profile",
                            properties: {
                                host: {
                                    type: "string"
                                },
                            },
                            required: [],
                            title: "zosmf",
                            type: "object"
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
                            additionalProperties: false,
                            description: "A fake base profile",
                            properties: {
                                port: {
                                    type: "number"
                                },
                            },
                            required: [],
                            title: "base",
                            type: "object"
                        }
                    }
                }
            }
        ];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].anyOf.slice(1)).toEqual(expectedAnyOf)
    });

    it("should be able to successfully build with a secure single profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfigurationSecure);
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAnyOf: any[] = [{
            if: {
                properties: {
                    type: {
                        const: "zosmf"
                    }
                }
            },
            then: {
                properties: {
                    properties: {
                        additionalProperties: false,
                        description: "A fake zosmf profile",
                        properties: {
                            host: {
                                type: "string"
                            },
                        },
                        required: [],
                        title: "zosmf",
                        type: "object"
                    },
                    secure: {
                        prefixItems: {
                            enum: [
                                "host"
                            ]
                        }
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].anyOf.slice(1)).toEqual(expectedAnyOf)
    });

    it("should be able to successfully build with a complex single profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfigurationOptionDefinition);
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAnyOf: any[] = [{
            if: {
                properties: {
                    type: {
                        const: "zosmf"
                    }
                }
            },
            then: {
                properties: {
                    properties: {
                        additionalProperties: false,
                        description: "A fake zosmf profile",
                        properties: {
                            host: {
                                type: "string",
                                default: "fake",
                                description: "The fake host to connect to",
                                enum: ["fake", "real"]
                            },
                        },
                        required: [],
                        title: "zosmf",
                        type: "object"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].anyOf.slice(1)).toEqual(expectedAnyOf)
    });

    it("should be able to regenerate profile schemas from a schema object", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfiguration);
        const returnedSchema = schema.buildSchema(testConfig);
        const origSchemas = schema.loadProfileSchemas(returnedSchema);
        expect(origSchemas.length).toBe(3);
        expect(origSchemas[0].type).toBe(null);
        expect(origSchemas[0].schema.title).toEqual("a generic profile");
        expect(origSchemas[1].type).toBe(testConfig[0].type);
        expect(origSchemas[2].type).toBe(testConfig[1].type);
        // The comparison below needs to be done in this order since we only want to check the structure of the object
        expect(testConfig[0].schema).toMatchObject(origSchemas[1].schema);
        expect(testConfig[1].schema).toMatchObject(origSchemas[2].schema);
    });

    it("should be able to regenerate profile schemas with option definitions from a schema object", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfigurationOptionDefinition);
        const returnedSchema = schema.buildSchema(testConfig);
        const origSchemas = schema.loadProfileSchemas(returnedSchema);
        expect(origSchemas.length).toBe(2);
        expect(origSchemas[0].type).toBe(null);
        expect(origSchemas[0].schema.title).toEqual("a generic profile");
        expect(origSchemas[1].type).toBe(testConfig[0].type);
        // The comparison below needs to be done in this order since we only want to check the structure of the object
        expect(testConfig[0].schema).toMatchObject(origSchemas[1].schema);
    });
});
