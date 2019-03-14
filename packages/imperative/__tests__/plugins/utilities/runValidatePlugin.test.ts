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
    const mainModule = process.mainModule;

    beforeEach(() => {
        (process.mainModule as any) = {
            filename: __filename
        };
    });

    afterEach(() => {
        process.mainModule = mainModule;
    });

    const mocks = {
        execSync: execSync as Mock<typeof execSync>
    };

    it("should display both the stdout and stderr of the validate command", () => {
        // mock the output of executing the validatePlugin command
        cmdOutputJson.stdout = "The validate commands's standard output";
        cmdOutputJson.stderr = "The validate commands's standard error";
        mocks.execSync.mockReturnValue(JSON.stringify(cmdOutputJson));
        (Imperative as any).mRootCommandName = "dummy";
        const resultMsg = runValidatePlugin(pluginName);
        expect(resultMsg).toContain(cmdOutputJson.stdout);
        expect(resultMsg).toContain(cmdOutputJson.stderr);
    });
});
