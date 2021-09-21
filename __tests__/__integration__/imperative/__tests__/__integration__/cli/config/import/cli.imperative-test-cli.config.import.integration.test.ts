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

import { ITestEnvironment } from "../../../../../../../__src__/environment/doc/response/ITestEnvironment";
import { SetupTestEnvironment } from "../../../../../../../__src__/environment/SetupTestEnvironment";
import { runCliScript } from "../../../../../../../src/TestUtil";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config import", () => {
    let server: http.Server;
    let localhostUrl: string;

    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_init_command"
        });

        server = http.createServer((request, response) => {
            return require("serve-handler")(request, response, {
                public: __dirname + "/__resources__"
            });
        });
        localhostUrl = await new Promise((resolve, reject) => {
            server.listen(0, () => {
                resolve(`http://localhost:${(server.address() as any).port}`);
            });
        });
    });
    afterAll(() => {
        server.close();
    });
    beforeEach(() => {
        runCliScript(__dirname + "/../__scripts__/create_directory.sh", TEST_ENVIRONMENT.workingDir, ["fakeHome"]);
        process.env.IMPERATIVE_TEST_CLI_CLI_HOME = path.join(TEST_ENVIRONMENT.workingDir, "fakeHome");
    });
    afterEach(() => {
        runCliScript(__dirname + "/../__scripts__/delete_configs.sh", TEST_ENVIRONMENT.workingDir, ["-rf test fakeHome *.json"]);
    });

    describe("success scenarios", () => {

        it("should display the help", () => {
            const response = runCliScript(__dirname + "/../__scripts__/get_help.sh", TEST_ENVIRONMENT.workingDir, ["import"]);
            const expectedLines = [
                "Import config files from another location on disk or from an Internet URL.",
                "File path or URL to import from.",
                "Target the global config files.",
                "Target the user config files.",
                "Overwrite config file if one already exists."
            ];
            expectedLines.forEach((line: string) => expect(response.output.toString()).toContain(line));
            expect(response.error).not.toBeDefined();
            expect(response.stderr.toString()).toEqual("");
        });

        it("should successfully import and overwrite a schema and config", () => {
            let response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                path.join(__dirname, "__resources__", "test.config.good.with.schema.json"), "--user-config false --global-config false"
            ]);

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);

            let config = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json")).toString();
            let schema = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json")).toString();
            expect(config).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.config.good.with.schema.json")).toString());
            expect(schema).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.schema.good.json")).toString());

            response = runCliScript(path.join(__dirname, "/__scripts__/import_config_no_mkdir.sh"), TEST_ENVIRONMENT.workingDir, [
                path.join(__dirname, "__resources__", "test.config.good.modified.with.schema.json"), "--user-config false --global-config false --ow"
            ]);

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);

            config = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json")).toString();
            schema = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.modified.json")).toString();
            expect(config).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.config.good.modified.with.schema.json")).toString());
            expect(schema).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.schema.good.modified.json")).toString());
        });

        describe("from the web", () => {

            it("should successfully import a config from a URL", () => {
                const response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                    localhostUrl + "/test.config.good.without.schema.json", "--user-config false --global-config false"
                ]);

                expect(response.stderr.toString()).toEqual("");
                expect(response.status).toEqual(0);

                const config = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json")).toString();
                expect(config).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.config.good.without.schema.json")).toString());
                expect(fs.existsSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json"))).toEqual(false);
            });

            it("should successfully import a config and schema from a URL", () => {
                const response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                    localhostUrl + "/test.config.good.with.schema.json", "--user-config false --global-config false"
                ]);

                expect(response.stderr.toString()).toEqual("");
                expect(response.status).toEqual(0);

                const config = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json")).toString();
                const schema = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json")).toString();
                expect(config).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.config.good.with.schema.json")).toString());
                expect(schema).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.schema.good.json")).toString());
            });
        });

        describe("from the disk", () => {

            it("should successfully import a config from a file", () => {
                const response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                    path.join(__dirname, "__resources__", "test.config.good.without.schema.json"), "--user-config false --global-config false"
                ]);

                expect(response.stderr.toString()).toEqual("");
                expect(response.status).toEqual(0);

                const config = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json")).toString();
                expect(config).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.config.good.without.schema.json")).toString());
                expect(fs.existsSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json"))).toEqual(false);
            });

            it("should successfully import a config and schema from a file", () => {
                const response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                    path.join(__dirname, "__resources__", "test.config.good.with.schema.json"), "--user-config false --global-config false"
                ]);

                expect(response.stderr.toString()).toEqual("");
                expect(response.status).toEqual(0);

                const config = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json")).toString();
                const schema = fs.readFileSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json")).toString();
                expect(config).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.config.good.with.schema.json")).toString());
                expect(schema).toEqual(fs.readFileSync(path.join(__dirname, "__resources__", "test.schema.good.json")).toString());
            });
        });
    });

    describe("failure scenarios", () => {

        describe("from the web", () => {

            it("should fail to import a config from a bad URL", () => {
                const response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                    localhostUrl + "/test.config.does.not.exist.json", "--user-config false --global-config false"
                ]);

                expect(response.stdout.toString()).toEqual("");
                expect(response.stderr.toString()).toContain("Rest API failure with HTTP(S) status");
                expect(response.status).toEqual(1);

                expect(fs.existsSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json"))).toEqual(false);
                expect(fs.existsSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json"))).toEqual(false);
            });

        });

        describe("from the disk", () => {
            it("should fail to import a config from a bad path", () => {
                const response = runCliScript(path.join(__dirname, "/__scripts__/import_config.sh"), TEST_ENVIRONMENT.workingDir, [
                    path.join(__dirname, "__resources__", "__fake__", "test.config.good.with.schema.json"),
                    "--user-config false --global-config false"
                ]);

                expect(response.stderr.toString()).toEqual("");
                expect(response.stdout.toString()).toEqual("");
                expect(response.status).toEqual(1);

                expect(fs.existsSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json"))).toEqual(false);
                expect(fs.existsSync(path.join(TEST_ENVIRONMENT.workingDir, "test", "test.schema.good.json"))).toEqual(false);
            });
        });
    });
    // it("should fail to import a schema from a bad URL", () => {

    // });

    // it("should fail to import a schema from a bad path", () => {

    // });
    // it("should fail to import a config that is invalid JSON from a URL", () => {
    //     const badConfigAddress = localhostUrl + "/test.config.bad.json";
    // });
    // it("should fail to import a config that is invalid JSON from a path", () => {

    // });
    // it("should fail to import a schema if it is defined with an absolute path", () => {

    // });
    // it("should fail to import a schema if it is defined with a URL", () => {

    // });
    // it("should fail to import a schema and config if they already exist", () => {

    // });
});