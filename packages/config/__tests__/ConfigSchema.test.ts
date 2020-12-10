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


describe("Config Schema", () => {
    const schema = ConfigSchema;
    const testProfileConfiguration: IProfileTypeConfiguration[] = [
    {
        type: "zosmf",
        schema: {
            title: "zosmf",
            description: "A fake zosmf profile",
            type: "zosmf",
            required: [],
            properties: {
                host: {
                    type: "string",
                    secure: false
                }
            }
        }
    },
    {
        type: "base",
        schema: {
            title: "base",
            description: "A fake base profile",
            type: "base",
            required: [],
            properties: {
                port: {
                    type: "number",
                    secure: false
                }
            }
        }
    }];
    const testProfileConfigurationSecure: IProfileTypeConfiguration[] = [
    {
        type: "zosmf",
        schema: {
            title: "zosmf",
            description: "A fake zosmf profile",
            type: "zosmf",
            required: [],
            properties: {
                host: {
                    type: "string",
                    secure: true
                }
            }
        }
    }];
    // TODO Why doesn't type work here when optionDefinition is defined
    const testProfileConfigurationOptionDefinition: any = [
        {
            type: "zosmf",
            schema: {
                title: "zosmf",
                description: "A fake zosmf profile",
                type: "zosmf",
                required: [],
                properties: {
                    host: {
                        type: "string",
                        optionDefinition: {
                            name: "host",
                            aliases: ["h"],
                            description: "The fake host to connect to",
                            type: "string",
                            defaultValue: "fake"
                        }
                    }
                }
            }
        }];

    it("should be able to successfully build with no profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = [];
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAllOf: any = [];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf)
    });

    it("should be able to successfully build with a single profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfiguration);
        testConfig.pop();
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAllOf: any[] = [{
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
                        description: "A fake zosmf profile",
                        properties: {
                            host: {
                                type: "string"
                            },
                        },
                        required: [],
                        title: "zosmf",
                        type: "zosmf"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf)
    });

    it("should be able to successfully build with two profile type configurations", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfiguration);
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAllOf: any[] = [
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
                            description: "A fake zosmf profile",
                            properties: {
                                host: {
                                    type: "string"
                                },
                            },
                            required: [],
                            title: "zosmf",
                            type: "zosmf"
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
                            description: "A fake base profile",
                            properties: {
                                port: {
                                    type: "number"
                                },
                            },
                            required: [],
                            title: "base",
                            type: "base"
                        }
                    }
                }
            }
        ];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf)
    });

    it("should be able to successfully build with a secure single profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfigurationSecure);
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAllOf: any[] = [{
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
                        description: "A fake zosmf profile",
                        properties: {
                            host: {
                                type: "string",
                                secure: true
                            },
                        },
                        required: [],
                        title: "zosmf",
                        type: "zosmf"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf)
    });

    it("should be able to successfully build with a secure single profile type configuration", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfigurationOptionDefinition);
        const returnedSchema = schema.buildSchema(testConfig);
        const expectedAllOf: any[] = [{
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
                        description: "A fake zosmf profile",
                        properties: {
                            host: {
                                type: "string",
                                default: "fake",
                                description: "The fake host to connect to"
                            },
                        },
                        required: [],
                        title: "zosmf",
                        type: "zosmf"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf)
    });
});