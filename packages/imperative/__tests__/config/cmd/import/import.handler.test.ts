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
import * as fs from "fs";

const flushPromises = () => new Promise(setImmediate);

const localSchemaDir: string = join(__dirname, "__resources__");
const localSchema: string = join(localSchemaDir, "zowe.schema.json");
const localDownloadedSchemaPath = join(localSchemaDir, "__data__", "downloaded.schema.json");
const localSchemaUrl: URL = new URL("file://" + localSchema);

const configUrl: URL = new URL(
    "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/79dafd7c98e53f10eb668a29ddeb08ae5412d609/zowe.config.json"
);
const schemaUrl: URL = new URL(
    "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/79dafd7c98e53f10eb668a29ddeb08ae5412d609/zowe.schema.json"
);
const badConfigUrl: URL = new URL(
    "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/79dafd7c98e53f10eb668a29ddeb08ae5412d609/zowe.config.json.bad"
);
const badSchemaUrl: URL = new URL(
    "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/34cf180414061107ddb8b7f5a4e693b8fd7c2853/zowe.schema.json.bad"
);
const badUrl: URL = new URL(
    "https://gist.githubusercontent.com/awharn/629aa52801a9a5f8b7f725b33572acf8/raw/34cf180414061107ddb8b7f5a4e693b8fd7c2854/zowe.config.json.bad"
);

describe("Configuration import command handler", () => {

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
        afterEach(() => {
            try {
                fs.unlinkSync(localDownloadedSchemaPath);
            } finally {
                // do nothing
            }
        });
        it("should be able to copy the schema file from a local file", async () => {
            const downloadSchema = (ImportHandler.prototype as any).downloadSchema;
            await downloadSchema(localSchemaUrl, localDownloadedSchemaPath);
            await flushPromises();
            const originalSchema = fs.readFileSync(localSchema).toString();
            const copiedSchema = fs.readFileSync(localDownloadedSchemaPath).toString();
            expect(copiedSchema).toEqual(originalSchema);
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
            await downloadSchema(badSchemaUrl, localDownloadedSchemaPath);
            await flushPromises();
            const originalSchema = fs.readFileSync(localSchema).toString();
            const copiedSchema = fs.readFileSync(localDownloadedSchemaPath).toString();
            expect(copiedSchema).not.toEqual(originalSchema);
        });

        it.skip("should handle errors encountered for an invalid file path", async () => {
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

        it.skip("should handle errors encountered for an invalid output path", async () => {
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
});