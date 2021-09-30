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
import { ICommandProfileTypeConfiguration, ImperativeConfig } from "../..";
import { IConfigLayer, IConfigUpdateSchemaHelperOptions } from "..";
import * as path from "path";

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
                type: "object",
                required: [],
                properties: {
                    port: {
                        type: "number",
                        secure: false
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
                            aliases: ["h"],
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
        const expectedAllOf: any = [];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf);
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
                        type: "object"
                    }
                }
            }
        }];
        expect(returnedSchema).toMatchSnapshot();
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf);
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
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf);
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
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf);
    });

    it("should be able to successfully build with a complex single profile type configuration", () => {
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
        expect(returnedSchema.properties.profiles.patternProperties["^\\S*$"].allOf).toEqual(expectedAllOf);
    });

    it("should be able to regenerate profile schemas from a schema object", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfiguration);
        const returnedSchema = schema.buildSchema(testConfig);
        const origSchemas = schema.loadSchema(returnedSchema);
        expect(origSchemas.length).toBe(2);
        expect(origSchemas[0].type).toBe(testConfig[0].type);
        expect(origSchemas[1].type).toBe(testConfig[1].type);
        // The comparison below needs to be done in this order since we only want to check the structure of the object
        expect(testConfig[0].schema).toMatchObject(origSchemas[0].schema);
        expect(testConfig[1].schema).toMatchObject(origSchemas[1].schema);
    });

    it("should be able to regenerate profile schemas with option definitions from a schema object", () => {
        const testConfig: IProfileTypeConfiguration[] = cloneDeep(testProfileConfigurationOptionDefinition);
        const returnedSchema = schema.buildSchema(testConfig);
        const origSchemas = schema.loadSchema(returnedSchema);
        expect(origSchemas.length).toBe(1);
        expect(origSchemas[0].type).toBe(testConfig[0].type);
        // The comparison below needs to be done in this order since we only want to check the structure of the object
        expect(testConfig[0].schema).toMatchObject(origSchemas[0].schema);
    });

    describe("Function: updateSchema;", () => {
        const fakeSchema: any = "this is a fake schema, how cool is that?";
        const fakeUpdatesPaths: any = { cool: "and this are the updated paths. neat, right?" };
        const fakeLayer: IConfigLayer = {
            exists: true,
            global: false,
            user: false,
            path: "/fake/path/to/fake.config.json",
            properties: null,
        };
        let spyConfigApiLayersActivate: any = jest.fn();
        const fakeInstance = {
            loadedConfig: {},
            config: {
                api: {
                    layers: {
                        get: jest.fn().mockReturnValue(fakeLayer),
                        activate: spyConfigApiLayersActivate,
                    },
                },
            },
        };
        const originalImperativeConfig = cloneDeep(ImperativeConfig.instance);
        beforeEach(() => {
            jest.restoreAllMocks();

            jest.spyOn(ConfigSchema, "buildSchema").mockReturnValue(fakeSchema);
            Object.defineProperty(ImperativeConfig, "instance", {
                get: () => fakeInstance
            });
        });
        afterAll(() => {
            Object.defineProperty(ImperativeConfig, "instance", {
                get: () => originalImperativeConfig
            });
        });

        it("should update the schema without any parameters", () => {
            const mySpy = jest.spyOn((ConfigSchema as any), "_updateSchemaActive").mockReturnValue(fakeUpdatesPaths);
            expect(ConfigSchema.updateSchema()).toEqual(fakeUpdatesPaths);
            expect(mySpy).toHaveBeenCalledWith({
                layer: fakeLayer,
                config: fakeInstance.config,
                updatedPaths: {},
                updateOptions: {
                    depth: 0,
                    layer: "active",
                    schema: fakeSchema,
                },
            });
        });

        it("should update the schema with a given schema and layer", () => {
            const mySpy = jest.spyOn((ConfigSchema as any), "_updateSchemaGlobal").mockReturnValue(fakeUpdatesPaths);
            expect(ConfigSchema.updateSchema({ schema: fakeSchema, layer: "global" })).toEqual(fakeUpdatesPaths);
            expect(mySpy).toHaveBeenCalledWith({
                layer: fakeLayer,
                config: fakeInstance.config,
                updatedPaths: {},
                updateOptions: {
                    depth: 0,
                    layer: "global",
                    schema: fakeSchema,
                },
            });
        });

        it("should update the schema with a given schema, layer, and depth", () => {
            const mySpy = jest.spyOn((ConfigSchema as any), "_updateSchemaAll").mockReturnValue(fakeUpdatesPaths);
            expect(ConfigSchema.updateSchema({ schema: fakeSchema, layer: "all", depth: 100 })).toEqual(fakeUpdatesPaths);
            expect(mySpy).toHaveBeenCalledWith({
                layer: fakeLayer,
                config: fakeInstance.config,
                updatedPaths: {},
                updateOptions: {
                    depth: 100,
                    layer: "all",
                    schema: fakeSchema,
                },
            });
        });

        it("should throw an error if the layer is unknown", () => {
            const mySpy = jest.spyOn((ConfigSchema as any), "_updateSchemaAll").mockReturnValue(fakeUpdatesPaths);
            let caughtError = null;
            let result = null;
            try {
                result = ConfigSchema.updateSchema({ schema: fakeSchema, layer: "fake" } as any);
            } catch (err) {
                caughtError = err;
            }
            expect(result).toBe(null);
            expect(caughtError.message).toContain("Unrecognized layer parameter for ConfigSchema.updateSchemas");
            expect(mySpy).not.toHaveBeenCalled();
        });

        describe("Helper: _Active", () => {
            it("should update the schema", () => {
                // TODO: just do it :)
                expect(true).toBe(true);
            });
        });

        describe("Helper: _Global", () => {
            it("should update the schema", () => {
                const mySpy = jest.spyOn((ConfigSchema as any), "_updateSchemaActive").mockReturnValue(fakeUpdatesPaths);
                const anyConfigSchema: any = ConfigSchema;
                const opts: IConfigUpdateSchemaHelperOptions = {
                    layer: fakeLayer,
                    config: fakeInstance.config as any,
                    updatedPaths: {},
                    updateOptions: {
                        depth: 0,
                        layer: "active",
                        schema: fakeSchema,
                    },
                }
                expect(anyConfigSchema._updateSchemaGlobal(opts)).toEqual(fakeUpdatesPaths);
                expect(mySpy).toHaveBeenCalledWith(opts);
                expect(spyConfigApiLayersActivate).toHaveBeenCalledTimes(2);
                expect(spyConfigApiLayersActivate).toBeCalledWith(false, true);
                expect(spyConfigApiLayersActivate).toBeCalledWith(fakeLayer.user, fakeLayer.global, path.dirname(fakeLayer.path));
            });
        });

        describe("Helper: _All", () => {
            it("should update the schema", () => {
                // TODO: just do it :)
                expect(true).toBe(true);
            });
        });
    });
});
