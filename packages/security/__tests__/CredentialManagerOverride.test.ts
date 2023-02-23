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

import * as fsExtra from "fs-extra";
import * as path from "path";

import { CredentialManagerOverride } from "../src/CredentialManagerOverride";
import { ICredentialManagerNameMap } from "../src/doc/ICredentialManagerNameMap";
import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";
import { ISettingsFile } from "../../settings/src/doc/ISettingsFile";

describe("CredentialManagerOverride", () => {
    let mockImpConfig: any;
    let expectedSettings: any;

    beforeEach(() => {
        // pretend that ImperativeConfig has been initialized
        mockImpConfig = {
            cliHome: __dirname
        };
        jest.spyOn(ImperativeConfig, "instance", "get").mockReturnValue(mockImpConfig);

        expectedSettings = {
            fileName: path.join(mockImpConfig.cliHome, "settings", "imperative.json"),
            json: {
                "overrides": {
                    "CredentialManager": "@zowe/cli"
                }
            } as ISettingsFile
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("getKnownCredMgrs", () => {
        it("should return our array of cred managers", () => {
            const expectedCredMgrs: ICredentialManagerNameMap[] = [
                {
                    "credMgrDisplayName": CredentialManagerOverride.DEFAULT_CRED_MGR_NAME
                },
                {
                    "credMgrDisplayName": "Kubernetes Secrets",
                    "credMgrPluginName": "@zowe/secrets-for-kubernetes-for-zowe-cli",
                    "credMgrZEName": "Zowe.secrets-for-kubernetes"
                }
            ];
            const receivedCredMgrs = CredentialManagerOverride.getKnownCredMgrs();
            expect(receivedCredMgrs).toEqual(expectedCredMgrs);
        });
    });

    describe("getSettingsFileJson", () => {
        it("should return valid imperative.json file content", () => {
            const expectedSettings: any = {
                fileName: path.join(mockImpConfig.cliHome, "settings", "imperative.json"),
                json: {
                    "overrides": {
                        "CredentialManager": "@zowe/cli"
                    }
                } as ISettingsFile
            };

            // make readJsonSync return what we want
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                return expectedSettings.json;
            });

            /* Use CredentialManagerOverride["getCmdOutput"]() instead of
             * CredentialManagerOverride.getCmdOutput() so that we can call a private function.
             */
            const receivedSettings: any = CredentialManagerOverride["getSettingsFileJson"]();
            expect(readJsonSync).toHaveBeenCalledWith(expectedSettings.fileName);
            expect(receivedSettings).toEqual(expectedSettings);
        });

        it("should throw an error due to error in readJsonSync", () => {
            // Force an error when reading our settings
            const readJsonErrText = "Pretend that readJsonSync threw an error";
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                throw new Error(readJsonErrText);
            });

            /* Use CredentialManagerOverride["getCmdOutput"]() instead of
             * CredentialManagerOverride.getCmdOutput() so that we can call a private function.
             */
            let thrownErr: any;
            let receivedSettings: any;
            try {
                receivedSettings = CredentialManagerOverride["getSettingsFileJson"]();
            } catch (err) {
                thrownErr = err;
            }
            expect(readJsonSync).toHaveBeenCalledWith(expectedSettings.fileName);
            expect(receivedSettings).toBeUndefined();
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(readJsonErrText);
        });

        it("should throw an error when no overrides.CredentialManager property exists", () => {
            // replace good CredentialManager property with a bogus property
            delete expectedSettings.json.overrides.CredentialManager;
            expectedSettings.json.overrides.bogusProp = "Bogus value";

            // make readJsonSync return what we want
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                return expectedSettings.json;
            });

            /* Use CredentialManagerOverride["getCmdOutput"]() instead of
             * CredentialManagerOverride.getCmdOutput() so that we can call a private function.
             */
            let thrownErr: any;
            let receivedSettings: any;
            try {
                receivedSettings = CredentialManagerOverride["getSettingsFileJson"]();
            } catch (err) {
                thrownErr = err;
            }
            expect(readJsonSync).toHaveBeenCalledWith(expectedSettings.fileName);
            expect(receivedSettings).toBeUndefined();
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                "The property key 'overrides.CredentialManager' does not exist in settings file = " +
                expectedSettings.fileName
            );
        });
    });

    describe("overrideCredMgr", () => {
        it("should throw an override error due to error in getSettingsFileJson", () => {
            // Force an error when reading our settings
            const readJsonErrText = "Pretend that readJsonSync threw an error";
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                throw new Error(readJsonErrText);
            });

            // spy with 'any' to confirm that a private function has been called
            const getSettingsFileJsonSpy = jest.spyOn(CredentialManagerOverride as any, "getSettingsFileJson");

            const newCredMgrOverride = "NewPluginCredMgr";
            let thrownErr: any;
            try {
                CredentialManagerOverride.overrideCredMgr(newCredMgrOverride);
            } catch (err) {
                thrownErr = err;
            }

            expect(getSettingsFileJsonSpy).toHaveBeenCalledTimes(1);
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                `Due to error in settings file, unable to override the credential manager with '${newCredMgrOverride}'`
            );
            expect(thrownErr.message).toContain(
                "Reason: Unable to read settings file = " + expectedSettings.fileName
            );
            expect(thrownErr.message).toContain(`Reason: ${readJsonErrText}`);
        });

        it("should throw an override error due to error in writeJsonSync", () => {
            // make readJsonSync return what we want
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                return expectedSettings.json;
            });

            // Force an error when writing our settings
            const writeJsonErrText = "Pretend that writeJsonSync threw an error";
            const writeJsonSync = jest.spyOn(fsExtra, "writeJsonSync").mockImplementation(() => {
                throw new Error(writeJsonErrText);
            });

            const newCredMgrOverride = "NewPluginCredMgr";
            let thrownErr: ImperativeError = null as any;
            try {
                CredentialManagerOverride.overrideCredMgr(newCredMgrOverride);
            } catch (err) {
                thrownErr = err;
            }
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                `Unable to write settings file = ${expectedSettings.fileName}`
            );
            expect(thrownErr.message).toContain(`Reason: ${writeJsonErrText}`);
        });

        it("should successfully record a new cred manager", () => {
            let writtenJsonSettings: ISettingsFile = {} as any;
            // make readJsonSync and writeJsonSync return what we want
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                return expectedSettings.json;
            });
            const writeJsonSync = jest.spyOn(fsExtra, "writeJsonSync")
                .mockImplementation((_fileName, jsonSettings, _options) => {
                    writtenJsonSettings = jsonSettings;
                });

            const newCredMgrOverride = "NewPluginCredMgr";
            CredentialManagerOverride.overrideCredMgr(newCredMgrOverride);

            expect(readJsonSync).toHaveBeenCalledWith(expectedSettings.fileName);
            expect(writeJsonSync).toHaveBeenCalledTimes(1);
            expect(writtenJsonSettings.overrides.CredentialManager).toEqual(newCredMgrOverride);
        });
    });

    describe("replaceCredMgrWithDefault", () => {
        it("should throw a replacement error due to error in getSettingsFileJson", () => {
            // Force an error when reading our settings
            const readJsonErrText = "Pretend that readJsonSync threw an error";
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                throw new Error(readJsonErrText);
            });

            // spy with 'any' to confirm that a private function has been called
            const getSettingsFileJsonSpy = jest.spyOn(CredentialManagerOverride as any, "getSettingsFileJson");

            const credMgrToReplace = "CurrentPluginCredMgr";
            let thrownErr: any;
            try {
                CredentialManagerOverride.replaceCredMgrWithDefault(credMgrToReplace);
            } catch (err) {
                thrownErr = err;
            }

            expect(getSettingsFileJsonSpy).toHaveBeenCalledTimes(1);
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                `Due to error in settings file, unable to replace the credential manager named '${credMgrToReplace}'`
            );
            expect(thrownErr.message).toContain(
                "Reason: Unable to read settings file = " + expectedSettings.fileName
            );
            expect(thrownErr.message).toContain(`Reason: ${readJsonErrText}`);
        });

        it("should fail when the plugin is not the current cred mgr", () => {
            // make readJsonSync return what we want
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                return expectedSettings.json;
            });

            // spy with 'any' to confirm that a private function has been called
            const getSettingsFileJsonSpy = jest.spyOn(CredentialManagerOverride as any, "getSettingsFileJson");

            const credMgrToReplace = "CurrentPluginCredMgr";
            let thrownErr: any;
            try {
                CredentialManagerOverride.replaceCredMgrWithDefault(credMgrToReplace);
            } catch (err) {
                thrownErr = err;
            }

            expect(getSettingsFileJsonSpy).toHaveBeenCalledTimes(1);
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                "The current Credential Manager = '" +
                expectedSettings.json.overrides.CredentialManager  +
                "' does not equal the Credential Manager name to be replaced = '" +
                credMgrToReplace + "' in settings file = '" +
                expectedSettings.fileName +
                "'. The current Credential Manager has not been replaced."
            );
        });

        it("should throw a replacement error due to error in writeJsonSync", () => {
            // make readJsonSync return what we want
            const readJsonSync = jest.spyOn(fsExtra, "readJsonSync").mockImplementation(() => {
                return expectedSettings.json;
            });

            // Force an error when writing our settings
            const writeJsonErrText = "Pretend that writeJsonSync threw an error";
            const writeJsonSync = jest.spyOn(fsExtra, "writeJsonSync").mockImplementation(() => {
                throw new Error(writeJsonErrText);
            });

            // spy with 'any' to confirm that a private function has been called
            const getSettingsFileJsonSpy = jest.spyOn(CredentialManagerOverride as any, "getSettingsFileJson");

            // set the current cred mgr to the cred mgr that we want to replace
            const credMgrToReplace = "CurrentPluginCredMgr";
            expectedSettings.json.overrides.CredentialManager = credMgrToReplace;

            let thrownErr: any;
            try {
                CredentialManagerOverride.replaceCredMgrWithDefault(credMgrToReplace);
            } catch (err) {
                thrownErr = err;
            }

            expect(getSettingsFileJsonSpy).toHaveBeenCalledTimes(1);
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                "Unable to write settings file = " + expectedSettings.fileName
            );
            expect(thrownErr.message).toContain(`Reason: ${writeJsonErrText}`);
        });
    });
});
