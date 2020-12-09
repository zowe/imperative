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

import { CommandResponse, IHandlerParameters } from "../../../../..";
import { Config } from "../../../../../config/src/Config";
import { CliUtils, ImperativeConfig } from "../../../../../utilities";
import { IImperativeConfig } from "../../../../src/doc/IImperativeConfig";
import { expectedSchemaObject } from
    "../../../../../../__tests__/__integration__/imperative/__tests__/__integration__/cli/config/__resources__/expectedObjects"
import InitHandler from "../../../../src/config/cmd/init/init.handler";
import * as config from "../../../../../../__tests__/__integration__/imperative/src/imperative";
import * as path from "path";
import * as lodash from "lodash";
import * as fs from "fs";
import * as os from "os";

const getIHandlerParametersObject = (): IHandlerParameters => {
    const x: any = {
        response: new (CommandResponse as any)(),
        arguments: {
            package: undefined
            },
        };
    return x as IHandlerParameters;
};

const fakeConfig = config as IImperativeConfig;
const fakeProjPath = path.join(__dirname, "fakeApp.config.json");
const fakeProjUserPath = path.join(__dirname, "fakeApp.config.user.json");

describe("Configuration Initialization command handler", () => {
    let readFileSyncSpy: any;
    let writeFileSyncSpy: any;
    let existsSyncSpy: any;
    let pathJoinSpy: any;
    let pathResolveSpy: any;
    let pathParseSpy: any;
    let pathDirnameSpy: any;
    let osHomedirSpy: any;
    let searchSpy: any;
    let setSchemaSpy: any;
    let promptWithTimeoutSpy: any;

    async function setupConfigToLoad() {
        // Load the ImperativeConfig so init can work properly

        // Steps to take before calling:
        // 1. Mock out Config.search the appropriate number of times
        // 2. Mock out fs.existsSync and/or fs.readFileSync the appropriate number of times

        osHomedirSpy.mockReturnValue(__dirname); // Pretend the current directory is the homedir
        ImperativeConfig.instance.config = await Config.load("fakeapp", {});
    }

    beforeEach( async () => {
        jest.resetAllMocks();
        ImperativeConfig.instance.loadedConfig = lodash.cloneDeep(fakeConfig);
        ImperativeConfig.instance.config = await Config.load("fakeApp");

        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");
        pathJoinSpy = jest.spyOn(path, "join");
        pathResolveSpy = jest.spyOn(path, "resolve");
        pathParseSpy = jest.spyOn(path, "parse");
        pathDirnameSpy = jest.spyOn(path, "dirname");
        osHomedirSpy = jest.spyOn(os, "homedir");
        searchSpy = jest.spyOn(Config, "search");
        setSchemaSpy = jest.spyOn(Config.prototype, "setSchema");
        promptWithTimeoutSpy = jest.spyOn(CliUtils, "promptWithTimeout");
    });

    afterAll( () => {
        jest.restoreAllMocks();
    })

    it("should attempt to initialize the project configuration", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.ci = false;

        existsSyncSpy.mockReturnValueOnce(true).mockReturnValue(false); // Only project config matters.
        searchSpy.mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();

        // initWithSchema
        promptWithTimeoutSpy.mockReturnValue("fakeValue"); // Add fake values for all prompts


        await handler.process(params as IHandlerParameters);

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObject);
        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(string, true, 900)

    });
    // it("should attempt to initialize the user configuration", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = true;
    //     params.arguments.global = false;
    //     params.arguments.ci = false;
    //     await handler.process(params as IHandlerParameters);
    // });
    // it("should attempt to initialize the global project configuration", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = false;
    //     params.arguments.global = true;
    //     params.arguments.ci = false;
    //     await handler.process(params as IHandlerParameters);
    // });
    // it("should attempt to initialize the global user configuration", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = true;
    //     params.arguments.global = true;
    //     params.arguments.ci = false;
    //     await handler.process(params as IHandlerParameters);
    // });
    // it("should attempt to initialize the project configuration with ci", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = false;
    //     params.arguments.global = false;
    //     params.arguments.ci = true;
    //     await handler.process(params as IHandlerParameters);
    // });
    // it("should attempt to initialize the user configuration with ci", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = true;
    //     params.arguments.global = false;
    //     params.arguments.ci = true;
    //     await handler.process(params as IHandlerParameters);
    // });
    // it("should attempt to initialize the global project configuration with ci", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = false;
    //     params.arguments.global = true;
    //     params.arguments.ci = true;
    //     await handler.process(params as IHandlerParameters);
    // });
    // it("should attempt to initialize the global user configuration with ci", async () => {
    //     const handler = new InitHandler();
    //     const params = getIHandlerParametersObject();
    //     params.arguments.user = true;
    //     params.arguments.global = true;
    //     params.arguments.ci = true;
    //     await handler.process(params as IHandlerParameters);
    // });
}