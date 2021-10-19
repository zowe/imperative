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

import { IHandlerParameters } from "../../../../../cmd";
import { ImperativeConfig } from "../../../../../utilities";
import { FakeAutoInitHandler } from "./__data__/FakeAutoInitHandler";
import * as lodash from "lodash";
import * as jestdiff from "jest-diff";
import * as stripAnsi from"strip-ansi";
import * as open from "open";
import { ConfigSchema } from "../../../../../config";
import { CredentialManagerFactory } from "../../../../../security";
import { SessConstants } from "../../../../../rest";

describe("BaseAutoInitHandler", () => {
    beforeEach( async () => {
        jest.resetAllMocks();
        Object.defineProperty(CredentialManagerFactory, "initialized", { get: () => true });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should call init with basic authentication", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass"
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn();
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            }
        };
        const mockSetSchema = jest.fn();
        const buildSchemaSpy = jest.spyOn(ConfigSchema, 'buildSchema').mockImplementation();
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave,
                setSchema: mockSetSchema
            },
            loadedConfig: {
                profiles: []
            }
        });

        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(buildSchemaSpy).toHaveBeenCalledTimes(1);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(mockSetSchema).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledWith(undefined);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(1);
    });

    it("should call init with token", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                }
            },
            arguments: {
                tokenType: "fake",
                tokenValue: "fake"
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn();
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            }
        };
        const buildSchemaSpy = jest.spyOn(ConfigSchema, 'buildSchema').mockImplementation();
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        const mockSetSchema = jest.fn();

        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave,
                setSchema: mockSetSchema
            },
            loadedConfig: {
                profiles: []
            }
        });
        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(buildSchemaSpy).toHaveBeenCalledTimes(1);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(mockSetSchema).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledWith(undefined);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(1);
    });

    it("should process login successfully without creating profile on timeout", async () => {
        const handler = new FakeAutoInitHandler();
        const promptFunction = jest.fn();
        promptFunction.mockReturnValue("fake");

        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn(),
                    prompt: promptFunction
                }
            },
            arguments: {
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn();
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            }
        };
        const buildSchemaSpy = jest.spyOn(ConfigSchema, 'buildSchema').mockImplementation();
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        const mockSetSchema = jest.fn();

        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave,
                setSchema: mockSetSchema
            },
            loadedConfig: {
                profiles: []
            }
        });

        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(promptFunction).toHaveBeenCalledTimes(2);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(buildSchemaSpy).toHaveBeenCalledTimes(1);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(mockSetSchema).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledWith(undefined);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(1);
    });

    it("should call init and do a dry run with output", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                },
                data: {
                    setObj: jest.fn()
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass",
                dryRun: true
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const mockSecureFields = jest.fn().mockReturnValue([]);
        const mockFindSecure = jest.fn().mockReturnValue([]);
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            },
            secure: {
                secureFields: mockSecureFields,
                findSecure: mockFindSecure
            }
        };
        const diffSpy = jest.spyOn(jestdiff, 'diff');

        jest.mock("strip-ansi");
        const stripAnsiSpy = jest.spyOn(stripAnsi, "default");

        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave
            }
        });
        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockSave).toHaveBeenCalledTimes(0);
        expect(mockSecureFields).toHaveBeenCalledTimes(1);
        expect(mockFindSecure).toHaveBeenCalledTimes(1);
        expect(diffSpy).toHaveBeenCalledTimes(1);
        expect(stripAnsiSpy).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledWith(undefined, true);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(0);
    });

    it("should call init and do edit", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass",
                edit: true
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn();
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            }
        };
        jest.mock('open');

        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave
            }
        });

        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(0);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockSave).toHaveBeenCalledTimes(0);
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(open).toHaveBeenCalledTimes(1);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(1);
    });

    it("should call init and do overwrite", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass",
                overwrite: true,
                forSure: true
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn();
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockSet = jest.fn();
        const mockSetSchema = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet,
                set: mockSet
            }
        };
        jest.mock('open');

        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave,
                setSchema: mockSetSchema
            },
            loadedConfig: {
                profiles: []
            }
        });

        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(0);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledTimes(0);
        expect(mockSetSchema).toHaveBeenCalledTimes(1);
        expect(mockSet).toHaveBeenCalledTimes(1);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(1);
    });

    it("should call init and do a dry run and hide output", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                },
                data: {
                    setObj: jest.fn()
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass",
                dryRun: true
            },
            positionals: ["config", "auto-init"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doInitSpy = jest.spyOn(handler as any, "doAutoInit");
        const processAutoInitSpy = jest.spyOn(handler as any, "processAutoInit");
        const createSessCfgFromArgsSpy = jest.spyOn(handler as any, "createSessCfgFromArgs");
        const mockActivate = jest.fn();
        const mockMerge = jest.fn().mockReturnValue({
            exists: true,
            properties: {}
        });
        const mockWrite = jest.fn();
        const mockSave = jest.fn();
        const mockGet = jest.fn().mockReturnValue({
            exists: true,
            properties: {
                profiles: {
                    "base": {
                        properties: {
                            tokenType: SessConstants.TOKEN_TYPE_JWT,
                            tokenValue: "fakeToken"
                        },
                        secure: ["tokenValue"]
                    }
                }
            }
        });
        const mockSecureFields = jest.fn().mockReturnValue(["profiles.base.properties.tokenValue"]);
        const mockFindSecure = jest.fn().mockReturnValue([]);
        const ensureCredMgrSpy = jest.spyOn(handler as any, "ensureCredentialManagerLoaded");
        const displayAutoInitChangesSpy = jest.spyOn(handler as any, "displayAutoInitChanges");
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            },
            secure: {
                secureFields: mockSecureFields,
                findSecure: mockFindSecure
            }
        };
        const diffSpy = jest.spyOn(jestdiff, 'diff');
        const unsetSpy = jest.spyOn(lodash, "unset");
        jest.mock("strip-ansi");
        const stripAnsiSpy = jest.spyOn(stripAnsi, 'default');

        jest.spyOn(ImperativeConfig, 'instance', "get").mockReturnValue({
            config: {
                api: mockImperativeConfigApi,
                save: mockSave
            }
        });
        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockSave).toHaveBeenCalledTimes(0);
        expect(mockSecureFields).toHaveBeenCalledTimes(1);
        expect(mockFindSecure).toHaveBeenCalledTimes(1);
        expect(diffSpy).toHaveBeenCalledTimes(1);
        expect(stripAnsiSpy).toHaveBeenCalledTimes(1);
        expect(unsetSpy).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledWith(undefined, true);
        expect(ensureCredMgrSpy).toHaveBeenCalledTimes(1);
        expect(displayAutoInitChangesSpy).toHaveBeenCalledTimes(0);
    });
});
