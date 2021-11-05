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

import * as fs from "fs";
import * as os from "os";
import { AbstractAuthHandler } from "../../imperative";
import { SessConstants } from "../../rest";
import { ImperativeConfig } from "../../utilities";
import { IConfig } from "../src/doc/IConfig";
import { IConfigLoadedProfile } from "../src/doc/IConfigLoadedProfile";
import { Config } from "../src/Config";
import { ConfigAutoStore } from "../src/ConfigAutoStore";

// Load the ImperativeConfig so config can work properly
async function setupConfigToLoad(properties: IConfig): Promise<void> {
    // One-time mocks
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify(properties));
    jest.spyOn(Config, "search").mockReturnValueOnce("fakeapp.config.user.json")
        .mockReturnValueOnce("fakeapp.config.json"); // Give search something to return

    // Permanent mocks
    const osHomedirSpy = jest.spyOn(os, "homedir").mockReturnValue(__dirname); // Pretend the current directory is the homedir
    const processCwdSpy = jest.spyOn(process, "cwd").mockReturnValue(__dirname); // Pretend the current directory is where the command was invoked
    const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValue(false); // Only the user config exists

    const fakeConfig = await Config.load("fakeapp");
    jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(fakeConfig);

    // Undo permanent mocks
    osHomedirSpy.mockRestore();
    processCwdSpy.mockRestore();
    existsSyncSpy.mockRestore();
}

describe("ConfigAutoStore tests", () => {
    beforeAll(() => {
        const baseProfileConfig: any = {
            type: "base",
            authConfig: [
                {
                    handler: __dirname + "/../../imperative/src/auth/__tests__/__data__/FakeAuthHandler"
                }
            ],
            schema: {
                properties: {
                    host: { type: "string" },
                    user: { type: "string", secure: true },
                    password: { type: "string", secure: true },
                    tokenType: { type: "string" },
                    tokenValue: { type: "string", secure: true }
                }
            }
        };
        jest.spyOn(ImperativeConfig.instance, "loadedConfig", "get").mockReturnValue({
            baseProfile: baseProfileConfig,
            profiles: [
                {
                    type: "fruit",
                    schema: baseProfileConfig.schema
                },
                baseProfileConfig
            ]
        });
    });

    describe("findAuthHandlerForProfile", () => {
        it("should be able to find auth handler for base profile", async () => {
            await setupConfigToLoad({
                profiles: {
                    base: {
                        type: "base",
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        }
                    }
                },
                defaults: { base: "base" }
            });

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeDefined();
            expect(authHandler instanceof AbstractAuthHandler).toBe(true);
        });

        it("should be able to find auth handler for service profile", async () => {
            await setupConfigToLoad({
                profiles: {
                    base: {
                        type: "base",
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        }
                    },
                    zosmf: {
                        type: "zosmf",
                        properties: {
                            basePath: "/ibmzosmf/api/v1"
                        }
                    }
                },
                defaults: { base: "base", zosmf: "zosmf" }
            });

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.zosmf", {} as any);
            expect(authHandler).toBeDefined();
            expect(authHandler instanceof AbstractAuthHandler).toBe(true);
        });

        it("should not find auth handler if profile does not exist", async () => {
            await setupConfigToLoad({
                profiles: {},
                defaults: {}
            });

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeUndefined();
        });

        it("should not find auth handler if profile type is undefined", async () => {
            await setupConfigToLoad({
                profiles: {
                    base: {
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        }
                    }
                },
                defaults: { base: "base" }
            });

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeUndefined();
        });

        it("should not find auth handler if profile token type is undefined", async () => {
            await setupConfigToLoad({
                profiles: {
                    base: {
                        type: "base",
                        properties: {}
                    }
                },
                defaults: { base: "base" }
            });

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeUndefined();
        });

        it("should not find auth handler if profile base path is undefined", async () => {
            await setupConfigToLoad({
                profiles: {
                    base: {
                        type: "base",
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        }
                    },
                    zosmf: {
                        type: "zosmf",
                        properties: {}
                    }
                },
                defaults: { base: "base", zosmf: "zosmf" }
            });

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.zosmf", {} as any);
            expect(authHandler).toBeUndefined();
        });
    });

    describe("getPriorityLayer", () => {
        it("should choose project layer", () => {
            const loadedProfile: IConfigLoadedProfile = {
                properties: {
                    host: {
                        secure: false,
                        user: false,
                        global: false
                    },
                    user: {
                        secure: true,
                        user: true,
                        global: false
                    }
                }
            };
            const { user, global } = ConfigAutoStore.getPriorityLayer(loadedProfile);
            expect(user).toBe(false);
            expect(global).toBe(false);
        });

        it("should choose global layer", () => {
            const loadedProfile: IConfigLoadedProfile = {
                properties: {
                    host: {
                        secure: false,
                        user: false,
                        global: true
                    },
                    user: {
                        secure: true,
                        user: true,
                        global: false
                    }
                }
            };
            const { user, global } = ConfigAutoStore.getPriorityLayer(loadedProfile);
            expect(user).toBe(false);
            expect(global).toBe(true);
        });

        it("should choose project user layer", () => {
            const loadedProfile: IConfigLoadedProfile = {
                properties: {
                    host: {
                        secure: false,
                        user: true,
                        global: false
                    },
                    user: {
                        secure: true,
                        user: true,
                        global: false
                    }
                }
            };
            const { user, global } = ConfigAutoStore.getPriorityLayer(loadedProfile);
            expect(user).toBe(true);
            expect(global).toBe(false);
        });

        it("should choose global user layer", () => {
            const loadedProfile: IConfigLoadedProfile = {
                properties: {
                    host: {
                        secure: false,
                        user: true,
                        global: true
                    },
                    user: {
                        secure: true,
                        user: true,
                        global: false
                    }
                }
            };
            const { user, global } = ConfigAutoStore.getPriorityLayer(loadedProfile);
            expect(user).toBe(true);
            expect(global).toBe(true);
        });
    });

    describe("storeSessCfgProps", () => {
        const handlerParams = {
            arguments: {},
            definition: {
                profile: {
                    required: ["fruit"],
                    optional: ["base"]
                }
            },
            response: {
                console: {
                    log: jest.fn()
                }
            }
        };
        let findActiveProfileSpy: any;

        beforeEach(() => {
            findActiveProfileSpy = jest.spyOn(ConfigAutoStore as any, "findActiveProfile");
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it("should store user and password in base profile for basic auth", async () => {
            await setupConfigToLoad({
                profiles: {
                    fruit: {
                        type: "fruit",
                        properties: {},
                    },
                    base: {
                        type: "base",
                        properties: {
                            host: "example.com"
                        },
                        secure: ["user", "password"]
                    }
                },
                defaults: { fruit: "fruit", base: "base" },
                autoStore: true
            });
            ImperativeConfig.instance.config.save = jest.fn();

            const propsToAdd = {
                user: "admin",
                password: "123456"
            };
            await ConfigAutoStore.storeSessCfgProps(handlerParams as any, {
                hostname: "example.com",
                type: SessConstants.AUTH_TYPE_BASIC,
                ...propsToAdd
            }, ["user", "password"]);

            expect(ImperativeConfig.instance.config.save).toHaveBeenCalled();
            expect(ImperativeConfig.instance.config.properties.profiles.base.properties).toMatchObject({
                host: "example.com",
                ...propsToAdd
            });
        });

        it("should store user and password in service profile for basic auth", async () => {
            await setupConfigToLoad({
                profiles: {
                    fruit: {
                        type: "fruit",
                        properties: {},
                        secure: ["user", "password"]
                    },
                    base: {
                        type: "base",
                        properties: {
                            host: "example.com"
                        }
                    }
                },
                defaults: { fruit: "fruit", base: "base" },
                autoStore: true
            });
            ImperativeConfig.instance.config.save = jest.fn();

            const propsToAdd = {
                user: "admin",
                password: "123456"
            };
            await ConfigAutoStore.storeSessCfgProps(handlerParams as any, {
                hostname: "example.com",
                type: SessConstants.AUTH_TYPE_BASIC,
                ...propsToAdd
            }, ["user", "password"]);

            expect(ImperativeConfig.instance.config.save).toHaveBeenCalled();
            expect(ImperativeConfig.instance.config.properties.profiles.fruit.properties).toMatchObject(propsToAdd);
        });

        it("should store token value in base profile for token auth", async () => {
            await setupConfigToLoad({
                profiles: {
                    fruit: {
                        type: "fruit",
                        properties: {
                            basePath: "/apple/api/v1"
                        },
                    },
                    base: {
                        type: "base",
                        properties: {
                            host: "example.com",
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        },
                        secure: ["tokenValue"]
                    }
                },
                defaults: { fruit: "fruit", base: "base" },
                autoStore: true
            });
            ImperativeConfig.instance.config.save = jest.fn();

            const propsToAdd = {
                user: "admin",
                password: "123456"
            };
            await ConfigAutoStore.storeSessCfgProps(handlerParams as any, {
                hostname: "example.com",
                type: SessConstants.AUTH_TYPE_BASIC,
                ...propsToAdd
            }, ["user", "password"]);

            expect(ImperativeConfig.instance.config.save).toHaveBeenCalled();
            expect(ImperativeConfig.instance.config.properties.profiles.base.properties).toMatchObject({
                host: "example.com",
                tokenType: SessConstants.TOKEN_TYPE_JWT,
                tokenValue: "fakeToken"
            });
        });

        it("should store token value in service profile for token auth", async () => {
            await setupConfigToLoad({
                profiles: {
                    fruit: {
                        type: "fruit",
                        properties: {
                            basePath: "/apple/api/v1",
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        },
                    },
                    base: {
                        type: "base",
                        properties: {
                            host: "example.com"
                        }
                    }
                },
                defaults: { fruit: "fruit", base: "base" },
                autoStore: true
            });
            ImperativeConfig.instance.config.save = jest.fn();

            const propsToAdd = {
                user: "admin",
                password: "123456"
            };
            await ConfigAutoStore.storeSessCfgProps(handlerParams as any, {
                hostname: "example.com",
                type: SessConstants.AUTH_TYPE_BASIC,
                ...propsToAdd
            }, ["user", "password"]);

            expect(ImperativeConfig.instance.config.save).toHaveBeenCalled();
            expect(ImperativeConfig.instance.config.properties.profiles.fruit.properties).toMatchObject({
                tokenType: SessConstants.TOKEN_TYPE_JWT,
                tokenValue: "fakeToken"
            });
            expect(ImperativeConfig.instance.config.properties.profiles.fruit.secure).toEqual(["tokenValue"]);
        });

        it("should do nothing if property list is empty", async () => {
            await ConfigAutoStore.storeSessCfgProps(null, {}, []);
            expect(findActiveProfileSpy).not.toHaveBeenCalled();
        });

        it("should do nothing if team config does not exist", async () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue({ exists: false } as any);
            await ConfigAutoStore.storeSessCfgProps(null, {}, ["host"]);
            expect(findActiveProfileSpy).not.toHaveBeenCalled();
        });

        it("should do nothing if team config has auto-store disabled", async () => {
            await setupConfigToLoad({
                profiles: {},
                defaults: {},
                autoStore: false
            });
            await ConfigAutoStore.storeSessCfgProps(null, {}, ["host"]);
            expect(findActiveProfileSpy).not.toHaveBeenCalled();
        });

        it("should do nothing if no active profile is found", async () => {
            await setupConfigToLoad({
                profiles: {},
                defaults: {},
                autoStore: true
            });
            ImperativeConfig.instance.config.save = jest.fn();

            await ConfigAutoStore.storeSessCfgProps(handlerParams as any, {}, ["host", "hostess"]);
            expect(findActiveProfileSpy).toHaveBeenCalled();
            expect(ImperativeConfig.instance.config.save).not.toHaveBeenCalled();
        });
    });

    describe("findActiveProfile", () => {
        it("should find profile in command arguments", async () => {
            await setupConfigToLoad({
                profiles: {
                    apple: {
                        type: "fruit",
                        properties: {}
                    }
                },
                defaults: { fruit: "apple" }
            });

            const handlerParams = {
                arguments: {
                    "fruit-profile": "orange"
                },
                definition: {
                    profile: {
                        required: ["fruit"],
                        optional: ["base"]
                    }
                }
            };

            const profileData = (ConfigAutoStore as any).findActiveProfile(handlerParams, ["host"]);
            expect(profileData).toEqual(["fruit", "orange"]);
        });

        it("should find profile in config properties", async () => {
            await setupConfigToLoad({
                profiles: {
                    apple: {
                        type: "fruit",
                        properties: {}
                    }
                },
                defaults: { fruit: "apple" }
            });

            const handlerParams = {
                arguments: {},
                definition: {
                    profile: {
                        required: ["fruit"],
                        optional: ["base"]
                    }
                }
            };

            const profileData = (ConfigAutoStore as any).findActiveProfile(handlerParams, ["host"]);
            expect(profileData).toEqual(["fruit", "apple"]);
        });

        it("should fall back to default profile name", async () => {
            await setupConfigToLoad({
                profiles: {},
                defaults: {}
            });

            const handlerParams = {
                arguments: {},
                definition: {
                    profile: {
                        required: ["fruit"],
                        optional: ["base"]
                    }
                }
            };

            const profileData = (ConfigAutoStore as any).findActiveProfile(handlerParams, ["host"]);
            expect(profileData).toEqual(["fruit", "fruit"]);
        });

        it("should not find profile if missing from command definition", async () => {
            await setupConfigToLoad({
                profiles: {},
                defaults: {}
            });

            const handlerParams = {
                arguments: {},
                definition: {
                    profile: {}
                }
            };

            const profileData = (ConfigAutoStore as any).findActiveProfile(handlerParams, ["host"]);
            expect(profileData).toBeUndefined();
        });

        it("should not find profile if schema is missing required properties", async () => {
            await setupConfigToLoad({
                profiles: {},
                defaults: {}
            });

            const handlerParams = {
                arguments: {},
                definition: {
                    profile: {
                        required: ["fruit"],
                        optional: ["base"]
                    }
                }
            };

            const profileData = (ConfigAutoStore as any).findActiveProfile(handlerParams, ["host", "hostess"]);
            expect(profileData).toBeUndefined();
        });
    });

    describe("fetchTokenForSessCfg", () => {
        it("should fetch token when auth handler is found", async () => {
            const mockLoginHandler = jest.fn();
            jest.spyOn(ConfigAutoStore, "findAuthHandlerForProfile").mockReturnValueOnce({
                getPromptParams: () => [
                    { defaultTokenType: SessConstants.TOKEN_TYPE_JWT },
                    mockLoginHandler
                ]
            } as any);

            const fetched = await (ConfigAutoStore as any).fetchTokenForSessCfg({}, {
                hostname: "example.com",
                user: "admin",
                password: "123456"
            }, null);

            expect(fetched).toBe(true);
            expect(mockLoginHandler).toHaveBeenCalled();
            expect((mockLoginHandler.mock.calls[0][0] as any).ISession).toMatchObject({
                hostname: "example.com",
                type: SessConstants.AUTH_TYPE_TOKEN,
                tokenType: SessConstants.TOKEN_TYPE_JWT
            });
        });

        it("should do nothing when auth handler is not found", async () => {
            jest.spyOn(ConfigAutoStore, "findAuthHandlerForProfile").mockReturnValueOnce(undefined);

            const fetched = await (ConfigAutoStore as any).fetchTokenForSessCfg({}, {}, null);

            expect(fetched).toBe(false);
        });
    });
});
