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
import { IHandlerParameters } from "../../../../cmd";
import { SessConstants } from "../../../../rest";
import { ImperativeConfig } from "../../../..";
import { Config, IConfigVault } from "../../../../config";
import { IConfigSecureFiles } from "../../../../config/src/doc/IConfigSecure";
import { FakeAuthHandler } from "./__data__/FakeAuthHandler";

const MY_APP = "my_app";

function fakeVault(file: string): IConfigVault {
    const secureConfig: IConfigSecureFiles = {
        [file]: {
            "profiles.my_fruit_creds.properties.authToken": `${SessConstants.TOKEN_TYPE_JWT}=fakeToken`
        }
    };
    return {
        load: async () => JSON.stringify(secureConfig),
        save: jest.fn(),
        name: "fake"
    }
}

describe("BaseAuthHandler config", () => {
    let fakeConfig: Config;

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe("login", () => {
        beforeEach(async () => {
            const configPath = __dirname + `/__resources__/no_auth.config.json`;
            jest.spyOn(Config, "search").mockReturnValue(configPath);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false);
            fakeConfig = await Config.load(MY_APP, { vault: fakeVault(configPath) });
            Object.defineProperty(ImperativeConfig, "instance", {
                get: () => ({ config: fakeConfig })
            })
        });

        xit("should process login successfully", async () => {
            const handler = new FakeAuthHandler();
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
                positionals: ["auth", "login"],
                profiles: {
                    getMeta: jest.fn(() => ({
                        name: "fakeName"
                    }))
                }
            } as any;

            const doLoginSpy = jest.spyOn(handler as any, "doLogin");
            let caughtError;

            try {
                await handler.process(params);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(doLoginSpy).toBeCalledTimes(1);
        });
    });

    describe("logout", () => {
        const logoutParams: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                }
            },
            arguments: {
                host: "fakeHost",
                port: "fakePort",
                tokenType: SessConstants.TOKEN_TYPE_JWT,
                tokenValue: "fakeToken"
            },
            positionals: ["auth", "logout", "creds"]
        } as any;

        beforeEach(async () => {
            const configPath = __dirname + `/__resources__/auth.config.json`;
            jest.spyOn(Config, "search").mockReturnValue(configPath);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false);
            fakeConfig = await Config.load(MY_APP, { vault: fakeVault(configPath) });
            Object.defineProperty(ImperativeConfig, "instance", {
                get: () => ({ config: fakeConfig })
            })
        });

        it("should logout successfully from profile specified by user", async () => {
            const handler = new FakeAuthHandler();
            const params = { ...logoutParams };
            params.arguments["fruit-profile"] = "my_fruit_creds";

            expect(fakeConfig.properties.profiles.my_fruit_creds.properties.authToken).toBeDefined();

            const doLogoutSpy = jest.spyOn(handler as any, "doLogout");
            const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
            let caughtError;

            try {
                await handler.process(params);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(doLogoutSpy).toBeCalledTimes(1);
            expect(writeFileSpy).toBeCalledTimes(1);
            expect(fakeConfig.properties.profiles.my_fruit_creds.properties.authToken).toBeUndefined();
            expect((handler as any).mSession.ISession.tokenType).toBeUndefined();
            expect((handler as any).mSession.ISession.tokenValue).toBeUndefined();
        });

        it("should logout successfully from default profile", async () => {
            const handler = new FakeAuthHandler();
            const params = { ...logoutParams };
            fakeConfig.api.profiles.defaultSet("fruit", "my_fruit_creds");

            expect(fakeConfig.properties.profiles.my_fruit_creds.properties.authToken).toBeDefined();

            const doLogoutSpy = jest.spyOn(handler as any, "doLogout");
            const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
            let caughtError;

            try {
                await handler.process(params);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(doLogoutSpy).toBeCalledTimes(1);
            expect(writeFileSpy).toBeCalledTimes(1);
            expect(fakeConfig.properties.profiles.my_fruit_creds.properties.authToken).toBeUndefined();
            expect((handler as any).mSession.ISession.tokenType).toBeUndefined();
            expect((handler as any).mSession.ISession.tokenValue).toBeUndefined();
        });

        it("should logout successfully without matching token in profile", async () => {
            const handler = new FakeAuthHandler();
            const params = { ...logoutParams };
            params.arguments.tokenValue += "2";
            params.arguments["fruit-profile"] = "my_fruit_creds";

            expect(fakeConfig.properties.profiles.my_fruit_creds.properties.authToken).toBeDefined();

            const doLogoutSpy = jest.spyOn(handler as any, "doLogout");
            const writeFileSpy = jest.spyOn(fs, "writeFileSync");
            let caughtError;

            try {
                await handler.process(params);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(doLogoutSpy).toBeCalledTimes(1);
            expect(writeFileSpy).not.toHaveBeenCalled();
            expect(fakeConfig.properties.profiles.my_fruit_creds.properties.authToken).toBeDefined();
            expect((handler as any).mSession.ISession.tokenType).toBeUndefined();
            expect((handler as any).mSession.ISession.tokenValue).toBeUndefined();
        });

        it("should logout successfully without any profile", async () => {
            const handler = new FakeAuthHandler();
            const params = { ...logoutParams };

            const doLogoutSpy = jest.spyOn(handler as any, "doLogout");
            const writeFileSpy = jest.spyOn(fs, "writeFileSync");
            let caughtError;

            try {
                await handler.process(params);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(doLogoutSpy).toBeCalledTimes(1);
            expect(writeFileSpy).not.toHaveBeenCalled();
            expect((handler as any).mSession.ISession.tokenType).toBeUndefined();
            expect((handler as any).mSession.ISession.tokenValue).toBeUndefined();
        });
    });

    // login should work with no profile, existing profile in project config, user config
    // logout should call doLogout on token in specified profile, or default profile
    // logout should remove matching token from profile
});
