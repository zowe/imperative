/*
* MIT License                                                                     *
*                                                                                 *
* Copyright (c) 2018 CA                                                           *
*                                                                                 *
* Permission is hereby granted, free of charge, to any person obtaining a copy    *
* of this software and associated documentation files (the "Software"), to deal   *
* in the Software without restriction, including without limitation the rights    *
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell       *
* copies of the Software, and to permit persons to whom the Software is           *
* furnished to do so, subject to the following conditions:                        *
*                                                                                 *
* The above copyright notice and this permission notice shall be included in all  *
* copies or substantial portions of the Software.                                 *
*                                                                                 *
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR      *
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,        *
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE     *
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER          *
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,   *
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE   *
* SOFTWARE.                                                                       *
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
