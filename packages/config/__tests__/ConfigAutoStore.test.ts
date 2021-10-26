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

import { AbstractAuthHandler } from "../../imperative";
import { SessConstants } from "../../rest";
import { ImperativeConfig } from "../../utilities";
import { IConfig } from "../src/doc/IConfig";
import { IConfigLoadedProfile } from "../src/doc/IConfigLoadedProfile";
import { Config } from "../src/Config";
import { ConfigAutoStore } from "../src/ConfigAutoStore";
import { ConfigLayers, ConfigProfiles } from "../src/api";

function mockConfigApi(properties: IConfig): Config {
    const config: any = {
        exists: true,
        properties
    };
    config.api = {
        layers: new ConfigLayers(config),
        profiles: new ConfigProfiles(config)
    };
    return config;
}

describe("ConfigAutoStore tests", () => {
    beforeAll(() => {
        jest.spyOn(ImperativeConfig.instance, "loadedConfig", "get").mockReturnValue({
            profiles: [
                {
                    type: "base",
                    authConfig: [
                        {
                            handler: __dirname + "/../../imperative/src/auth/__tests__/__data__/FakeAuthHandler"
                        }
                    ]
                } as any
            ]
        });
    });

    describe("findAuthHandlerForProfile", () => {
        it("should be able to find auth handler for base profile", () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
                profiles: {
                    base: {
                        type: "base",
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        }
                    }
                },
                defaults: { base: "base" }
            }));

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeDefined();
            expect(authHandler instanceof AbstractAuthHandler).toBe(true);
        });

        it("should be able to find auth handler for service profile", () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
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
            }));

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.zosmf", {} as any);
            expect(authHandler).toBeDefined();
            expect(authHandler instanceof AbstractAuthHandler).toBe(true);
        });

        it("should not find auth handler if profile does not exist", () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
                profiles: {},
                defaults: {}
            }));

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeUndefined();
        });

        it("should not find auth handler if profile type is undefined", () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
                profiles: {
                    base: {
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT
                        }
                    }
                },
                defaults: { base: "base" }
            }));

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeUndefined();
        });

        it("should not find auth handler if profile token type is undefined", () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
                profiles: {
                    base: {
                        type: "base",
                        properties: {}
                    }
                },
                defaults: { base: "base" }
            }));

            const authHandler = ConfigAutoStore.findAuthHandlerForProfile("profiles.base", {} as any);
            expect(authHandler).toBeUndefined();
        });

        it("should not find auth handler if profile base path is undefined", () => {
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
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
            }));

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
        let findActiveProfileSpy: any;

        beforeAll(() => {
            findActiveProfileSpy = jest.spyOn(ConfigAutoStore as any, "findActiveProfile");
        });

        afterEach(() => {
            jest.clearAllMocks();
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
            jest.spyOn(ImperativeConfig.instance, "config", "get").mockReturnValue(mockConfigApi({
                profiles: {},
                defaults: {},
                autoStore: false
            }));
            await ConfigAutoStore.storeSessCfgProps(null, {}, ["host"]);
            expect(findActiveProfileSpy).not.toHaveBeenCalled();
        });
    });
});
