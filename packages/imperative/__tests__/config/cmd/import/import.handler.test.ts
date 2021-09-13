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

import ImportHandler from "../../../../src/config/cmd/import/import.handler";
import { URL } from "url";
import { join } from "path";
import { IHandlerParameters } from "../../../../..";
import { ImperativeConfig } from "../../../../../utilities";
import { IImperativeConfig } from "../../../../src/doc/IImperativeConfig";
import { Config } from "../../../../../config";
import { CredentialManagerFactory } from "../../../../../security";
import * as config from "../../../../../../__tests__/__integration__/imperative/src/imperative";
import * as fs from "fs";
import * as lodash from "lodash";
import { Imperative } from "../../../../src/Imperative";


const flushPromises = () => new Promise(setImmediate);

const localSchemaDir: string = join(__dirname, "__resources__");
const localSchema: string = join(localSchemaDir, "zowe.schema.json.original");
const localConfig: string = join(localSchemaDir, "zowe.config.json.original");
const localDownloadedSchemaPath = join(localSchemaDir, "__data__", "downloaded.schema.json");
const localSchemaUrl: URL = new URL("file://" + localSchema);

const configAddress = "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/79dafd7c98e53f10eb668a29ddeb08ae5412d609/zowe.config.json";
const schemaAddress = "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/79dafd7c98e53f10eb668a29ddeb08ae5412d609/zowe.schema.json";
const badConfigAddress = "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/79dafd7c98e53f10eb668a29ddeb08ae5412d609/zowe.config.json.bad";
const badSchemaAddress = "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/34cf180414061107ddb8b7f5a4e693b8fd7c2853/zowe.schema.json.bad";
const badAddress = "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/34cf180414061107ddb8b7f5a4e693b8fd7c2854/zowe.config.json.bad";

const configUrl: URL = new URL(configAddress);
const schemaUrl: URL = new URL(schemaAddress);
const badConfigUrl: URL = new URL(badConfigAddress);
const badSchemaUrl: URL = new URL(badSchemaAddress);
const badUrl: URL = new URL(badAddress);

describe("Configuration import command handler", () => {

    describe("handler", () => {

        const fakeConfig = config as IImperativeConfig;

        
        let osHomedirSpy: any;
        let currentWorkingDirectorySpy: any;
        let fetchConfigSpy: any;
        let downloadSchemaSpy: any;
        let existsSyncSpy: any;
        let readFileSyncSpy: any;

        function getIHandlerParametersObject(): IHandlerParameters {
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
                    userConfig: false,
                    overwrite: false,
                    location: undefined
                }
            };
            return x as IHandlerParameters;
        }

        async function setupConfigToLoad() {
            // Load the ImperativeConfig so import can work properly

            osHomedirSpy.mockReturnValue(__dirname); // Pretend the current directory is the homedir
            currentWorkingDirectorySpy.mockReturnValue(__dirname); // Pretend the current directory is where the command was invoked
            ImperativeConfig.instance.config = await Config.load("fakeapp", {});
        }

        beforeEach( async () => {
            jest.resetAllMocks();
            ImperativeConfig.instance.loadedConfig = lodash.cloneDeep(fakeConfig);
            Object.defineProperty(CredentialManagerFactory, "initialized", { get: () => true });
            fetchConfigSpy = jest.spyOn((ImportHandler as any), "fetchConfig");
            downloadSchemaSpy = jest.spyOn((ImportHandler as any), "downloadSchema");
        });

        it.skip("should be able to import from a web address", async () => {
            const handler = new ImportHandler();
            const params = getIHandlerParametersObject();

            params.arguments.location = configAddress;
            fetchConfigSpy.mockReturnValue(fs.readFileSync(localConfig));
            readFileSyncSpy = jest.spyOn(fs, "readFileSync");
            existsSyncSpy = jest.spyOn(fs, "existsSync");

            await setupConfigToLoad();
            await handler.process(params);
        });
    });

    describe("fetch config", () => {
        it("should be able to fetch the configuration file from a web address", async () => {
            const fetchConfig = (ImportHandler.prototype as any).fetchConfig;
            const config = await fetchConfig(configUrl);
            expect(config).toMatchSnapshot();
        });

        it("should handle errors encountered for an invalid JSON file", async () => {
            const fetchConfig = (ImportHandler.prototype as any).fetchConfig;
            let config: any;
            let error: any;
            try {
                config = await fetchConfig(badConfigUrl);
            } catch (err) {
                error = err;
            }

            expect(config).toBeUndefined();
            expect(error).toBeDefined();
            expect(error.message).toContain("unable to parse config");
        });

        it("should handle errors encountered for an invalid URL", async () => {
            const fetchConfig = (ImportHandler.prototype as any).fetchConfig;
            let config: any;
            let error: any;
            try {
                config = await fetchConfig(badUrl);
            } catch (err) {
                error = err;
            }

            expect(config).toBeUndefined();
            expect(error).toBeDefined();
            expect(error.message).toContain("Rest API failure with HTTP(S)");
        });
    });

    describe("download schema", () => {
        async function cleanup() {
            try {
                fs.unlinkSync(localDownloadedSchemaPath);
            } catch (err) {
                // Do nothing
            }
        }

        afterEach(async () => {
            await cleanup();
        })
        
        it("should be able to copy the schema file from a local file", async () => {
            const downloadSchema = (ImportHandler.prototype as any).downloadSchema;
            await downloadSchema(localSchemaUrl, localDownloadedSchemaPath);
            await flushPromises();
            const originalSchema = fs.readFileSync(localSchema).toString();
            const copiedSchema = fs.readFileSync(localDownloadedSchemaPath).toString();
            expect(copiedSchema).toEqual(originalSchema);
        });

        it("should handle errors encountered for an invalid file output path", async () => {
            const downloadSchema = (ImportHandler.prototype as any).downloadSchema;
            const badLocalDownloadedSchemaPath = join(__dirname, "__fake__", "__path__", "zowe.schema.json");
            let error;

            try {
                await downloadSchema(localSchemaUrl, badLocalDownloadedSchemaPath);
                await flushPromises();
            } catch (err) {
                error = err;
            }

            expect(fs.existsSync(badLocalDownloadedSchemaPath)).toEqual(false);
            expect(error).toBeDefined();
            expect(error.message).toContain("ENOENT: no such file or directory, copyfile"); // TODO: Should this be more.... clear?
        });

        it("should handle errors encountered for an invalid input path", async () => {
            const downloadSchema = (ImportHandler.prototype as any).downloadSchema;
            const badLocalSchemaUrl = new URL("file://" + join(__dirname, "__fake__", "__path__", "zowe.schema.json"));
            let error;

            try {
                await downloadSchema(badLocalSchemaUrl, localDownloadedSchemaPath);
                await flushPromises();
            } catch (err) {
                error = err;
            }

            expect(fs.existsSync(localDownloadedSchemaPath)).toEqual(false);
            expect(error).toBeDefined();
            expect(error.message).toContain("ENOENT: no such file or directory, copyfile"); // TODO: Should this be more.... clear?
        });

        it("should be able to download the schema file from a web address", async () => {
            const downloadSchema = (ImportHandler.prototype as any).downloadSchema;
            await downloadSchema(schemaUrl, localDownloadedSchemaPath);
            await flushPromises();
            const originalSchema = fs.readFileSync(localSchema).toString();
            const copiedSchema = fs.readFileSync(localDownloadedSchemaPath).toString();
            expect(copiedSchema).toMatchSnapshot();
            expect(copiedSchema).toEqual(originalSchema);
        });

        it("should handle errors encountered for an invalid URL", async () => {
            const downloadSchema = (ImportHandler.prototype as any).downloadSchema;
            let error;
            try {
                await downloadSchema(badSchemaUrl, localDownloadedSchemaPath);
                await flushPromises();
            } catch (err) {
                error = err;
            }
            expect(error).toBeDefined();
            expect(error.message).toContain("Rest API failure with HTTP(S)");
            expect(fs.existsSync(localDownloadedSchemaPath)).toEqual(true); // TODO: Uh, if it fails, shouldn't it NOT create a file???
        });
    });
});