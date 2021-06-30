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

describe("BaseAutoInitHandler", () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should call init", async () => {
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
    });

    it("should process login successfully without creating profile on timeout", async () => {
        const handler = new FakeAutoInitHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn(),
                    prompt: jest.fn()
                }
            },
            arguments: {
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
        let caughtError;

        await handler.process(params);

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeUndefined();
        expect(doInitSpy).toBeCalledTimes(1);
        expect(processAutoInitSpy).toBeCalledTimes(1);
        expect(createSessCfgFromArgsSpy).toBeCalledTimes(1);
        expect(params.response.console.prompt).toHaveBeenCalledTimes(1);
    });

    it("should fail to login with invalid token value", async () => {
        const handler = new FakeAuthHandler();
        const params: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn(),
                    prompt: jest.fn()
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass"
            },
            positionals: ["auth", "login"],
            profiles: {
                getMeta: jest.fn(() => ({
                    name: "fakeName"
                }))
            }
        } as any;

        const doLoginSpy = jest.spyOn(handler as any, "doLogin").mockResolvedValue(null);
        let caughtError;

        try {
            await handler.process(params);
        } catch (error) {
            caughtError = error;
        }

        expect(caughtError).toBeDefined();
        expect(caughtError.message).toContain("token value");
        expect(doLoginSpy).toBeCalledTimes(1);
    });
});
