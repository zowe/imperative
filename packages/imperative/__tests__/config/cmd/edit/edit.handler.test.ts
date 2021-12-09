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

import EditHandler from "../../../../src/config/cmd/edit/edit.handler";
import { IHandlerParameters } from "../../../../../cmd";
import { GuiResult, ImperativeConfig, ProcessUtils } from "../../../../../utilities";

jest.mock("child_process");
jest.mock("opener");

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
                    // Nothing
                }),
                error: jest.fn((errors) => {
                    // Nothing
                }),
                errorHeader: jest.fn(() => undefined)
            }
        },
        arguments: {
            globalConfig: false,
            userConfig: false
        },
    };
    return x as IHandlerParameters;
};

describe("Configuration Edit command handler", () => {
    const mockConfigGetLayer = jest.fn().mockReturnValue({ exists: true, path: "fake" });

    beforeAll(() => {
        jest.spyOn(ImperativeConfig, "instance", "get").mockReturnValue({
            commandLine: "config edit",
            config: {
                api: {
                    layers: {
                        activate: jest.fn(),
                        get: mockConfigGetLayer
                    }
                }
            },
            loadedConfig: {},
            rootCommandName: "test-cli"
        } as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should not open config file that does not exist", async () => {
        const handler = new EditHandler();
        mockConfigGetLayer.mockReturnValueOnce({ exists: false });
        const params = getIHandlerParametersObject();
        const consoleLogSpy = jest.spyOn(params.response.console, "log");

        await handler.process(params);
        expect(consoleLogSpy).toHaveBeenCalled();
        expect(consoleLogSpy.mock.calls[0][0]).toContain("File does not exist");
    });

    it("should open config file in graphical text editor", async () => {
        const handler = new EditHandler();
        jest.spyOn(ProcessUtils, "isGuiAvailable").mockReturnValueOnce(GuiResult.GUI_AVAILABLE);
        const openFileSpy = jest.spyOn(handler as any, "openFileInGui");
        const params = getIHandlerParametersObject();

        await handler.process(params);
        expect(openFileSpy).toHaveBeenCalledWith("fake");
    });

    it("should open config file in command-line text editor", async () => {
        const handler = new EditHandler();
        jest.spyOn(ProcessUtils, "isGuiAvailable").mockReturnValueOnce(GuiResult.NO_GUI_NO_DISPLAY);
        const openFileSpy = jest.spyOn(handler as any, "openFileInCli");
        const params = getIHandlerParametersObject();

        await handler.process(params);
        expect(openFileSpy).toHaveBeenCalledWith("fake");
    });
});
