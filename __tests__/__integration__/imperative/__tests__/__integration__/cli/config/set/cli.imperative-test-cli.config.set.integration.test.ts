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
import { expectedConfigObject } from "../__resources__/expectedObjects";
import * as fs from "fs";
import * as path from "path";
import * as keytar from "keytar";
import * as lodash from "lodash";


// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config set", () => {
    const service = "imperative-test-cli";
    let expectedProjectConfigLocation: string;
    let expectedUserConfigLocation: string;
    let expectedGlobalProjectConfigLocation: string;
    let expectedGlobalUserConfigLocation: string;

    const expectedJson = lodash.cloneDeep(expectedConfigObject);
    delete expectedJson.$schema;
    expectedJson.profiles.my_profiles.profiles.secured.properties.info = "some_fake_information";
    expectedJson.profiles.my_profiles.profiles.secured.properties.secret = "fakeValue";
    expectedJson.secure = [];

    const expectedUserJson = lodash.cloneDeep(expectedJson);
    delete expectedUserJson.profiles.my_profiles.profiles.secured.properties.secret;
    expectedUserJson.defaults = {};

    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_set_command"
        });
        expectedGlobalUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.user.json");
        expectedGlobalProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
        expectedUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.user.json");
        expectedProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json");
        expectedJson.profiles.my_profiles.profiles.secured.properties.info = "some_fake_information";
        expectedUserJson.profiles.my_profiles.profiles.secured.properties.info = "some_fake_information";
        await keytar.setPassword("imperative-test-cli", "secure_config_props", Buffer.from("{}").toString("base64"));
    });
    afterEach(() => {
        runCliScript(__dirname + "/../__scripts__/delete_configs.sh", TEST_ENVIRONMENT.workingDir,
            ["-rf imperative-test-cli.config.user.json imperative-test-cli.config.json test imperative-test-cli.schema.json"]);
    });
    it("should display the help", () => {
        const response = runCliScript(__dirname + "/../__scripts__/get_help.sh",
            TEST_ENVIRONMENT.workingDir, ["set"]);
        expect(response.output.toString()).toContain(`create or update a configuration property`);
    });
    it("should store a property in plain text", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user"]);
        const response = runCliScript(__dirname + "/__scripts__/set.sh", TEST_ENVIRONMENT.workingDir,
            ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--user"]);
        const fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
        const securedValue = await keytar.getPassword(service, "secure_config_props");

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        // Should contain human readable credentials
        expect(fileContents.secure.length).toBe(0);
        expect(fileContents.profiles.my_profiles.profiles.secured.properties).toEqual({info: "some_fake_information"});
        expect(securedValue).toEqual(Buffer.from("{}").toString("base64"));
    });
    it("should prompt for and store a property in plain text", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user"]);
        const response = runCliScript(__dirname + "/__scripts__/set_prompt.sh", TEST_ENVIRONMENT.workingDir,
            ["profiles.my_secured.properties.info", "--user"]);
        const fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
        const securedValue = await keytar.getPassword(service, "secure_config_props");

        expect(response.stderr.toString()).toEqual("");
        expect(response.stdout.toString()).toContain("profiles.my_secured.properties.info");
        expect(response.status).toEqual(0);
        // Should contain human readable credentials
        expect(fileContents.secure.length).toBe(0);
        expect(fileContents.profiles.my_secured.properties).toEqual({info: "some_fake_information_prompted"});
        expect(securedValue).toEqual(Buffer.from("{}").toString("base64"));
    });
    describe("secure", () => {
        afterEach(async () => {
            await keytar.deletePassword(service, "secure_config_props");
        });
        it("should make the info property secure in the project config", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, [""]);
            const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", ""]);
            const fileContents = JSON.parse(fs.readFileSync(expectedProjectConfigLocation).toString());
            const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
            const configJson = JSON.parse(config);
            const securedValue = await keytar.getPassword(service, "secure_config_props");
            const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedProjectConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.secret": "fakeValue",
                "profiles.my_profiles.profiles.secured.properties.info": "some_fake_information"
            };

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(configJson.data).toEqual(expectedJson);
            // Should not contain human readable credentials
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.secret",
                                                 "profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: "some_fake_information"});
            // Check the securely stored JSON
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
        it("should make the info property secure in the user config", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--user"]);
            const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--user"]);
            const fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
            const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
            const configJson = JSON.parse(config);
            const securedValue = await keytar.getPassword(service, "secure_config_props");
            const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedUserConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.info": "some_fake_information"
            };

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(configJson.data).toEqual(expectedUserJson);
            // Should not contain human readable credentials
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: "some_fake_information"});
            // Check the securely stored JSON
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
        it("should make the info property secure in the global project config", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global"]);
            const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--global"]);
            const fileContents = JSON.parse(fs.readFileSync(expectedGlobalProjectConfigLocation).toString());
            const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
            const configJson = JSON.parse(config);
            const securedValue = await keytar.getPassword(service, "secure_config_props");
            const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedGlobalProjectConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.secret": "fakeValue",
                "profiles.my_profiles.profiles.secured.properties.info": "some_fake_information"
            };

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(configJson.data).toEqual(expectedJson);
            // Should not contain human readable credentials
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.secret",
                                                 "profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: "some_fake_information"});
            // Check the securely stored JSON
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
        it("should make the info property secure in the global user config", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global --user"]);
            const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--global --user"]);
            const fileContents = JSON.parse(fs.readFileSync(expectedGlobalUserConfigLocation).toString());
            const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
            const configJson = JSON.parse(config);
            const securedValue = await keytar.getPassword(service, "secure_config_props");
            const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedGlobalUserConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.info": "some_fake_information"
            };

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(configJson.data).toEqual(expectedUserJson);
            // Should not contain human readable credentials
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: "some_fake_information"});
            // Check the securely stored JSON
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
        it("should supply secured JSON to the info property in the global user config", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global --user"]);
            const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", '{"data":"fake"}', "--global --user --json"]);
            const fileContents = JSON.parse(fs.readFileSync(expectedGlobalUserConfigLocation).toString());
            const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
            const configJson = JSON.parse(config);
            expectedUserJson.profiles.my_profiles.profiles.secured.properties.info = {data: "fake"};
            const securedValue = await keytar.getPassword(service, "secure_config_props");
            const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedGlobalUserConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.info": {data: "fake"}
            };

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(configJson.data).toEqual(expectedUserJson);
            // Should not contain human readable credentials
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: {data: "fake"}});
            // Check the securely stored JSON
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
        it("should fail to parse improperly formatted JSON objects", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global --user"]);
            const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "{'data':'fake'}", "--global --user --json"]);

            expect(response.stderr.toString()).toContain("could not parse JSON value: ");
            expect(response.status).not.toEqual(0);
        });
        it("should store property securely without --secure flag if found in secure array", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, [""]);
            const response = runCliScript(__dirname + "/__scripts__/set.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.secret", "area51", ""]);
            const fileContents = JSON.parse(fs.readFileSync(expectedProjectConfigLocation).toString());
            const securedValue = await keytar.getPassword(service, "secure_config_props");
            const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedProjectConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.secret": "area51"
            };

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            // Should not contain human readable credentials
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.secret"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).toEqual({"info": ""});
            // Check the securely stored JSON
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
        it("should toggle the security of a property if requested", async () => {
            runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user"]);
            const expectedSecuredValueJson = {};
            expectedSecuredValueJson[expectedUserConfigLocation] = {
                "profiles.my_profiles.profiles.secured.properties.info": "some_fake_information"
            };

            // First store property securely
            let response = runCliScript(__dirname + "/__scripts__/set.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--user --secure"]);
            let fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
            let securedValue = await keytar.getPassword(service, "secure_config_props");
            let securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: "some_fake_information"});
            expect(securedValueJson).toEqual(expectedSecuredValueJson);

            // Now store property in plain text
            response = runCliScript(__dirname + "/__scripts__/set.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--user --secure false"]);
            fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
            securedValue = await keytar.getPassword(service, "secure_config_props");
            securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(fileContents.secure.length).toBe(0);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).toEqual({info: "some_fake_information"});
            expect(securedValueJson).toEqual({});

            // Finally store property securely again
            response = runCliScript(__dirname + "/__scripts__/set.sh", TEST_ENVIRONMENT.workingDir,
                ["profiles.my_profiles.profiles.secured.properties.info", "some_fake_information", "--user --secure"]);
            fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
            securedValue = await keytar.getPassword(service, "secure_config_props");
            securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());

            expect(response.stderr.toString()).toEqual("");
            expect(response.status).toEqual(0);
            expect(fileContents.secure).toEqual(["profiles.my_profiles.profiles.secured.properties.info"]);
            expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({info: "some_fake_information"});
            expect(securedValueJson).toEqual(expectedSecuredValueJson);
        });
    });
});
