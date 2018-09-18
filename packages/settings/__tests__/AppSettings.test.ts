/*
 * This program and the accompanying materials are made available under the terms of the *
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at  *
 * https://www.eclipse.org/legal/epl-v20.html                                            *
 *                                                                                       *
 * SPDX-License-Identifier: EPL-2.0                                                      *
 *                                                                                       *
 * Copyright Contributors to the Zowe Project.                                           *
 *                                                                                       *
 */

import Mock = jest.Mock;

jest.mock("fs");
jest.mock("jsonfile");

import { AppSettings } from "../";
import { existsSync } from "fs";
import { SettingsAlreadyInitialized, SettingsNotInitialized } from "../src/errors";
import { readFileSync, writeFileSync } from "jsonfile";
import { ISettingsFile } from "../src/doc/ISettingsFile";

fdescribe("AppSettings", () => {
    const mocks = {
        existsSync: existsSync as Mock<typeof existsSync>,
        writeFileSync: writeFileSync as Mock<typeof writeFileSync>,
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
            const settings = [
                {
                    overrides: {
                        CredentialManager: "some-plugin"
                    }
                },
                {
                    abcd: "here"
                }
            ];
        });
    });
});
