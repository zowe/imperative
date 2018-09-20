/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import { join } from "path";
import { generateRandomAlphaNumericString } from "../../../__tests__/src/TestUtil";

describe("Imperative", () => {
    const loadImperative = () => {
        return require("../src/Imperative").Imperative;
    };

    const reloadExternalMocks = () => {
        jest.doMock("../src/OverridesLoader");
        jest.doMock("../src/ConfigurationLoader");
        jest.doMock("../src/ConfigurationValidator");
        jest.doMock("../src/help/ImperativeHelpGeneratorFactory");
        jest.doMock("../src/ImperativeConfig");
        jest.doMock("../src/plugins/PluginManagementFacility");
        jest.doMock("../../settings");

        const OverridesLoader = require("../src/OverridesLoader").OverridesLoader;
        const ConfigurationLoader = require("../src/ConfigurationLoader").ConfigurationLoader;
        const ConfigurationValidator = require("../src/ConfigurationValidator").ConfigurationValidator.validate;
        const AppSettings = require("../../settings").AppSettings;
        const ImperativeConfig = require("../src/ImperativeConfig").ImperativeConfig;

        return {
            OverridesLoader: {
                load: OverridesLoader.load as jest.Mock<typeof OverridesLoader.load>
            },
            ConfigurationLoader: {
                load: ConfigurationLoader.load as jest.Mock<typeof ConfigurationLoader.load>
            },
            ConfigurationValidator: {
                validate: ConfigurationValidator.validate as jest.Mock<typeof ConfigurationValidator.validate>
            },
            AppSettings: {
                initialize: AppSettings.initialize as jest.Mock<typeof AppSettings.initialize>
            },
            ImperativeConfig
        };
    };

    let mocks = reloadExternalMocks();
    let Imperative = loadImperative();

    beforeEach(() => {
        jest.resetModuleRegistry();

        // Refresh the imperative load every time
        mocks = reloadExternalMocks();
        Imperative = loadImperative();
    });

    describe("init", () => {
        let defaultConfig = {
            name: "test-cli",
            allowPlugins: false,
            overrides: {
                CredentialManager: "some-string.ts"
            }
        };

        beforeEach(() => {
            defaultConfig = {
                name: "test-cli",
                allowPlugins: false,
                overrides: {
                    CredentialManager: "some-string.ts"
                }
            };

            Imperative.initLogging = jest.fn(() => undefined);
            (Imperative as any).constructApiObject = jest.fn(() => undefined);
            (Imperative as any).initProfiles = jest.fn(() => undefined);
            (Imperative as any).defineCommands = jest.fn(() => undefined);

            mocks.ConfigurationLoader.load.mockReturnValue(defaultConfig);
            mocks.OverridesLoader.load.mockReturnValue(new Promise((resolve) => resolve()));

            /* log is a getter of a property, so mock that property.
             * log contains a debug property that is a function, so mock that also.
             */
            Object.defineProperty(Imperative, "log", {
                configurable: true,
                get: jest.fn(() => {
                    return {
                        debug: jest.fn(),
                        info: jest.fn(),
                        trace: jest.fn()
                    };
                })
            });
        });

        it("should work when passed with nothing", async () => {
            // the thing that we really want to test
            const result = await Imperative.init();

            expect(result).toBeUndefined();
            expect(mocks.OverridesLoader.load).toHaveBeenCalledTimes(1);
            expect(mocks.OverridesLoader.load).toHaveBeenCalledWith(defaultConfig);
        });

        it("should call plugin functions when plugins are allowed", async () => {
            defaultConfig.allowPlugins = true;

            // We also rely on ../src/__mocks__/ImperativeConfig.ts

            // the thing that we really want to test
            await Imperative.init();

            /* Mocks within this test script for PMF.init and PMF.addPluginsToHostCli
             * do not work. So, we rely on ../src/plugins/__mocks__/PluginManagementFacility.ts.
             * See that file for detailed comments.
             * Thus, we cannot use things like 'mockInit.toHaveBeenCalledTimes()'.
             * If we get this far without crashing, we assume that we called the mock PMF functions.
             * To verify, check code coverage for Imperative.init's calls to PMF.init and PMF.addPluginsToHostCli.
             */
            expect("We did not crash.").toBeTruthy();
        });

        describe("AppSettings", () => {
            it("should initialize an app settings instance", async () => {
                await Imperative.init();

                expect(mocks.AppSettings.initialize).toHaveBeenCalledTimes(1);
                expect(mocks.AppSettings.initialize).toHaveBeenCalledWith(
                    join(mocks.ImperativeConfig.instance.cliHome, "settings", "imperative.json"),
                    expect.any(Function)
                );
            });

            it("should create settings.json if it is missing", async () => {
                await Imperative.init();

                expect(mocks.AppSettings.initialize).toHaveBeenCalledTimes(1);

                // Mimic us executing the callback
                jest.doMock("../../io");
                jest.doMock("jsonfile");

                const { IO } = require("../../io");
                const { writeFileSync } = require("jsonfile");

                const settingsFile = generateRandomAlphaNumericString(16, true); // tslint:disable-line
                const defaultSetttings = {
                    test: generateRandomAlphaNumericString(16, true) // tslint:disable-line
                };

                const returnVal = mocks.AppSettings.initialize.mock.calls[0][1](settingsFile, defaultSetttings);

                expect(IO.createDirsSyncFromFilePath).toHaveBeenCalledTimes(1);
                expect(IO.createDirsSyncFromFilePath).toHaveBeenCalledWith(settingsFile);

                expect(writeFileSync).toHaveBeenCalledTimes(1);
                expect(writeFileSync).toHaveBeenCalledWith(settingsFile, defaultSetttings, expect.any(Object));

                expect(returnVal).toBe(defaultSetttings);


                jest.dontMock("../../io");
                jest.dontMock("jsonfile");
            });
        });
    }); // end describe init

    describe("error handling", () => {
        const loadImperativeError = () => {
            return require("../../error").ImperativeError;
        };

        // Because of how we are loading things, we have to reload the imperative error to do testing
        let ImperativeError = loadImperativeError();
        beforeEach(() => {
            ImperativeError = loadImperativeError();
        });

        it("handles a non imperative error", async () => {
            const error = new Error("Should throw this error!");
            let caughtError: Error;

            mocks.ConfigurationLoader.load.mockImplementationOnce(() => {
                throw error;
            });

            try {
                await Imperative.init();
            } catch (e) {
                caughtError = e;
            }

            expect(caughtError).toBeInstanceOf(ImperativeError);
            expect(caughtError.message).toEqual("UNEXPECTED ERROR ENCOUNTERED");
            expect((caughtError as any).details.causeErrors).toEqual(error);
        });

        it("should propagate an ImperativeError up", async () => {
            const error = new ImperativeError({
                msg: "This is an imperative error",
                additionalDetails: "Something",
                causeErrors:
                    new Error("Some internal error")
            });

            mocks.ConfigurationLoader.load.mockImplementationOnce(() => {
                throw error;
            });

            let caughtError: Error;

            try {
                await Imperative.init();
            } catch (e) {
                caughtError = e;
            }

            expect(caughtError).toBe(error);
        });
    });
});
