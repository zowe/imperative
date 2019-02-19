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

jest.mock("fs");
jest.mock("jsonfile");

import { AppSettings } from "../";
import { existsSync } from "fs";
import { SettingsAlreadyInitialized, SettingsNotInitialized } from "../src/errors";
import { readFileSync, writeFile } from "jsonfile";
import { ISettingsFile } from "../src/doc/ISettingsFile";
import * as DeepMerge from "deepmerge";

/**
 * Type of all the keys in the app settings class
 */
type AppSettingsPublicKeys = {
    [K in keyof AppSettings]: AppSettings[K]
};

/**
 * An interface that explicitly defines private methods available to the public
 * for testing purposes only. This only works for an instantiated {@link AppSettings}
 * class object, so use it wisely.
 */
interface IAppSettingsAllMethods extends AppSettingsPublicKeys {
    writeSettingsFile: () => Promise<void>;
}

/**
 * Takes a settings object and publicizes all protected and private methods and variables.
 * Should be used for testing purposes only.
 *
 * @param settings The settings to expose.
 *
 * @returns The input settings parameter typed as the IAppSettingsAllMethod interface. This is
 *          possible because there is really no such thing as a private variable in typescript.
 */
const exposeAppSettingsInternal = (settings: AppSettings): IAppSettingsAllMethods => {
    return (settings as any) as IAppSettingsAllMethods;
};

describe("AppSettings", () => {
    const mocks = {
        existsSync: existsSync as Mock<typeof existsSync>,
        writeFile: writeFile as Mock<typeof writeFile>,
        readFileSync: readFileSync as Mock<typeof readFileSync>
    };

    const defaultSettings: ISettingsFile = {
        overrides: {
            CredentialManager: false
        }
    };

    afterEach(() => {
        // Each test should be isolated so clean up any changes that might have happened to the settings file.
        (AppSettings as any).mInstance = undefined;
    });

    describe("initialization static errors", () => {
        it("should error when app settings hasn't been initialized", () => {
            expect(() => {
                AppSettings.instance.setNewOverride("CredentialManager", false);
            }).toThrow(SettingsNotInitialized);
        });

        it("should error when initialized more than once", () => {
            mocks.readFileSync.mockReturnValueOnce(defaultSettings);

            AppSettings.initialize("test.json");

            expect(() => {
                AppSettings.initialize("another-test.json");
            }).toThrow(SettingsAlreadyInitialized);
        });
    });

    describe("constructing class scenarios", () => {
        it("should return the correct instance", () => {
            mocks.readFileSync.mockReturnValueOnce(defaultSettings);

            const appSettingsInstance = AppSettings.initialize("test.json");

            expect(AppSettings.instance).toBe(appSettingsInstance);
        });

        it("should error if the settings file doesn't exist and no recovery function was provided", () => {
            const error = new Error("No recovery function was provided");
            mocks.readFileSync.mockImplementationOnce(() => {
                throw error;
            });

            expect(() => {
                AppSettings.initialize("test.json");
            }).toThrow(error.message);
        });

        it("should error if the settings file exists and a recovery function was provided", () => {
            const error = new Error("Settings file already exists");
            mocks.readFileSync.mockImplementationOnce(() => {
                throw error;
            });
            mocks.existsSync.mockReturnValueOnce(true);

            expect(() => {
                AppSettings.initialize("test.json", () => {
                    fail("File recovery function should not have been called");

                    return defaultSettings;
                });
            }).toThrow(error.message);
        });

        it("should call the recovery function if the settings file doesn't exist", () => {
            mocks.readFileSync.mockImplementationOnce(() => {
                throw new Error("This should not be thrown");
            });
            mocks.existsSync.mockReturnValueOnce(false);

            const overwriteSettings: ISettingsFile = {
                overrides: {
                    CredentialManager: "some-plugin"
                }
            };

            const fileName = "test.json";

            const recoveryFcn = jest.fn((arg1, arg2) => {
                expect(arg1).toEqual(fileName);
                expect(arg2).toEqual(defaultSettings);

                return overwriteSettings;
            });

            AppSettings.initialize(fileName, recoveryFcn);

            expect(AppSettings.instance.settings).toEqual(overwriteSettings);
            expect(recoveryFcn).toHaveBeenCalledTimes(1);

            // The below check doesn't work because jest doesn't clone arugments.
            // expect(recoveryFcn).toHaveBeenCalledWith(fileName, defaultSettings);
        });

        it("should merge settings provided from the file", () => {
            // An array of test scenario objects.
            const scenarios: Array<{provided: object, expected: object}> = [
                {
                    provided: {overrides: {CredentialManager: "test-1"}},
                    expected: {
                        ...defaultSettings,
                        overrides: {
                            ...defaultSettings.overrides,
                            CredentialManager: "test-1"
                        }
                    }
                },
                {
                    provided: {abcd: "test-2"},
                    expected: {
                        ...defaultSettings,
                        abcd: "test-2",
                        overrides: {
                            ...defaultSettings.overrides
                        }
                    }
                },
                {
                    provided: {overrides: {CredentialManager: "test-3", SomethingElse: "some-other-plugin"}},
                    expected: {
                        ...defaultSettings,
                        overrides: {
                            ...defaultSettings.overrides,
                            CredentialManager: "test-3",
                            SomethingElse: "some-other-plugin"
                        }
                    }
                },
                {
                    provided: {overrides: {SomethingElse: "test-4"}},
                    expected: {
                        ...defaultSettings,
                        overrides: {
                            ...defaultSettings.overrides,
                            SomethingElse: "test-4"
                        }
                    }
                },
                {
                    provided: {abcd: "test-5", overrides: {SomethingElse: "some-other-plugin"}},
                    expected: {
                        ...defaultSettings,
                        abcd: "test-5",
                        overrides: {
                            ...defaultSettings.overrides,
                            SomethingElse: "some-other-plugin"
                        }
                    }
                }
            ];

            for (const scenario of scenarios) {
                mocks.readFileSync.mockReturnValueOnce(scenario.provided);

                const appSettings = new AppSettings("some-file");
                expect(appSettings.settings).toEqual(scenario.expected);
            }


        });
    });

    describe("writing settings", () => {
        /**
         * Takes an app settings object and mocks the {@link IAppSettingsAllMethods#writeSettingsFile} method
         * @param settings The settings to modify.
         */
        const mockAppSettingsInternal = (settings: AppSettings): IAppSettingsAllMethods => {
            const returnSettings = exposeAppSettingsInternal(settings);

            returnSettings.writeSettingsFile = jest.fn(() => {
                return new Promise((resolve) => resolve());
            });
            return returnSettings;
        };

        beforeAll(() => {
            mocks.readFileSync.mockReturnValue(defaultSettings);
        });

        const fileName = "test.json";

        it("should write to a settings file", async () => {
            mocks.writeFile.mockImplementation((file, object, options, callback) => {
                callback();
            });

            AppSettings.initialize(fileName);
            await exposeAppSettingsInternal(AppSettings.instance).writeSettingsFile();

            expect(mocks.writeFile).toHaveBeenCalledTimes(1);
            expect(mocks.writeFile).toHaveBeenCalledWith(fileName, defaultSettings, {spaces: 2}, expect.any(Function));

            // Clean up from previous test
            (AppSettings as any).mInstance = undefined;
            mocks.writeFile.mockClear();

            const testLoadSettings = {
                abcd: "test"
            };

            mocks.readFileSync.mockReturnValueOnce(testLoadSettings);

            AppSettings.initialize(fileName);
            await exposeAppSettingsInternal(AppSettings.instance).writeSettingsFile();

            expect(mocks.writeFile).toHaveBeenCalledTimes(1);
            expect(mocks.writeFile).toHaveBeenCalledWith(
                fileName,
                DeepMerge(JSON.parse(JSON.stringify(defaultSettings)), testLoadSettings),
                {spaces: 2},
                expect.any(Function)
            );

            mocks.writeFile.mockReset();
        });
        it("should reject when there is an error in jsonfile.writeFile", async () => {
            const error = new Error("Should reject with this");

            mocks.writeFile.mockImplementationOnce((file, object, options, callback) => {
                callback(error);
            });

            AppSettings.initialize(fileName);

            await expect(exposeAppSettingsInternal(AppSettings.instance).writeSettingsFile()).rejects.toBe(error);
        });

        describe("setting overrides", () => {
            let appSettings: IAppSettingsAllMethods;

            beforeEach(() => {
                appSettings = mockAppSettingsInternal(new AppSettings(fileName));
            });

            it("should have the defaults unchanged", () => {
                expect(appSettings.settings.overrides).toEqual(defaultSettings.overrides);
            });

            it("should override every possible overrides", async () => {
                // Test each possible overrides key
                for (const override of Object.keys(defaultSettings.overrides)) {
                    // Generate a random value just to be safe
                    const newValue = Math.random().toString();

                    // Override the current key with the new value randomly generated string
                    await appSettings.setNewOverride(override as keyof ISettingsFile["overrides"], newValue);

                    // Test that it was changed
                    expect(appSettings.settings.overrides).toEqual({
                        ...defaultSettings.overrides,
                        [override]: newValue
                    });
                    expect(appSettings.writeSettingsFile).toHaveBeenCalledTimes(1);

                    // Now set it back to normal
                    await appSettings.setNewOverride(override as keyof ISettingsFile["overrides"], false);

                    // Test it went back to norm
                    expect(appSettings.settings.overrides).toEqual({
                        ...defaultSettings.overrides,
                        [override]: false
                    });
                    expect(appSettings.writeSettingsFile).toHaveBeenCalledTimes(2);

                    // Prepare for the next loop.
                    (appSettings.writeSettingsFile as Mock<typeof Function>).mockClear();
                }
            });
        });
    });
});
