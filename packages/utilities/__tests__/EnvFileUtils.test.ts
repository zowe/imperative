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
import { homedir } from "os";
import { join } from "path";
import { EnvFileUtils } from "../../utilities";

describe("EnvFileUtils tests", () => {
    afterEach(() => {
        jest.restoreAllMocks();
        process.env.TEST_VARIABLE = "";
        process.env.ANOTHER_TEST_VARIABLE = "";
    });

    it("should tell where a user's environment file should be for a given application", () => {
        const path1 = EnvFileUtils.getEnvironmentFilePath("zowe");
        const path2 = EnvFileUtils.getEnvironmentFilePath("fake");
        expect(path1).toEqual(join(homedir(), ".zowe.env.json"));
        expect(path2).toEqual(join(homedir(), ".fake.env.json"));
    });

    it("should skip reading and setting if the file is not found", () => {
        const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValueOnce(false);
        const readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        const setEnvironmentForAppSpy = jest.spyOn(EnvFileUtils, "setEnvironmentForApp");
        EnvFileUtils.setEnvironmentForApp("zowe");
        expect(setEnvironmentForAppSpy).toHaveBeenCalledTimes(1);
        expect(setEnvironmentForAppSpy).toHaveBeenCalledWith("zowe");
        expect(existsSyncSpy).toHaveBeenCalledTimes(1);
        expect(readFileSyncSpy).toHaveBeenCalledTimes(0);
    });

    it("should read the environment file and set an environment variables", () => {
        const data = {
            "TEST_VARIABLE": "TEST_VALUE_1",
            "ANOTHER_TEST_VARIABLE": "TEST_VALUE_1"
        };
        const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
        const openSyncSpy = jest.spyOn(fs, "openSync").mockReturnValueOnce(1);
        const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify(data));
        const closeSyncSpy = jest.spyOn(fs, "closeSync").mockReturnValueOnce();
        const setEnvironmentForAppSpy = jest.spyOn(EnvFileUtils, "setEnvironmentForApp");
        EnvFileUtils.setEnvironmentForApp("zowe");
        expect(setEnvironmentForAppSpy).toHaveBeenCalledTimes(1);
        expect(setEnvironmentForAppSpy).toHaveBeenCalledWith("zowe");
        expect(process.env.TEST_VARIABLE).toEqual("TEST_VALUE_1");
        expect(process.env.ANOTHER_TEST_VARIABLE).toEqual("TEST_VALUE_1");
        expect(existsSyncSpy).toHaveBeenCalledTimes(1);
        expect(openSyncSpy).toHaveBeenCalledTimes(1);
        expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
        expect(closeSyncSpy).toHaveBeenCalledTimes(1);
    });

    it("should fail to read the environment file and throw errors but close file cleanly", () => {
        const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
        const openSyncSpy = jest.spyOn(fs, "openSync").mockReturnValueOnce(1);
        const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValueOnce(`
        {
            "TEST_VARIABLE": "TEST_VALUE_1"
            "ANOTHER_TEST_VARIABLE": "TEST_VALUE_1"
        };
        `);
        const closeSyncSpy = jest.spyOn(fs, "closeSync").mockReturnValueOnce();
        const setEnvironmentForAppSpy = jest.spyOn(EnvFileUtils, "setEnvironmentForApp");
        let error;
        try {
            EnvFileUtils.setEnvironmentForApp("zowe");
        } catch (err) {
            error = err;
        }
        expect(setEnvironmentForAppSpy).toHaveBeenCalledTimes(1);
        expect(setEnvironmentForAppSpy).toHaveBeenCalledWith("zowe");
        expect(process.env.TEST_VARIABLE).not.toEqual("TEST_VALUE_1");
        expect(process.env.ANOTHER_TEST_VARIABLE).not.toEqual("TEST_VALUE_1");
        expect(existsSyncSpy).toHaveBeenCalledTimes(1);
        expect(openSyncSpy).toHaveBeenCalledTimes(1);
        expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
        expect(closeSyncSpy).toHaveBeenCalledTimes(1);
        expect(error).toBeDefined();
        expect(error.message).toContain("Failed to set up environment variables from the environment file.");
    });
});
