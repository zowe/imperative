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
import * as path from "path";
import * as lodash from "lodash";
import { IHandlerParameters } from "../../../../cmd";
import { SessConstants } from "../../../../rest";
import { CliUtils, ImperativeConfig } from "../../../../utilities";
import { Config } from "../../../../config";
import { IConfigSecureFiles } from "../../../../config/src/doc/IConfigSecure";
import { FakeAuthHandler } from "./__data__/FakeAuthHandler";

const MY_APP = "my_app";

function secureConfig(file: string, profileName: string): IConfigSecureFiles {
    return {
        [file]: {
            [`profiles.${profileName}.properties.authToken`]: `${SessConstants.TOKEN_TYPE_JWT}=fakeToken`
        }
    };
}

describe("BaseAuthHandler config", () => {
    let fakeConfig: Config;

    beforeAll(() => {
        Object.defineProperty(ImperativeConfig, "instance", {
            get: () => ({ config: fakeConfig })
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe("login", () => {
        const configPath = __dirname + `/__resources__/no_auth.config.json`;
        const fakeVault = {
            load: jest.fn(),
            save: jest.fn(),
            name: "fake"
        };

        const mockSetObj = jest.fn();
        const loginParams: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                },
                data: {
                    setObj: mockSetObj
                }
            },
            arguments: {
                user: "fakeUser",
                password: "fakePass"
            },
            positionals: ["auth", "login", "creds"]
        } as any;

        describe("default layer", () => {
            beforeEach(async () => {
                jest.spyOn(Config, "search").mockReturnValue(configPath);
                jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false);
                fakeConfig = await Config.load(MY_APP, { vault: fakeVault });
            });

            it("should show token without creating profile if showToken is specified", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                params.arguments.showToken = true;

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync");
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(writeFileSpy).not.toHaveBeenCalled();
                expect(mockSetObj).toBeCalledTimes(1);
                expect(mockSetObj.mock.calls[0][0]).toEqual({ tokenType: handler.mDefaultTokenType, tokenValue: "fakeToken" });
            });

            it("should show token without creating profile if user rejects prompt", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const promptSpy = jest.spyOn(CliUtils, "promptWithTimeout").mockResolvedValueOnce("n");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync");
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(promptSpy).toBeCalledTimes(1);
                expect(writeFileSpy).not.toHaveBeenCalled();
                expect(mockSetObj).toBeCalledTimes(1);
                expect(mockSetObj.mock.calls[0][0]).toEqual({ tokenType: handler.mDefaultTokenType, tokenValue: "fakeToken" });
            });

            it("should create new profile if user accepts prompt", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                expect(fakeConfig.properties.profiles.my_fruit_creds).toBeUndefined();

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const promptSpy = jest.spyOn(CliUtils, "promptWithTimeout").mockResolvedValueOnce("y");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(promptSpy).toBeCalledTimes(1);
                expect(writeFileSpy).toBeCalledTimes(1);
                expect(fakeVault.save).toBeCalledTimes(1);

                const expectedValue = `${handler.mDefaultTokenType}=fakeToken`;
                expect(fakeVault.save.mock.calls[0][1]).toContain(`"profiles.my_fruit_creds.properties.authToken":"${expectedValue}"`);
                expect(fakeConfig.properties.profiles.my_fruit_creds.properties).toEqual({ host: "fakeHost", port: 3000, authToken: expectedValue });

                const layer = (fakeConfig as any).layerActive();
                expect(layer.user).toBe(false);
                expect(layer.global).toBe(false);
                expect(layer.properties.defaults.fruit).toBe("my_fruit_creds");
                expect(layer.properties.secure).toContain("profiles.my_fruit_creds.properties.authToken");
            });

            it("should create new profile if existing base profile contains user/password", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                params.arguments["fruit-profile"] = "my_fruit";
                expect(fakeConfig.properties.profiles.my_fruit_creds).toBeUndefined();

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(writeFileSpy).toBeCalledTimes(1);
                expect(fakeVault.save).toBeCalledTimes(1);

                const expectedValue = `${handler.mDefaultTokenType}=fakeToken`;
                expect(fakeVault.save.mock.calls[0][1]).toContain(`"profiles.my_fruit_creds.properties.authToken":"${expectedValue}"`);
                expect(fakeConfig.properties.profiles.my_fruit_creds.properties).toEqual({ host: "fakeHost", port: 3000, authToken: expectedValue });

                const layer = (fakeConfig as any).layerActive();
                expect(layer.user).toBe(false);
                expect(layer.global).toBe(false);
                expect(layer.properties.defaults.fruit).toBe("my_fruit_creds");
                expect(layer.properties.secure).toContain("profiles.my_fruit_creds.properties.authToken");
            });

            it("should update existing base profile if it doesn't contain user/password", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                fakeConfig.api.profiles.defaultSet("fruit", "my_fruit");
                (fakeConfig as any).layerActive().properties.secure = [];

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(writeFileSpy).toBeCalledTimes(1);
                expect(fakeVault.save).toBeCalledTimes(1);
                expect(fakeConfig.properties.profiles.my_fruit_creds).toBeUndefined();

                const expectedValue = `${handler.mDefaultTokenType}=fakeToken`;
                expect(fakeVault.save.mock.calls[0][1]).toContain(`"profiles.my_fruit.properties.authToken":"${expectedValue}"`);
                expect(fakeConfig.properties.profiles.my_fruit.properties).toEqual({ protocol: "ftp", authToken: expectedValue });

                const layer = (fakeConfig as any).layerActive();
                expect(layer.user).toBe(false);
                expect(layer.global).toBe(false);
                expect(layer.properties.secure).toContain("profiles.my_fruit.properties.authToken");
            });
        });

        describe("project user layer", () => {
            beforeEach(async () => {
                jest.spyOn(Config, "search").mockReturnValueOnce(configPath).mockReturnValue("fakePath");
                jest.spyOn(fs, "existsSync")
                    .mockReturnValueOnce(true)      // Project user layer
                    .mockReturnValueOnce(false)     // Project layer
                    .mockReturnValueOnce(false)     // User layer
                    .mockReturnValueOnce(false);    // Global layer
                fakeConfig = await Config.load(MY_APP, { vault: fakeVault });
            });

            it("should update existing base profile if it doesn't contain user/password", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                fakeConfig.api.profiles.defaultSet("fruit", "my_fruit");
                (fakeConfig as any).layerActive().properties.secure = [];

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(writeFileSpy).toBeCalledTimes(1);
                expect(fakeVault.save).toBeCalledTimes(1);
                expect(fakeConfig.properties.profiles.my_fruit_creds).toBeUndefined();

                const expectedValue = `${handler.mDefaultTokenType}=fakeToken`;
                expect(fakeVault.save.mock.calls[0][1]).toContain(`"profiles.my_fruit.properties.authToken":"${expectedValue}"`);
                expect(fakeConfig.properties.profiles.my_fruit.properties).toEqual({ protocol: "ftp", authToken: expectedValue });

                const layer = (fakeConfig as any).layerActive();
                expect(layer.user).toBe(true);
                expect(layer.global).toBe(false);
                expect(layer.properties.secure).toContain("profiles.my_fruit.properties.authToken");
            });
        });

        describe("global layer", () => {
            beforeEach(async () => {
                jest.spyOn(Config, "search").mockReturnValue("fakePath");
                jest.spyOn(fs, "existsSync")
                    .mockReturnValueOnce(false)     // Project user layer
                    .mockReturnValueOnce(false)     // Project layer
                    .mockReturnValueOnce(false)     // User layer
                    .mockReturnValueOnce(true);     // Global layer
                jest.spyOn(path, "join").mockReturnValueOnce("fakePath").mockReturnValueOnce(configPath);
                fakeConfig = await Config.load(MY_APP, { homeDir: "fakeHome", vault: fakeVault });
            });

            it("should update existing base profile if it doesn't contain user/password", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                fakeConfig.api.profiles.defaultSet("fruit", "my_fruit");
                (fakeConfig as any).layerActive().properties.secure = [];

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(writeFileSpy).toBeCalledTimes(1);
                expect(fakeVault.save).toBeCalledTimes(1);
                expect(fakeConfig.properties.profiles.my_fruit_creds).toBeUndefined();

                const expectedValue = `${handler.mDefaultTokenType}=fakeToken`;
                expect(fakeVault.save.mock.calls[0][1]).toContain(`"profiles.my_fruit.properties.authToken":"${expectedValue}"`);
                expect(fakeConfig.properties.profiles.my_fruit.properties).toEqual({ protocol: "ftp", authToken: expectedValue });

                const layer = (fakeConfig as any).layerActive();
                expect(layer.user).toBe(false);
                expect(layer.global).toBe(true);
                expect(layer.properties.secure).toContain("profiles.my_fruit.properties.authToken");
            });
        });

        describe("global user layer", () => {
            beforeEach(async () => {
                jest.spyOn(Config, "search").mockReturnValue("fakePath");
                jest.spyOn(fs, "existsSync")
                    .mockReturnValueOnce(false)     // Project user layer
                    .mockReturnValueOnce(false)     // Project layer
                    .mockReturnValueOnce(true)      // User layer
                    .mockReturnValueOnce(false);    // Global layer
                jest.spyOn(path, "join").mockReturnValueOnce(configPath).mockReturnValueOnce("fakePath");
                fakeConfig = await Config.load(MY_APP, { homeDir: "fakeHome", vault: fakeVault });
            });

            it("should update existing base profile if it doesn't contain user/password", async () => {
                const handler = new FakeAuthHandler();
                const params = lodash.cloneDeep(loginParams);
                fakeConfig.api.profiles.defaultSet("fruit", "my_fruit");
                (fakeConfig as any).layerActive().properties.secure = [];

                const doLoginSpy = jest.spyOn(handler as any, "doLogin");
                const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
                let caughtError;

                try {
                    await handler.process(params);
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).toBeUndefined();
                expect(doLoginSpy).toBeCalledTimes(1);
                expect(writeFileSpy).toBeCalledTimes(1);
                expect(fakeVault.save).toBeCalledTimes(1);
                expect(fakeConfig.properties.profiles.my_fruit_creds).toBeUndefined();

                const expectedValue = `${handler.mDefaultTokenType}=fakeToken`;
                expect(fakeVault.save.mock.calls[0][1]).toContain(`"profiles.my_fruit.properties.authToken":"${expectedValue}"`);
                expect(fakeConfig.properties.profiles.my_fruit.properties).toEqual({ protocol: "ftp", authToken: expectedValue });

                const layer = (fakeConfig as any).layerActive();
                expect(layer.user).toBe(true);
                expect(layer.global).toBe(true);
                expect(layer.properties.secure).toContain("profiles.my_fruit.properties.authToken");
            });
        });
    });

    describe("logout", () => {
        const configPath = __dirname + `/__resources__/auth.config.json`;
        const fakeVault = {
            load: async () => JSON.stringify(secureConfig(configPath, "my_fruit")),
            save: jest.fn(),
            name: "fake"
        };

        const logoutParams: IHandlerParameters = {
            response: {
                console: {
                    log: jest.fn()
                }
            },
            arguments: {
                host: "fakeHost",
                port: "fakePort",
                authToken: `${SessConstants.TOKEN_TYPE_JWT}=fakeToken`
            },
            positionals: ["auth", "logout", "creds"]
        } as any;

        beforeEach(async () => {
            jest.spyOn(Config, "search").mockReturnValue(configPath);
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false);
            fakeConfig = await Config.load(MY_APP, { vault: fakeVault });
        });

        it("should logout successfully from profile specified by user", async () => {
            const handler = new FakeAuthHandler();
            const params = lodash.cloneDeep(logoutParams);
            params.arguments["fruit-profile"] = "my_fruit";

            const doLogoutSpy = jest.spyOn(handler as any, "doLogout");
            const writeFileSpy = jest.spyOn(fs, "writeFileSync").mockReturnValueOnce(undefined);
            let caughtError;

            expect(fakeConfig.properties.profiles.my_fruit.properties.authToken).toBeDefined();

            try {
                await handler.process(params);
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(doLogoutSpy).toBeCalledTimes(1);
            expect(writeFileSpy).toBeCalledTimes(1);
            expect(fakeVault.save).toBeCalledTimes(1);
            expect(fakeVault.save.mock.calls[0][1]).toBe("{}");
            expect(fakeConfig.properties.profiles.my_fruit.properties.authToken).toBeUndefined();
        });

        it("should logout successfully from default profile", async () => {
            const handler = new FakeAuthHandler();
            const params = lodash.cloneDeep(logoutParams);
            fakeConfig.api.profiles.defaultSet("fruit", "my_fruit");
            expect(fakeConfig.properties.profiles.my_fruit.properties.authToken).toBeDefined();

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
            expect(fakeVault.save).toBeCalledTimes(1);
            expect(fakeVault.save.mock.calls[0][1]).toBe("{}");
            expect(fakeConfig.properties.profiles.my_fruit.properties.authToken).toBeUndefined();
        });

        it("should logout successfully without matching token in profile", async () => {
            const handler = new FakeAuthHandler();
            const params = lodash.cloneDeep(logoutParams);
            params.arguments.authToken += "2";
            params.arguments["fruit-profile"] = "my_fruit";
            expect(fakeConfig.properties.profiles.my_fruit.properties.authToken).toBeDefined();

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
            expect(fakeConfig.properties.profiles.my_fruit.properties.authToken).toBeDefined();
        });

        it("should logout successfully without any profile", async () => {
            const handler = new FakeAuthHandler();
            const params = lodash.cloneDeep(logoutParams);

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
        });
    });
});
