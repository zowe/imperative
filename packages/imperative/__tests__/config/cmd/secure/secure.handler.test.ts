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
import { IConfigOpts } from "../../../../../config";
import { CliUtils, ImperativeConfig } from "../../../../../utilities";
import { IImperativeConfig } from "../../../../src/doc/IImperativeConfig";
import { ICredentialManagerInit } from "../../../../../security/src/doc/ICredentialManagerInit";
import { CredentialManagerFactory } from "../../../../../security";
import { expectedConfigObject } from
    "../../../../../../__tests__/__integration__/imperative/__tests__/__integration__/cli/config/__resources__/expectedObjects"
import SecureHandler from "../../../../src/config/cmd/secure/secure.handler";
import * as config from "../../../../../../__tests__/__integration__/imperative/src/imperative";
import * as keytar from "keytar";
import * as path from "path";
import * as lodash from "lodash";
import * as fs from "fs";
import * as os from "os";

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

const credentialManager: ICredentialManagerInit = {
    service: "Zowe",
    displayName: "imperativeTestCredentialManager",
    invalidOnFailure: false
};

const fakeConfig = config as IImperativeConfig;
const fakeProjPath = path.join(__dirname, "fakeapp.config.json");
const fakeSchemaPath = path.join(__dirname, "fakeapp.schema.json");
const fakeProjUserPath = path.join(__dirname, "fakeapp.config.user.json");
const fakeGblProjPath = path.join(__dirname, ".fakeapp", "fakeapp.config.json");
const fakeGblSchemaPath = path.join(__dirname, ".fakeapp", "fakeapp.schema.json");
const fakeGblProjUserPath = path.join(__dirname, ".fakeapp", "fakeapp.config.user.json");
const fakeUnrelatedPath = path.join(__dirname, "fakeapp.unrelated.config.json");

const fakeSecureDataJson = {};
fakeSecureDataJson[fakeProjPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "fakeSecureValue"};
fakeSecureDataJson[fakeGblProjPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "fakeSecureValue"};
fakeSecureDataJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "anotherFakeSecureValue"};

const fakeSecureData = Buffer.from(JSON.stringify(fakeSecureDataJson)).toString("base64");

describe("Configuration Secure command handler", () => {
    let readFileSyncSpy: any;
    let writeFileSyncSpy: any;
    let existsSyncSpy: any;
    let osHomedirSpy: any;
    let currentWorkingDirectorySpy: any;
    let searchSpy: any;
    let setSchemaSpy: any;
    let promptWithTimeoutSpy: any;
    let keytarGetPasswordSpy: any;
    let keytarSetPasswordSpy: any;
    let keytarDeletePasswordSpy: any;

    async function setupConfigToLoad() {
        // Load the ImperativeConfig so init can work properly

        // Steps to take before calling:
        // 1. Mock out Config.search the appropriate number of times
        // 2. Mock out fs.existsSync and/or fs.readFileSync the appropriate number of times

        const opts: IConfigOpts = {
            vault: {
                load: ((k: string): Promise<string> => {
                    return CredentialManagerFactory.manager.load(k, true)
                }),
                save: ((k: string, v: any): Promise<void> => {
                    return CredentialManagerFactory.manager.save(k, v);
                }),
                name: CredentialManagerFactory.manager.name
            }
        };

        osHomedirSpy.mockReturnValue(__dirname); // Pretend the current directory is the homedir
        currentWorkingDirectorySpy.mockReturnValue(__dirname); // Pretend the current directory is where the command was invoked
        ImperativeConfig.instance.config = await Config.load("fakeapp", opts);
    }

    beforeAll( async() => {
        keytarGetPasswordSpy = jest.spyOn(keytar, "getPassword");
        keytarSetPasswordSpy = jest.spyOn(keytar, "setPassword");
        keytarDeletePasswordSpy = jest.spyOn(keytar, "deletePassword");

        // Start mocking out some of the credential management functions
        // Any secure data being loaded will appear to be fakeSecureValue
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();

        await CredentialManagerFactory.initialize(credentialManager); // Prepare config setup
    });

    beforeEach( async () => {
        ImperativeConfig.instance.loadedConfig = lodash.cloneDeep(fakeConfig);

        osHomedirSpy = jest.spyOn(os, "homedir");
        currentWorkingDirectorySpy = jest.spyOn(process, "cwd");
        searchSpy = jest.spyOn(Config, "search");
        promptWithTimeoutSpy = jest.spyOn(CliUtils, "promptWithTimeout");
        keytarGetPasswordSpy = jest.spyOn(keytar, "getPassword");
        keytarSetPasswordSpy = jest.spyOn(keytar, "setPassword");
        keytarDeletePasswordSpy = jest.spyOn(keytar, "deletePassword");
    });

    afterEach( () => {
        jest.restoreAllMocks();
    });

    it("should attempt to secure the project configuration", async () => {
        const handler = new SecureHandler();
        const params = getIHandlerParametersObject();

        params.arguments.user = false;
        params.arguments.global = false;

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValue(false); // Only the project config exists
        writeFileSyncSpy.mockImplementation();
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return

        await setupConfigToLoad(); // Setup the config

        // We aren't testing the config initialization - clear the spies
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();
        writeFileSyncSpy.mockClear();
        existsSyncSpy.mockClear();
        readFileSyncSpy.mockClear();

        const promptWithTimeoutSpy = jest.fn(() => "fakePromptingData");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = {};
        fakeSecureDataExpectedJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "anotherFakeSecureValue"};
        fakeSecureDataExpectedJson[fakeProjPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakePromptingData"};
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should attempt to secure the user configuration", async () => {
        const handler = new SecureHandler();
        const params = getIHandlerParametersObject();

        params.arguments.user = true;
        params.arguments.global = false;

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(true).mockReturnValue(false); // Only the user config exists
        writeFileSyncSpy.mockImplementation();
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return

        await setupConfigToLoad(); // Setup the config

        // We aren't testing the config initialization - clear the spies
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();
        writeFileSyncSpy.mockClear();
        existsSyncSpy.mockClear();
        readFileSyncSpy.mockClear();

        const promptWithTimeoutSpy = jest.fn(() => "fakePromptingData");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = {};
        fakeSecureDataExpectedJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "anotherFakeSecureValue"};
        fakeSecureDataExpectedJson[fakeProjUserPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakePromptingData"};
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjUserPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should attempt to secure the global project configuration", async () => {
        const handler = new SecureHandler();
        const params = getIHandlerParametersObject();

        params.arguments.user = false;
        params.arguments.global = true;

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(false)
                     .mockReturnValueOnce(true).mockReturnValue(false); // Only the global project config exists
        writeFileSyncSpy.mockImplementation();
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return

        await setupConfigToLoad(); // Setup the config

        // We aren't testing the config initialization - clear the spies
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();
        writeFileSyncSpy.mockClear();
        existsSyncSpy.mockClear();
        readFileSyncSpy.mockClear();

        const promptWithTimeoutSpy = jest.fn(() => "fakePromptingData");
        (params.response.console as any).prompt = promptWithTimeoutSpy;
        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = {};
        fakeSecureDataExpectedJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "anotherFakeSecureValue"};
        fakeSecureDataExpectedJson[fakeGblProjPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakePromptingData"};
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should attempt to secure the global user configuration", async () => {
        const handler = new SecureHandler();
        const params = getIHandlerParametersObject();

        params.arguments.user = true;
        params.arguments.global = true;

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)
                     .mockReturnValue(false); // Only the global user config exists
        writeFileSyncSpy.mockImplementation();
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return

        await setupConfigToLoad(); // Setup the config

        // We aren't testing the config initialization - clear the spies
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();
        writeFileSyncSpy.mockClear();
        existsSyncSpy.mockClear();
        readFileSyncSpy.mockClear();

        const promptWithTimeoutSpy = jest.fn(() => "fakePromptingData");
        (params.response.console as any).prompt = promptWithTimeoutSpy;

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = {};
        fakeSecureDataExpectedJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secure": "anotherFakeSecureValue"};
        fakeSecureDataExpectedJson[fakeGblProjUserPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakePromptingData"};
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblProjUserPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should fail to secure the project configuration if there is no project configuration", async () => {
        const handler = new SecureHandler();
        const params = getIHandlerParametersObject();

        params.arguments.user = false;
        params.arguments.global = false;

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)
                     .mockReturnValue(false); // Only the global user config exists
        writeFileSyncSpy.mockImplementation();
        searchSpy.mockReturnValueOnce(fakeProjUserPath).mockReturnValueOnce(fakeProjPath); // Give search something to return
        promptWithTimeoutSpy.mockReturnValue("fakePromptingData"); // Any secure data saved will appear to be fakePromptingData

        await setupConfigToLoad(); // Setup the config

        // We aren't testing the config initialization - clear the spies
        searchSpy.mockClear();
        osHomedirSpy.mockClear();
        currentWorkingDirectorySpy.mockClear();
        promptWithTimeoutSpy.mockClear();
        writeFileSyncSpy.mockClear();
        existsSyncSpy.mockClear();
        readFileSyncSpy.mockClear();

        promptWithTimeoutSpy.mockReturnValue("fakePromptingData"); // Any secure data saved will appear to be fakePromptingData
        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        fakeSecureDataExpectedJson[fakeGblProjUserPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakePromptingData"};
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        compObj.secure = ["profiles.my_profiles.profiles.secured.properties.secret"]; // Add the secret field to the secrets

        // tslint:disable-next-line: no-magic-numbers
        expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(0);
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(0);
        expect(promptWithTimeoutSpy).toHaveBeenCalledTimes(0);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(0);
        expect(ImperativeConfig.instance.config.api.layers.get().properties.secure.length).toEqual(0);
    });
});
