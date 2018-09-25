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

import Mock = jest.Mock;
import { join } from "path";
import { generateRandomAlphaNumericString } from "../../../__tests__/src/TestUtil";
import { IImperativeOverrides } from "../src/doc/IImperativeOverrides";
import { IConfigLogging } from "../../logger";
import { IImperativeEnvironmentalVariableSettings } from "..";

describe("Imperative", () => {
    const loadImperative = () => {
        return require("../src/Imperative").Imperative;
    };

    const reloadExternalMocks = () => {
        try {
            jest.doMock("../src/OverridesLoader");
            jest.doMock("../src/LoggingConfigurer");
            jest.doMock("../src/ConfigurationLoader");
            jest.doMock("../src/ConfigurationValidator");
            jest.doMock("../src/help/ImperativeHelpGeneratorFactory");
            jest.doMock("../src/ImperativeConfig");
            jest.doMock("../src/plugins/PluginManagementFacility");
            jest.doMock("../../settings/src/AppSettings");
            jest.doMock("../../logger/src/Logger");
            jest.doMock("../src/env/EnvironmentalVariableSettings");

            const {OverridesLoader} = require("../src/OverridesLoader");
            const {LoggingConfigurer} = require("../src/LoggingConfigurer");
            const {ConfigurationLoader} = require("../src/ConfigurationLoader");
            const ConfigurationValidator = require("../src/ConfigurationValidator").ConfigurationValidator.validate;
            const {AppSettings} = require("../../settings");
            const {ImperativeConfig} = require("../src/ImperativeConfig");
            const {PluginManagementFacility} = require("../src/plugins/PluginManagementFacility");
            const {Logger} = require("../../logger");
            const {EnvironmentalVariableSettings} = require("../src/env/EnvironmentalVariableSettings");

            return {
                OverridesLoader: {
                    load: OverridesLoader.load as Mock<typeof OverridesLoader.load>
                },
                ConfigurationLoader: {
                    load: ConfigurationLoader.load as Mock<typeof ConfigurationLoader.load>
                },
                ConfigurationValidator: {
                    validate: ConfigurationValidator.validate as Mock<typeof ConfigurationValidator.validate>
                },
                AppSettings: {
                    initialize: AppSettings.initialize as Mock<typeof AppSettings.initialize>
                },
                ImperativeConfig,
                PluginManagementFacility,
                LoggingConfigurer,
                Logger,
                EnvironmentalVariableSettings
            };
        } catch (error) {
            // If we error here, jest silently fails and says the test is empty. So let's make sure
            // that doesn't happen!

            const { Logger } = (jest as any).requireActual("../../logger/src/Logger");

            Logger.getConsoleLogger().fatal("Imperative.test.ts test execution error!");
            Logger.getConsoleLogger().fatal(error);

            throw error;
        }
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

            (Imperative as any).constructApiObject = jest.fn(() => undefined);
            (Imperative as any).initProfiles = jest.fn(() => undefined);
            (Imperative as any).defineCommands = jest.fn(() => undefined);

            mocks.ConfigurationLoader.load.mockReturnValue(defaultConfig);
            mocks.OverridesLoader.load.mockReturnValue(new Promise((resolve) => resolve()));
        });

        it("should work when passed with nothing", async () => {
            // the thing that we really want to test
            const result = await Imperative.init();

            expect(result).toBeUndefined();
            expect(mocks.OverridesLoader.load).toHaveBeenCalledTimes(1);
            expect(mocks.OverridesLoader.load).toHaveBeenCalledWith(defaultConfig);
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

                const {IO} = require("../../io");
                const {writeFileSync} = require("jsonfile");

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
        }); // End AppSettings

        describe("Plugins", () => {
            let PluginManagementFacility = mocks.PluginManagementFacility;

            beforeEach(() => {
                defaultConfig.allowPlugins = true;
                PluginManagementFacility = mocks.PluginManagementFacility;
            });

            it("should call plugin functions when plugins are allowed", async () => {
                await Imperative.init();

                expect(PluginManagementFacility.instance.init).toHaveBeenCalledTimes(1);
                expect(PluginManagementFacility.instance.loadAllPluginCfgProps).toHaveBeenCalledTimes(1);

                expect(PluginManagementFacility.instance.addAllPluginsToHostCli).toHaveBeenCalledTimes(1);
                expect(
                    PluginManagementFacility.instance.addAllPluginsToHostCli
                ).toHaveBeenCalledWith(mocks.ImperativeConfig.instance.resolvedCmdTree);
            });

            // @FUTURE When there are more overrides we should think about making this function dynamic
            it("should allow a plugin to override modules", async () => {
                const testOverrides: IImperativeOverrides = {
                    CredentialManager: generateRandomAlphaNumericString(16) //tslint:disable-line
                };

                // Formulate a deep copy of the expected overrides. Ensures that we are comparing values
                // and not references to values.
                const expectedConfig = JSON.parse(JSON.stringify(defaultConfig));
                Object.assign(expectedConfig.overrides, JSON.parse(JSON.stringify(testOverrides)));

                PluginManagementFacility.instance.pluginOverrides = testOverrides;

                await Imperative.init();

                expect(mocks.ImperativeConfig.instance.loadedConfig).toEqual(expectedConfig);
            });

            it("should not override modules not specified by a plugin", async () => {
                const expectedConfig = JSON.parse(JSON.stringify(defaultConfig));

                PluginManagementFacility.instance.pluginOverrides = {};

                await Imperative.init();

                expect(mocks.ImperativeConfig.instance.loadedConfig).toEqual(expectedConfig);
            });
        }); // End Plugins

        describe("Logging", () => {
            it("should properly call external methods", async () => {
                await Imperative.init();

                expect(mocks.LoggingConfigurer.configureLogger).toHaveBeenCalledTimes(1);
                expect(mocks.LoggingConfigurer.configureLogger).toHaveBeenCalledWith(
                    mocks.ImperativeConfig.instance.cliHome,
                    mocks.ImperativeConfig.instance.loadedConfig
                );

                expect(mocks.Logger.initLogger).toHaveBeenCalledTimes(1);
                expect(mocks.Logger.initLogger).toHaveBeenCalledWith(
                    mocks.LoggingConfigurer.configureLogger("a", {})
                );
            });

            describe("Environmental Var", () => {
                let loggingConfig: IConfigLogging;
                let envConfig: IImperativeEnvironmentalVariableSettings;

                const goodLevel = "WARN";
                const badLevel = "NOGOOD";

                beforeEach(() => {
                    loggingConfig = mocks.LoggingConfigurer.configureLogger("dont care", {});
                    envConfig = mocks.EnvironmentalVariableSettings.read(Imperative.envVariablePrefix);
                });

                it("should handle a valid imperative log level", async () => {
                    envConfig.imperativeLogLevel.value = goodLevel;
                    loggingConfig.log4jsConfig.categories[mocks.Logger.DEFAULT_IMPERATIVE_NAME].level = goodLevel;

                    mocks.EnvironmentalVariableSettings.read.mockReturnValue(envConfig);
                    mocks.Logger.isValidLevel.mockReturnValue(true);

                    await Imperative.init();

                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledWith(goodLevel);

                    expect(mocks.Logger.initLogger).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.initLogger).toHaveBeenCalledWith(loggingConfig);
                });

                it("should handle an invalid imperative log level", async () => {
                    envConfig.imperativeLogLevel.value = badLevel;

                    mocks.EnvironmentalVariableSettings.read.mockReturnValue(envConfig);
                    mocks.Logger.isValidLevel.mockReturnValue(false);

                    await Imperative.init();

                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledWith(badLevel);

                    expect(mocks.Logger.initLogger).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.initLogger).toHaveBeenCalledWith(loggingConfig);
                });

                it("should handle a valid app log level", async () => {
                    envConfig.appLogLevel.value = goodLevel;
                    loggingConfig.log4jsConfig.categories[mocks.Logger.DEFAULT_APP_NAME].level = goodLevel;

                    mocks.EnvironmentalVariableSettings.read.mockReturnValue(envConfig);
                    mocks.Logger.isValidLevel.mockReturnValue(true);

                    await Imperative.init();

                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledWith(goodLevel);

                    expect(mocks.Logger.initLogger).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.initLogger).toHaveBeenCalledWith(loggingConfig);
                });

                it("should handle an invalid imperative log level", async () => {
                    envConfig.appLogLevel.value = badLevel;

                    mocks.EnvironmentalVariableSettings.read.mockReturnValue(envConfig);
                    mocks.Logger.isValidLevel.mockReturnValue(false);

                    await Imperative.init();

                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.isValidLevel).toHaveBeenCalledWith(badLevel);

                    expect(mocks.Logger.initLogger).toHaveBeenCalledTimes(1);
                    expect(mocks.Logger.initLogger).toHaveBeenCalledWith(loggingConfig);
                });
            });
        }); // End Logging
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
