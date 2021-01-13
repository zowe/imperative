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

import { IHandlerParameters } from "../../../../..";
import { Config } from "../../../../../config/src/Config";
import { CliUtils, ImperativeConfig } from "../../../../../utilities";
import { IImperativeConfig } from "../../../../src/doc/IImperativeConfig";
import { expectedSchemaObjectNoBase } from
    "../../../../../../__tests__/__integration__/imperative/__tests__/__integration__/cli/config/__resources__/expectedObjects"
import InitHandler from "../../../../src/config/cmd/init/init.handler";
import * as config from "../../../../../../__tests__/__integration__/imperative/src/imperative";
import * as path from "path";
import * as lodash from "lodash";
import * as fs from "fs";
import * as os from "os";
import { CredentialManagerFactory } from "../../../../../security";

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
        arguments: {},
        };
    return x as IHandlerParameters;
};

const fakeConfig = config as IImperativeConfig;
const fakeProjPath = path.join(__dirname, "fakeapp.config.json");
const fakeSchemaPath = path.join(__dirname, "fakeapp.schema.json");
const fakeProjUserPath = path.join(__dirname, "fakeapp.config.user.json");
const fakeGblProjPath = path.join(__dirname, ".fakeapp", "fakeapp.config.json");
const fakeGblSchemaPath = path.join(__dirname, ".fakeapp", "fakeapp.schema.json");
const fakeGblProjUserPath = path.join(__dirname, ".fakeapp", "fakeapp.config.user.json");

describe("Configuration Initialization command handler", () => {
    let writeFileSyncSpy: any;
    let existsSyncSpy: any;
    let osHomedirSpy: any;
    let currentWorkingDirectorySpy: any;
    let searchSpy: any;
    let setSchemaSpy: any;
    let promptWithTimeoutSpy: any;

    async function setupConfigToLoad() {
        // Load the ImperativeConfig so init can work properly

        // Steps to take before calling:
        // 1. Mock out Config.search the appropriate number of times
        // 2. Mock out fs.existsSync and/or fs.readFileSync the appropriate number of times

        osHomedirSpy.mockReturnValue(__dirname); // Pretend the current directory is the homedir
        currentWorkingDirectorySpy.mockReturnValue(__dirname); // Pretend the current directory is where the command was invoked
        ImperativeConfig.instance.config = await Config.load("fakeapp", {});
    }

    beforeEach( async () => {
        jest.resetAllMocks();
        ImperativeConfig.instance.loadedConfig = lodash.cloneDeep(fakeConfig);
        Object.defineProperty(CredentialManagerFactory, "initialized", { get: () => true });

        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");
        osHomedirSpy = jest.spyOn(os, "homedir");
        currentWorkingDirectorySpy = jest.spyOn(process, "cwd");
        searchSpy = jest.spyOn(Config, "search");
        promptWithTimeoutSpy = jest.spyOn(CliUtils, "promptWithTimeout");
    });

    afterAll( () => {
        jest.restoreAllMocks();
    });

    it("should attempt to initialize the project configuration", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // Prompting for secure property
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(expect.stringContaining("blank to skip:"), {"hideText": true});

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config

        // Secure value supplied during prompting should be on properties
        expect(ImperativeConfig.instance.config.properties.profiles.my_profiles.profiles.secured.properties.secret).toEqual("fakeValue");
    });

    it("should attempt to initialize the project user configuration", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = true;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.info; // Delete info as well

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0); // User config is a skeleton - no prompting should occur

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjUserPath, JSON.stringify(compObj, null, Config.INDENT)); // Config
    });

    it("should attempt to initialize the global project configuration", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = true;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // Prompting for secure property
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(expect.stringContaining("blank to skip:"), {"hideText": true});

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeGblProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config

        // Secure value supplied during prompting should be on properties
        expect(ImperativeConfig.instance.config.properties.profiles.my_profiles.profiles.secured.properties.secret).toEqual("fakeValue");
    });

    it("should attempt to initialize the global project user configuration", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = true;
        params.arguments.global = true;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.info; // Delete info as well

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0); // User config is a skeleton - no prompting should occur

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeGblProjUserPath, JSON.stringify(compObj, null, Config.INDENT)); // Config
    });

    it("should attempt to initialize the project configuration with prompt flag false", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = false;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0); // CI flag should not prompt

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config
    });

    it("should attempt to initialize the project user configuration with prompting disabled", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = true;
        params.arguments.global = false;
        params.arguments.prompt = false;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.info; // Delete info as well

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0); // CI flag should not prompt

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjUserPath, JSON.stringify(compObj, null, Config.INDENT)); // Config
    });

    it("should attempt to initialize the global project configuration with prompt flag false", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = true;
        params.arguments.prompt = false;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0); // CI flag should not prompt

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeGblProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config
    });

    it("should attempt to initialize the global project user configuration with prompting disabled", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = true;
        params.arguments.global = true;
        params.arguments.prompt = false;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "fakeValue");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.info; // Delete info as well

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0); // CI flag should not prompt

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeGblProjUserPath, JSON.stringify(compObj, null, Config.INDENT)); // Config
    });

    it("should attempt to initialize the project configuration and use boolean true for the prompt", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "true");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // Prompting for secure property
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(expect.stringContaining("blank to skip:"), {"hideText": true});

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config

        // Secure value supplied during prompting should be on properties
        expect(ImperativeConfig.instance.config.properties.profiles.my_profiles.profiles.secured.properties.secret).toEqual(true);
    });

    it("should attempt to initialize the project configuration and use boolean false for the prompt", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => "false");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // Prompting for secure property
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(expect.stringContaining("blank to skip:"), {"hideText": true});

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config

        // Secure value supplied during prompting should be on properties
        expect(ImperativeConfig.instance.config.properties.profiles.my_profiles.profiles.secured.properties.secret).toEqual(false);
    });

    it("should attempt to initialize the project configuration and use a number for the prompt", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const randomValueString = "9001";
        const randomValueNumber = parseInt(randomValueString, 10);
        const promptWithTimeoutSpy = jest.fn(() => randomValueString);
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // Prompting for secure property
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(expect.stringContaining("blank to skip:"), {"hideText": true});

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config

        // Secure value supplied during prompting should be on properties
        expect(ImperativeConfig.instance.config.properties.profiles.my_profiles.profiles.secured.properties.secret).toEqual(randomValueNumber);
    });

    it("should attempt to initialize the project configuration and handle getting nothing from the prompt", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => undefined);
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(setSchemaSpy).toHaveBeenCalledTimes(1);
        expect(setSchemaSpy).toHaveBeenCalledWith(expectedSchemaObjectNoBase);

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        // Prompting for secure property
        expect(promptWithTimeoutSpy).toHaveBeenCalledWith(expect.stringContaining("blank to skip:"), {"hideText": true});

        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        // Schema
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeSchemaPath, JSON.stringify(expectedSchemaObjectNoBase, null, Config.INDENT));
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(2, fakeProjPath, JSON.stringify(compObj, null, Config.INDENT)); // Config

        // Secure value supplied during prompting should be on properties
        expect(ImperativeConfig.instance.config.properties.profiles.my_profiles.profiles.secured.properties.secret).toEqual(undefined);
    });

    it("should display warning if unable to securely save credentials", async () => {
        const handler = new InitHandler();
        const params = getIHandlerParametersObject();
        params.arguments.user = false;
        params.arguments.global = false;
        params.arguments.prompt = true;

        existsSyncSpy.mockReturnValue(false); // No files exist
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        await setupConfigToLoad(); // Setup the config

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        // We aren't testing the config initialization - clear the spies
        existsSyncSpy.mockClear();
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();

        // initWithSchema
        const promptWithTimeoutSpy = jest.fn(() => undefined);
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        writeFileSyncSpy.mockImplementation(); // Don't actually write files
        jest.spyOn(CredentialManagerFactory, "initialized", "get").mockReturnValue(false);

        await handler.process(params as IHandlerParameters);

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(2);
        expect(params.response.console.log).toHaveBeenCalledTimes(2);
        expect((params.response.console.log as any).mock.calls[0][0]).toContain("Unable to securely save credentials");
    });
});
