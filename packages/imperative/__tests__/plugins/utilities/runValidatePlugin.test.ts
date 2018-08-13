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

import { runValidatePlugin } from "../../../src/plugins/utilities/runValidatePlugin";
import { execSync } from "child_process";
import { Imperative } from "../../..";
import Mock = jest.Mock;

jest.mock("child_process");
jest.mock("../../../src/plugins/utilities/PMFConstants");

const pluginName = "fakePluginName";
const cmdOutputJson = {
    success: true,
    message: "",
    stdout: "",
    stderr: "",
    data: {}
};

describe("runValidatePlugin", () => {
    const mocks = {
        execSync: execSync as Mock<typeof execSync>
    };

    it("should return a message for success", () => {
        // mock the output of executing the validatePlugin command
        cmdOutputJson.stdout = "No errors or warnings means success";
        mocks.execSync.mockReturnValue(JSON.stringify(cmdOutputJson));
        (Imperative as any).mRootCommandName = "dummy";
        const resultMsg = runValidatePlugin(pluginName);
        expect(resultMsg).toContain("This plugin was successfully validated");
    });

    it("should return a message for errors", () => {
        // mock the output of executing the validatePlugin command
        cmdOutputJson.stdout = "___ Error - This text contains a error.";
        mocks.execSync.mockReturnValue(JSON.stringify(cmdOutputJson));
        (Imperative as any).mRootCommandName = "dummy";
        const resultMsg = runValidatePlugin(pluginName);
        expect(resultMsg).toContain("This plugin has errors and will be excluded");
    });

    it("should return a message for warnings", () => {
        // mock the output of executing the validatePlugin command
        cmdOutputJson.stdout = "___ Warning - This text contains a warning.";
        mocks.execSync.mockReturnValue(JSON.stringify(cmdOutputJson));
        (Imperative as any).mRootCommandName = "dummy";
        const resultMsg = runValidatePlugin(pluginName);
        expect(resultMsg).toContain("This plugin has warnings, but will be included");
    });
});
