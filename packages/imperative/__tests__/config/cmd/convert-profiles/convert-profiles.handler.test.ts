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
import * as keytar from "keytar";
import * as rimraf from "rimraf";
import { Config, ConfigBuilder, ConfigSchema } from "../../../../../config";
import { IHandlerParameters } from "../../../../../cmd";
import { ProfileIO } from "../../../../../profiles";
import { AppSettings } from "../../../../../settings";
import { ImperativeConfig } from "../../../../../utilities";
import * as npmInterface from "../../../../src/plugins/utilities/npm-interface";
import { PluginIssues } from "../../../../src/plugins/utilities/PluginIssues";
import ConvertProfilesHandler from "../../../../src/config/cmd/convert-profiles/convert-profiles.handler";

jest.mock("../../../../src/plugins/utilities/npm-interface");
jest.mock("../../../../../imperative/src/OverridesLoader");

let stdout;
let stderr;

const getIHandlerParametersObject = (): IHandlerParameters => {
    const x: any = {
        response: {
            data: {
                setMessage: jest.fn((setMsgArgs) => {
                    // Nothing
                }),
                setObj: jest.fn((setObjArgs) => {
                    // Nothing
                })
            },
            console: {
                log: jest.fn((logs) => {
                    stdout += logs;
                }),
                error: jest.fn((errors) => {
                    stderr += errors;
                }),
                errorHeader: jest.fn(() => undefined),
                prompt: jest.fn()
            }
        },
        arguments: {},
    };
    return x as IHandlerParameters;
};

describe("Configuration Convert Profiles command handler", () => {
    let mockImperativeConfig: any;

    beforeEach(() => {
        mockImperativeConfig = {
            cliHome: __dirname,
            config: {
                api: {
                    layers: {
                        activate: jest.fn(),
                        merge: jest.fn()
                    }
                },
                layerActive: jest.fn().mockReturnValue({}),
                save: jest.fn()
            }
        };
        stdout = stderr = "";
        jest.spyOn(ImperativeConfig, "instance", "get").mockReturnValue(mockImperativeConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should do nothing if there are no old plug-ins or profiles", async () => {
        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(0);
        const params = getIHandlerParametersObject();

        await handler.process(params);
        expect(stdout).toContain("No old profiles were found");
        expect(stderr).toBe("");
    });

    it("should remove obsolete plug-ins", async () => {
        const obsoletePlugins = [
            { name: "pluginA" },
            { name: "pluginB", preUninstall: jest.fn(), postUninstall: jest.fn() }
        ];
        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce(obsoletePlugins);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(0);
        jest.spyOn(handler as any, "uninstallPlugin")
            .mockImplementationOnce(() => { throw new Error("invalid plugin"); })
            .mockImplementation();
        const params = getIHandlerParametersObject();
        params.arguments.force = true;

        await handler.process(params);
        expect(stdout).toContain("Detected 2 obsolete plug-in(s)");
        expect(stdout).toContain("Removed obsolete plug-in: pluginB");
        expect(stderr).toContain("Failed to uninstall plug-in \"pluginA\"");
        expect(obsoletePlugins[1].preUninstall).toHaveBeenCalled();
        expect(obsoletePlugins[1].postUninstall).toHaveBeenCalled();
    });

    it("should convert old profiles", async () => {
        const metaError = new Error("invalid meta file");
        const profileError = new Error("invalid profile file");
        jest.spyOn(ConfigBuilder, "convert").mockResolvedValueOnce({
            config: Config.empty(),
            profilesConverted: {
                fruit: ["apple", "coconut"]
            },
            profilesFailed: [
                { name: "banana", type: "fruit", error: profileError },
                { type: "fruit", error: metaError }
            ]
        });
        const updateSchemaSpy = jest.spyOn(ConfigSchema, "updateSchema").mockReturnValueOnce(undefined);
        jest.spyOn(fs, "renameSync").mockReturnValueOnce();

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(3);
        const params = getIHandlerParametersObject();
        params.arguments.force = true;

        await handler.process(params);
        expect(stdout).toContain("Detected 3 old profile(s)");
        expect(stdout).toContain("Converted fruit profiles: apple, coconut");
        expect(stderr).toContain("Failed to load fruit profile \"banana\"");
        expect(stderr).toContain(profileError.message);
        expect(stderr).toContain("Failed to find default fruit profile");
        expect(stderr).toContain(metaError.message);
        expect(updateSchemaSpy).toHaveBeenCalled();
        expect(mockImperativeConfig.config.save).toHaveBeenCalled();
    });

    it("should remove plug-ins and convert profiles if prompt is accepted", async () => {
        const configConvertSpy = jest.spyOn(ConfigBuilder, "convert").mockResolvedValueOnce({
            config: Config.empty(),
            profilesConverted: {},
            profilesFailed: []
        });
        jest.spyOn(ConfigSchema, "updateSchema").mockReturnValueOnce(undefined);
        jest.spyOn(fs, "renameSync").mockReturnValueOnce();

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([
            { name: "fake-plugin" }
        ]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(1);
        const uninstallSpy = jest.spyOn(handler as any, "uninstallPlugin").mockImplementation();
        const params = getIHandlerParametersObject();
        (params.response.console.prompt as any).mockResolvedValueOnce("y");

        await handler.process(params);
        expect(stdout).toContain("Detected 1 obsolete plug-in(s) and 1 old profile(s)");
        expect(stdout).toContain("Your new profiles have been saved");
        expect(stdout).toContain("Your old profiles have been moved");
        expect(stderr).toBe("");
        expect(uninstallSpy).toHaveBeenCalled();
        expect(configConvertSpy).toHaveBeenCalled();
    });

    it("should do nothing if prompt is rejected", async () => {
        const configConvertSpy = jest.spyOn(ConfigBuilder, "convert");

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([
            { name: "fake-plugin" }
        ]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(1);
        const uninstallSpy = jest.spyOn(handler as any, "uninstallPlugin");
        const params = getIHandlerParametersObject();
        (params.response.console.prompt as any).mockResolvedValueOnce("n");

        await handler.process(params);
        expect(stdout).toContain("Detected 1 obsolete plug-in(s) and 1 old profile(s)");
        expect(stderr).toBe("");
        expect(uninstallSpy).not.toHaveBeenCalled();
        expect(configConvertSpy).not.toHaveBeenCalled();
    });

    it("should remove existing profiles and delete secure properties", async () => {
        const metaError = new Error("invalid meta file");
        jest.spyOn(ConfigBuilder, "convert").mockResolvedValueOnce({
            config: Config.empty(),
            profilesConverted: {
                fruit: ["apple", "coconut", "banana"]
            },
            profilesFailed: []
        });
        const updateSchemaSpy = jest.spyOn(ConfigSchema, "updateSchema").mockReturnValueOnce(undefined);
        jest.spyOn(fs, "renameSync").mockReturnValueOnce();
        jest.spyOn(keytar, "findCredentials").mockResolvedValue([
            {account: "testAcct", password: "testPassword"}
        ]);
        jest.spyOn(keytar, "deletePassword").mockResolvedValue(true);
        const rimrafSpy = jest.spyOn(rimraf, "sync").mockImplementation(() => {
            return true;
        });

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(3);
        const findOldSecurePropsSpy = jest.spyOn(handler as any, "findOldSecureProps");
        const deleteOldSecurePropsSpy = jest.spyOn(handler as any, "deleteOldSecureProps");

        const params = getIHandlerParametersObject();
        params.arguments.force = true;
        params.arguments.delete = true;
        params.arguments.forSure = true;

        await handler.process(params);
        expect(stdout).toContain("Detected 3 old profile(s)");
        expect(stdout).toContain("Converted fruit profiles: apple, coconut, banana");
        expect(stdout).toContain("Deleting the profiles directory");
        expect(stdout).toContain("Deleting secure value for \"@brightside/core/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"@zowe/cli/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Zowe-Plugin/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Broadcom-Plugin/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Zowe/testAcct\"");
        expect(updateSchemaSpy).toHaveBeenCalled();
        expect(mockImperativeConfig.config.save).toHaveBeenCalled();
        expect(rimrafSpy).toHaveBeenCalledTimes(1);
        expect(findOldSecurePropsSpy).toHaveBeenCalledTimes(5);
        expect(deleteOldSecurePropsSpy).toHaveBeenCalledTimes(5);
    });

    it("should remove existing profiles and delete secure properties except secure_config_props", async () => {
        const metaError = new Error("invalid meta file");
        jest.spyOn(ConfigBuilder, "convert").mockResolvedValueOnce({
            config: Config.empty(),
            profilesConverted: {
                fruit: ["apple", "coconut", "banana"]
            },
            profilesFailed: []
        });
        const updateSchemaSpy = jest.spyOn(ConfigSchema, "updateSchema").mockReturnValueOnce(undefined);
        jest.spyOn(fs, "renameSync").mockReturnValueOnce();
        jest.spyOn(keytar, "findCredentials").mockResolvedValue([
            {account: "testAcct", password: "testPassword"},
            {account: "secure_config_props", password: "testPassword"},
            {account: "secure_config_props_1", password: "testPassword"}
        ]);
        jest.spyOn(keytar, "deletePassword").mockResolvedValue(true);
        const rimrafSpy = jest.spyOn(rimraf, "sync").mockImplementation(() => {
            return true;
        });

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(3);
        const findOldSecurePropsSpy = jest.spyOn(handler as any, "findOldSecureProps");
        const deleteOldSecurePropsSpy = jest.spyOn(handler as any, "deleteOldSecureProps");

        const params = getIHandlerParametersObject();
        params.arguments.force = true;
        params.arguments.delete = true;
        params.arguments.forSure = true;

        await handler.process(params);
        expect(stdout).toContain("Detected 3 old profile(s)");
        expect(stdout).toContain("Converted fruit profiles: apple, coconut, banana");
        expect(stdout).toContain("Deleting the profiles directory");
        expect(stdout).toContain("Deleting secure value for \"@brightside/core/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"@zowe/cli/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Zowe-Plugin/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Broadcom-Plugin/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Zowe/testAcct\"");
        expect(updateSchemaSpy).toHaveBeenCalled();
        expect(mockImperativeConfig.config.save).toHaveBeenCalled();
        expect(rimrafSpy).toHaveBeenCalledTimes(1);
        expect(findOldSecurePropsSpy).toHaveBeenCalledTimes(5);
        expect(deleteOldSecurePropsSpy).toHaveBeenCalledTimes(5);
    });

    it("should remove existing profiles, delete secure properties, and handle a rimraf delete error", async () => {
        const metaError = new Error("invalid meta file");
        jest.spyOn(ConfigBuilder, "convert").mockResolvedValueOnce({
            config: Config.empty(),
            profilesConverted: {
                fruit: ["apple", "coconut", "banana"]
            },
            profilesFailed: []
        });
        const updateSchemaSpy = jest.spyOn(ConfigSchema, "updateSchema").mockReturnValueOnce(undefined);
        jest.spyOn(fs, "renameSync").mockReturnValueOnce();
        jest.spyOn(keytar, "findCredentials").mockResolvedValue([
            {account: "testAcct", password: "testPassword"}
        ]);
        jest.spyOn(keytar, "deletePassword").mockResolvedValue(true);
        const rimrafSpy = jest.spyOn(rimraf, "sync").mockImplementation(() => {
            throw new Error("test error");
        });

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(3);
        const findOldSecurePropsSpy = jest.spyOn(handler as any, "findOldSecureProps");
        const deleteOldSecurePropsSpy = jest.spyOn(handler as any, "deleteOldSecureProps");

        const params = getIHandlerParametersObject();
        params.arguments.force = true;
        params.arguments.delete = true;
        params.arguments.forSure = true;

        await handler.process(params);
        expect(stdout).toContain("Detected 3 old profile(s)");
        expect(stdout).toContain("Converted fruit profiles: apple, coconut, banana");
        expect(stdout).toContain("Deleting secure value for \"@brightside/core/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"@zowe/cli/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Zowe-Plugin/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Broadcom-Plugin/testAcct\"");
        expect(stdout).toContain("Deleting secure value for \"Zowe/testAcct\"");
        expect(stderr).toContain("Failed to delete the profiles directory");
        expect(updateSchemaSpy).toHaveBeenCalled();
        expect(mockImperativeConfig.config.save).toHaveBeenCalled();
        expect(rimrafSpy).toHaveBeenCalledTimes(1);
        expect(findOldSecurePropsSpy).toHaveBeenCalledTimes(5);
        expect(deleteOldSecurePropsSpy).toHaveBeenCalledTimes(5);
    });

    it("should throw an error if keytar unavailable", async () => {
        const metaError = new Error("invalid meta file");
        jest.spyOn(ConfigBuilder, "convert").mockResolvedValueOnce({
            config: Config.empty(),
            profilesConverted: {
                fruit: ["apple", "coconut", "banana"]
            },
            profilesFailed: []
        });
        const updateSchemaSpy = jest.spyOn(ConfigSchema, "updateSchema").mockReturnValueOnce(undefined);
        jest.spyOn(fs, "renameSync").mockReturnValueOnce();
        jest.spyOn(keytar, "findCredentials").mockImplementation(() => {
            throw new Error("test error");
        });
        const rimrafSpy = jest.spyOn(rimraf, "sync").mockImplementation(() => {
            return true;
        });

        const handler = new ConvertProfilesHandler();
        jest.spyOn(handler as any, "getObsoletePlugins").mockReturnValueOnce([]);
        jest.spyOn(handler as any, "getOldProfileCount").mockReturnValueOnce(3);

        const params = getIHandlerParametersObject();
        params.arguments.force = true;
        params.arguments.delete = true;
        params.arguments.forSure = true;

        await handler.process(params);
        expect(stdout).toContain("Detected 3 old profile(s)");
        expect(stdout).toContain("Converted fruit profiles: apple, coconut, banana");
        expect(stdout).toContain("Deleting the profiles directory");
        expect(stderr).toContain("Keytar or the credential vault are unavailable.");
        expect(stdout).not.toContain("Deleting secure value for \"@brightside/core/testAcct\"");
        expect(stdout).not.toContain("Deleting secure value for \"@zowe/cli/testAcct\"");
        expect(stdout).not.toContain("Deleting secure value for \"Zowe-Plugin/testAcct\"");
        expect(stdout).not.toContain("Deleting secure value for \"Broadcom-Plugin/testAcct\"");
        expect(stdout).not.toContain("Deleting secure value for \"Zowe/testAcct\"");
        expect(updateSchemaSpy).toHaveBeenCalled();
        expect(mockImperativeConfig.config.save).toHaveBeenCalled();
        expect(rimrafSpy).toHaveBeenCalledTimes(1);
    });

    describe("getObsoletePlugins", () => {
        it("should return empty list", () => {
            const handler = new ConvertProfilesHandler();
            mockImperativeConfig.hostPackageName = "fake-cli";
            const result = (handler as any).getObsoletePlugins();
            expect(result).toEqual([]);
        });

        it("should return default credential manager for Zowe CLI", () => {
            mockImperativeConfig.hostPackageName = "@zowe/cli";
            jest.spyOn(AppSettings, "instance", "get").mockReturnValue({
                get: jest.fn().mockReturnValue("@zowe/cli")
            } as any);

            const handler = new ConvertProfilesHandler();
            const result = (handler as any).getObsoletePlugins();
            expect(result.length).toBe(1);
            expect(result[0].name).toBe("@zowe/secure-credential-store-for-zowe-cli");
            expect(result[0].preUninstall).toBeUndefined();
        });

        it("should return custom credential manager for Zowe CLI", () => {
            mockImperativeConfig.hostPackageName = "@zowe/cli";
            jest.spyOn(AppSettings, "instance", "get").mockReturnValue({
                get: jest.fn().mockReturnValue("ABC")
            } as any);

            const handler = new ConvertProfilesHandler();
            const result = (handler as any).getObsoletePlugins();
            expect(result.length).toBe(1);
            expect(result[0].name).toBe("ABC");
            expect(result[0].preUninstall).toBeDefined();
        });
    });

    describe("checkKeytarAvailable", () => {
        it("should return true if keytar does not error out", async () => {
            const findCredentialsSpy = jest.spyOn(keytar, "findCredentials").mockResolvedValue([{account: "fake", password: "fake"}]);

            const handler = new ConvertProfilesHandler();
            const result = await (handler as any).checkKeytarAvailable();
            expect(result).toEqual(true);
            expect(findCredentialsSpy).toHaveBeenCalledWith("@zowe/cli");
        });
        it("should return false if keytar errors out", async () => {
            jest.spyOn(keytar, "findCredentials").mockImplementation(() => {
                throw new Error("fake error");
            });

            const handler = new ConvertProfilesHandler();
            const result = await (handler as any).checkKeytarAvailable();
            expect(result).toEqual(false);
        });
    });

    describe("findOldSecureProps", () => {
        it("should find existing Zowe accounts", async () => {
            const findCredentialsSpy = jest.spyOn(keytar, "findCredentials").mockResolvedValue([
                {account: "fake1", password: "fakePass1"},
                {account: "fake2", password: "fakePass2"},
                {account: "fake3", password: "fakePass3"},
                {account: "fake4", password: "fakePass4"}
            ]);

            const handler = new ConvertProfilesHandler();
            const handlerParmsObj = getIHandlerParametersObject();
            const result = await (handler as any).findOldSecureProps("Zowe", handlerParmsObj);
            expect(result).toEqual(["fake1", "fake2", "fake3", "fake4"]);
            expect(findCredentialsSpy).toHaveBeenCalledWith("Zowe");
            expect(handlerParmsObj.response.console.error).toHaveBeenCalledTimes(0);
        });
        it("should not find existing Zowe accounts", async () => {
            const findCredentialsSpy = jest.spyOn(keytar, "findCredentials").mockResolvedValue([]);

            const handler = new ConvertProfilesHandler();
            const handlerParmsObj = getIHandlerParametersObject();
            const result = await (handler as any).findOldSecureProps("Zowe", handlerParmsObj);
            expect(result).toEqual([]);
            expect(findCredentialsSpy).toHaveBeenCalledWith("Zowe");
            expect(handlerParmsObj.response.console.error).toHaveBeenCalledTimes(0);
        });
        it("should error while finding existing Zowe accounts and catch error", async () => {
            const findCredentialsSpy = jest.spyOn(keytar, "findCredentials").mockImplementation(() => {
                throw new Error("test error");
            });

            const handler = new ConvertProfilesHandler();
            const handlerParmsObj = getIHandlerParametersObject();
            const result = await (handler as any).findOldSecureProps("Zowe", handlerParmsObj);
            expect(result).toEqual([]);
            expect(findCredentialsSpy).toHaveBeenCalledWith("Zowe");
            expect(handlerParmsObj.response.console.error).toHaveBeenCalledTimes(1);
            expect(stderr).toContain("Encountered an error while gathering profiles for service");
        });
    });

    describe("deleteOldSecureProps", () => {
        it("should properly delete a credential and return success", async() => {
            const findCredentialsSpy = jest.spyOn(keytar, "deletePassword").mockResolvedValue(true);

            const handler = new ConvertProfilesHandler();
            const handlerParmsObj = getIHandlerParametersObject();
            const result = await (handler as any).deleteOldSecureProps("Zowe", "zosmf_test_user", handlerParmsObj);
            expect(result).toEqual(true);
            expect(findCredentialsSpy).toHaveBeenCalledWith("Zowe", "zosmf_test_user");
            expect(handlerParmsObj.response.console.error).toHaveBeenCalledTimes(0);
        });
        it("should not properly delete a credential and return failure", async() => {
            const findCredentialsSpy = jest.spyOn(keytar, "deletePassword").mockResolvedValue(false);

            const handler = new ConvertProfilesHandler();
            const handlerParmsObj = getIHandlerParametersObject();
            const result = await (handler as any).deleteOldSecureProps("Zowe", "zosmf_test_user", handlerParmsObj);
            expect(result).toEqual(false);
            expect(findCredentialsSpy).toHaveBeenCalledWith("Zowe", "zosmf_test_user");
            expect(handlerParmsObj.response.console.error).toHaveBeenCalledTimes(0);
        });
        it("should error while deleting a credential and return failure", async() => {
            const findCredentialsSpy = jest.spyOn(keytar, "deletePassword").mockImplementation(() => {
                throw new Error("test error");
            });

            const handler = new ConvertProfilesHandler();
            const handlerParmsObj = getIHandlerParametersObject();
            const result = await (handler as any).deleteOldSecureProps("Zowe", "zosmf_test_user", handlerParmsObj);
            expect(result).toEqual(false);
            expect(findCredentialsSpy).toHaveBeenCalledWith("Zowe", "zosmf_test_user");
            expect(handlerParmsObj.response.console.error).toHaveBeenCalledTimes(1);
            expect(stderr).toContain("Encountered an error while deleting secure data for service");
        });
    });

    it("getOldProfileCount should find multiple types of profiles", () => {
        jest.spyOn(ProfileIO, "getAllProfileDirectories").mockReturnValueOnce(["fruit", "nut"]);
        jest.spyOn(ProfileIO, "getAllProfileNames")
            .mockReturnValueOnce(["apple", "banana", "coconut"])
            .mockReturnValueOnce(["almond", "brazil", "cashew"]);

        const handler = new ConvertProfilesHandler();
        const result = (handler as any).getOldProfileCount(__dirname);
        expect(result).toBe(6);
    });

    it("disableCredentialManager should reset CredentialManager override", () => {
        const mockSetOverride = jest.fn();
        jest.spyOn(AppSettings, "instance", "get").mockReturnValue({
            set: mockSetOverride
        } as any);
        mockImperativeConfig.hostPackageName = "fake-cli";
        mockImperativeConfig.loadedConfig = {
            overrides: {
                CredentialManager: "ABC"
            }
        };

        const handler = new ConvertProfilesHandler();
        (handler as any).disableCredentialManager();
        expect(mockSetOverride).toHaveBeenCalledWith("overrides", "CredentialManager", "fake-cli");
        expect(mockImperativeConfig.loadedConfig.overrides.CredentialManager).toBeUndefined();
    });

    it("uninstallPlugin should uninstall plugin if it exists", () => {
        jest.spyOn(PluginIssues, "instance", "get").mockReturnValue({
            getInstalledPlugins: jest.fn().mockReturnValue({ "real-plugin": null })
        } as any);
        const uninstallSpy = jest.spyOn(npmInterface, "uninstall");

        const handler = new ConvertProfilesHandler();
        (handler as any).uninstallPlugin("fake-plugin");
        expect(uninstallSpy).not.toHaveBeenCalled();
        (handler as any).uninstallPlugin("real-plugin");
        expect(uninstallSpy).toHaveBeenCalledWith("real-plugin");
    });
});
