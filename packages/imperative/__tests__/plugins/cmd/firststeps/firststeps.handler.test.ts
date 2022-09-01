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

jest.mock("../../../../../cmd/src/response/CommandResponse");
jest.mock("../../../../../cmd/src/response/HandlerResponse");

import { CommandResponse, IHandlerParameters } from "../../../../../cmd";
import { ImperativeConfig } from "../../../../../utilities/src/ImperativeConfig";
import { IssueSeverity, PluginIssues } from "../../../../src/plugins/utilities/PluginIssues";
import { resolve } from "path";
import { TextUtils } from "../../../../../utilities";
import FirststepsHandler from "../../../../src/plugins/cmd/firststeps/firststeps.handler";
import { ImperativeError } from "../../../../../error/src/ImperativeError";

describe("Plugin validate command handler", () => {

    const pluginName = "sample-plugin";
    const pluginIssues: PluginIssues = PluginIssues.instance;

    /* Put a base CLI config into ImperativeConfig. It is required by infrastructure
    * that is called underneath the functions that we want to test.
    */
    const impCfg: ImperativeConfig = ImperativeConfig.instance;
    impCfg.loadedConfig = require("../../__resources__/baseCliConfig.testData");
    impCfg.callerLocation = resolve("../../../../../../imperative-sample/lib/index.js");

    beforeEach(() => {
        // Mocks need cleared after every test for clean test runs
        jest.resetAllMocks();

        pluginIssues.getInstalledPlugins = jest.fn().mockReturnValue({
            "imperative-sample-plugin": {
                package: "C:\\Some\\Path\\To\\imperative-plugins",
                registry: "http://imperative-npm-registry:4873/",
                version: "1.0.1"
            }
        });
    });

    const setExitCodeFunction = jest.fn();
    /**
     * Create object to be passed to process function
     *
     * @returns {IHandlerParameters}
     */
    const getIHandlerParametersObject = (): IHandlerParameters => {
        const x: any = {
            response: new (CommandResponse as any)(),
            arguments: {
                plugin: null
            }
        };
        return x as IHandlerParameters;
    };

    describe("process function", () => {
        const params = getIHandlerParametersObject();
        const firststepsHandler = new FirststepsHandler() as any;
        const mockDisplayPluginIssues = jest.fn();
        const orgDisplayPluginIssues = firststepsHandler.displayPluginIssues;

        beforeEach(() => {
            firststepsHandler.displayPluginIssues = mockDisplayPluginIssues;
        });

        afterEach(() => {
            firststepsHandler.displayPluginIssues = orgDisplayPluginIssues;
        });


        it("should display proper message when no plugin is provided in arguments", async () => {
            pluginIssues.getInstalledPlugins = jest.fn().mockReturnValue({});

            // plugin name is null
            params.arguments.plugin = null;
            let errorWithParameterNull;
            try {
                await firststepsHandler.process(params as IHandlerParameters);
            } catch (err) {
                errorWithParameterNull = err;
            }
            expect(errorWithParameterNull).toBeDefined();
            expect(errorWithParameterNull).toBeInstanceOf(ImperativeError);
            expect(errorWithParameterNull.message).toBe(`${TextUtils.chalk.yellow.bold("Package name")} is required.`);

            // // plugin name is empty
            params.arguments.plugin = null;
            let errorWithParameterEmpty;
            try {
                await firststepsHandler.process(params as IHandlerParameters);
            } catch (err) {
                errorWithParameterEmpty = err;
            }
            expect(errorWithParameterEmpty).toBeDefined();
            expect(errorWithParameterEmpty).toBeInstanceOf(ImperativeError);
            expect(errorWithParameterEmpty.message).toBe(`${TextUtils.chalk.yellow.bold("Package name")} is required.`);
        });

        it("should have no first steps with non-existent plugin name", async () => {
            params.arguments.plugin = ["NonExistentPluginName"];
            let error;
            try {
                await firststepsHandler.process(params as IHandlerParameters);
            } catch (err) {
                error = err;
            }
            expect(params.response.console.log).toHaveBeenCalledWith(
                "The specified plugin is not installed."
                );
            expect(error).not.toBeDefined();
        });

        it("should have first steps with existent plugin name", async () => {
            params.arguments.plugin = ["imperative-sample-plugin"];
            let error;
            try {
                await firststepsHandler.process(params as IHandlerParameters);
            } catch (err) {
                error = err;
            }
            expect(params.response.console.log).toHaveBeenCalledWith(
                "The first steps are not defined for this plugin."
                );
            expect(error).not.toBeDefined();
        });
    });

});

