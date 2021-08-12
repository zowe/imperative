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
import { expectedConfigObject, expectedUserConfigObject } from
    "../../../../../../__tests__/__integration__/imperative/__tests__/__integration__/cli/config/__resources__/expectedObjects"
import SetHandler from "../../../../src/config/cmd/set/set.handler";
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
const fakeUnrelatedPath = path.join(__dirname, "anotherapp.config.json");

const fakeSecureDataJson = {};
fakeSecureDataJson[fakeProjPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakeSecureValue"};
fakeSecureDataJson[fakeGblProjPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "fakeSecureValue"};

const fakeSecureData = Buffer.from(JSON.stringify(fakeSecureDataJson)).toString("base64");

describe("Configuration Set command handler", () => {
    let readFileSyncSpy: any;
    let writeFileSyncSpy: any;
    let existsSyncSpy: any;
    let osHomedirSpy: any;
    let currentWorkingDirectorySpy: any;
    let searchSpy: any;
    let setSchemaSpy: any;
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
                })
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
        keytarGetPasswordSpy = jest.spyOn(keytar, "getPassword");
        keytarSetPasswordSpy = jest.spyOn(keytar, "setPassword");
        keytarDeletePasswordSpy = jest.spyOn(keytar, "deletePassword");
    });

    afterEach( () => {
        jest.restoreAllMocks();
    });

    it("should secure a property and add it to the project configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = true;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.testProperty";
        params.arguments.value = "aSecuredTestProperty";

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        fakeSecureDataExpectedJson[fakeProjPath] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "fakeSecureValue",
            "profiles.my_profiles.profiles.secured.properties.testProperty": "aSecuredTestProperty"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.testProperty; // Delete the new secret
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret", "testProperty"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should secure a property and add it to the user configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = true;
        params.arguments.globalConfig = false;
        params.arguments.secure = true;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.testProperty";
        params.arguments.value = "aSecuredTestProperty";

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedUserConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(true).mockReturnValue(false); // Only the user project config exists
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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        fakeSecureDataExpectedJson[fakeProjUserPath] = {
            "profiles.my_profiles.profiles.secured.properties.testProperty": "aSecuredTestProperty"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.testProperty; // Delete the new secret
        compObj.profiles.my_profiles.profiles.secured.secure = ["testProperty"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1); // No pre-existing secure values, only the combine
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjUserPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should secure a property and add it to the global project configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = true;
        params.arguments.secure = true;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.testProperty";
        params.arguments.value = "aSecuredTestProperty";

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeGblProjPath];
        fakeSecureDataExpectedJson[fakeGblProjPath] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "fakeSecureValue",
            "profiles.my_profiles.profiles.secured.properties.testProperty": "aSecuredTestProperty"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.testProperty; // Delete the new secret
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret", "testProperty"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should secure a property and add it to the global user configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = true;
        params.arguments.globalConfig = true;
        params.arguments.secure = true;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.testProperty";
        params.arguments.value = "aSecuredTestProperty";

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedUserConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false)
                     .mockReturnValueOnce(true).mockReturnValue(false); // Only the global user project config exists
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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        fakeSecureDataExpectedJson[fakeGblProjUserPath] = {
            "profiles.my_profiles.profiles.secured.properties.testProperty": "aSecuredTestProperty"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret; // Delete the secret
        delete compObj.profiles.my_profiles.profiles.secured.properties.testProperty; // Delete the new secret
        compObj.profiles.my_profiles.profiles.secured.secure = ["testProperty"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1); // No pre-existing secure values, only the combine
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblProjUserPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define an insecure property and add it to the project configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = false;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = "anUnsecuredTestProperty";

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        compObj.profiles.my_profiles.profiles.secured.secure = []; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define an insecure property and add it to the user configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = true;
        params.arguments.globalConfig = false;
        params.arguments.secure = false;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = "anUnsecuredTestProperty";

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedUserConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(true).mockReturnValue(false); // Only the global user project config exists
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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        compObj.profiles.my_profiles.profiles.secured.secure = []; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1); // No pre-existing secure values, only the combine
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjUserPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define an insecure property and add it to the global project configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = true;
        params.arguments.secure = false;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = "anUnsecuredTestProperty";

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeGblProjPath];
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        compObj.profiles.my_profiles.profiles.secured.secure = []; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define an insecure property and add it to the global user configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = true;
        params.arguments.globalConfig = true;
        params.arguments.secure = false;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = "anUnsecuredTestProperty";

        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(fakeSecureData);
        keytarSetPasswordSpy.mockImplementation();
        keytarDeletePasswordSpy.mockImplementation();
        readFileSyncSpy = jest.spyOn(fs, "readFileSync");
        writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");
        existsSyncSpy = jest.spyOn(fs, "existsSync");

        const eco = lodash.cloneDeep(expectedUserConfigObject);
        eco.$schema = "./fakeapp.schema.json";

        readFileSyncSpy.mockReturnValueOnce(JSON.stringify(eco));
        existsSyncSpy.mockReturnValueOnce(false).mockReturnValueOnce(false)
                     .mockReturnValueOnce(true).mockReturnValue(false); // Only the global user project config exists
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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        compObj.profiles.my_profiles.profiles.secured.secure = []; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1); // No pre-existing secure values, only the combine
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeGblProjUserPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define an insecure property and add it to the project configuration while keeping other secure props", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = false;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = "anUnsecuredTestProperty";

        const testKeystoreJson = lodash.cloneDeep(fakeSecureDataJson);
        testKeystoreJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "anotherFakeSecureValue"};
        const testKeystore = Buffer.from(JSON.stringify(testKeystoreJson)).toString("base64");


        // Start doing fs mocks
        // And the prompting of the secure handler
        keytarGetPasswordSpy.mockReturnValue(testKeystore);
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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        fakeSecureDataExpectedJson[fakeUnrelatedPath] = {"profiles.my_profiles.profiles.secured.properties.secret": "anotherFakeSecureValue"};
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        compObj.profiles.my_profiles.profiles.secured.secure = []; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should prompt for a property and add it to the project configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = false;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.info";


        const promptSpy = jest.fn(() => "anUnsecuredTestProperty");
        (params.response.console as any).prompt = promptSpy;

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        // ConfigSecure.save() deletes and adds back this secure entry, which changes the order
        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        fakeSecureDataExpectedJson[fakeProjPath] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "fakeSecureValue"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret;
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(promptSpy).toHaveBeenCalledTimes(1);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
        expect(compObj.profiles.my_profiles.profiles.secured.properties.info).toEqual("anUnsecuredTestProperty");
    });

    it("should allow you to define a property and add it to the project configuration with secure equal to null and secure it", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = null;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = "aSecuredTestProperty";

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        fakeSecureDataExpectedJson[fakeProjPath] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "aSecuredTestProperty"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret;
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define a property and add it to the project configuration with secure equal to null and not secure it", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = null;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.info";
        params.arguments.value = "anUnsecuredTestProperty";

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        // ConfigSecure.save() deletes and adds back this secure entry, which changes the order
        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        fakeSecureDataExpectedJson[fakeProjPath] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "fakeSecureValue"
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret;
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret",]; // Add the secret field to the secrets

        // tslint:disable-next-line: no-magic-numbers
        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define a property as json and add it to the project configuration", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = true;
        params.arguments.json = true;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = '{"fakeProp":"fakeVal"}';

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");

        await handler.process(params);

        const fakeSecureDataExpectedJson = lodash.cloneDeep(fakeSecureDataJson);
        delete fakeSecureDataExpectedJson[fakeProjPath];
        fakeSecureDataExpectedJson[fakeProjPath] = {
            "profiles.my_profiles.profiles.secured.properties.secret": {"fakeProp": "fakeVal"}
        };
        const fakeSecureDataExpected = Buffer.from(JSON.stringify(fakeSecureDataExpectedJson)).toString("base64");


        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret;
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret"]; // Add the secret field to the secrets

        if (process.platform === "win32") {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(4);
        } else {
            // tslint:disable-next-line: no-magic-numbers
            expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(3);
        }
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledWith("Zowe", "secure_config_props", fakeSecureDataExpected);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
        // tslint:disable-next-line: no-magic-numbers
        expect(writeFileSyncSpy).toHaveBeenNthCalledWith(1, fakeProjPath, JSON.stringify(compObj, null, 4)); // Config
    });

    it("should allow you to define a property as json and not add it to the project configuration if it is bad", async () => {
        const handler = new SetHandler();
        const params = getIHandlerParametersObject();

        params.arguments.userConfig = false;
        params.arguments.globalConfig = false;
        params.arguments.secure = true;
        params.arguments.json = true;
        params.arguments.property = "profiles.my_profiles.profiles.secured.properties.secret";
        params.arguments.value = '{"fakeProp"::"fakeVal"}';

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

        setSchemaSpy = jest.spyOn(ImperativeConfig.instance.config, "setSchema");
        let error: any;

        try {
            await handler.process(params);
        } catch (err) {
            error = err;
        }

        const compObj: any = {};
        // Make changes to satisfy what would be stored on the JSON
        compObj.$schema = "./fakeapp.schema.json" // Fill in the name of the schema file, and make it first
        lodash.merge(compObj, ImperativeConfig.instance.config.properties); // Add the properties from the config
        delete compObj.profiles.my_profiles.profiles.secured.properties.secret;
        compObj.profiles.my_profiles.profiles.secured.secure = ["secret"]; // Add the secret field to the secrets

        expect(error).toBeDefined();
        expect(error.message).toContain("could not parse JSON value");
        expect(error.message).toContain("Unexpected token :");
        // tslint:disable-next-line: no-magic-numbers
        expect(keytarDeletePasswordSpy).toHaveBeenCalledTimes(0);
        expect(keytarGetPasswordSpy).toHaveBeenCalledTimes(1);
        expect(keytarSetPasswordSpy).toHaveBeenCalledTimes(0);
        expect(writeFileSyncSpy).toHaveBeenCalledTimes(0);
    });
});
