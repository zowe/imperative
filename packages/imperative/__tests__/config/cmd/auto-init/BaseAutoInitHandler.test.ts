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
import { Imperative } from "../../../../src/Imperative";
import { ImperativeConfig } from "../../../../..";
import { FakeAutoInitHandler } from "./__data__/FakeAutoInitHandler";
import { ConnectionPropsForSessCfg } from "../../../../../rest";
import * as jestdiff from "jest-diff";
import * as stripAnsi from "strip-ansi";
import * as open from "open";

describe("BaseAutoInitHandler", () => {

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
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite
            }
        }
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
        expect(mockSave).toHaveBeenCalledTimes(1);
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
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite
            }
        }
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
        expect(mockSave).toHaveBeenCalledTimes(1);
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
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite
            }
        }
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
        expect(promptFunction).toHaveBeenCalledTimes(2);
        expect(mockActivate).toHaveBeenCalledTimes(1);
        expect(mockMerge).toHaveBeenCalledTimes(1);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it("should call init and do a dry run", async () => {
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
        const mockMerge = jest.fn();
        const mockDryRunMerge = jest.fn().mockReturnValue({
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
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                dryRunMerge: mockDryRunMerge,
                write: mockWrite,
                get: mockGet
            },
            secure: {
                secureFields: mockSecureFields,
                findSecure: mockFindSecure
            }
        }
        const diffSpy = jest.spyOn(jestdiff, 'diff');
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
        expect(mockMerge).toHaveBeenCalledTimes(0);
        expect(mockWrite).toHaveBeenCalledTimes(0);
        expect(mockSave).toHaveBeenCalledTimes(0);
        expect(mockSecureFields).toHaveBeenCalledTimes(1);
        expect(mockFindSecure).toHaveBeenCalledTimes(1);
        expect(mockDryRunMerge).toHaveBeenCalledTimes(1);
        expect(diffSpy).toHaveBeenCalledTimes(1);
        expect(stripAnsiSpy).toHaveBeenCalledTimes(1);
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
        const mockImperativeConfigApi = {
            layers: {
                activate: mockActivate,
                merge: mockMerge,
                write: mockWrite,
                get: mockGet
            }
        }
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
        expect(open).toHaveBeenCalledTimes(1);
    });
});
