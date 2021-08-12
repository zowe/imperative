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
import { expectedConfigObject, expectedUserConfigObject } from "../__resources__/expectedObjects";
import * as fs from "fs";
import * as keytar from "keytar";
import * as path from "path";
import * as lodash from "lodash";


// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config secure", () => {
    const service = "imperative-test-cli";
    let expectedProjectConfigLocation: string;
    let expectedUserConfigLocation: string;
    let expectedGlobalProjectConfigLocation: string;
    let expectedGlobalUserConfigLocation: string;

    const expectedJson = lodash.cloneDeep(expectedConfigObject);
    delete expectedJson.$schema;
    expectedJson.profiles.my_profiles.profiles.secured.properties.secret = "(secure value)";
    expectedJson.profiles.my_profiles.profiles.secured.secure = ["secret"];

    const expectedUserJson = expectedUserConfigObject;
    delete expectedUserJson.$schema;

    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_secure_command"
        });
        expectedGlobalUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.user.json");
        expectedGlobalProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
        expectedUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.user.json");
        expectedProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json");
    });

    afterEach(async () => {
        runCliScript(__dirname + "/../__scripts__/delete_configs.sh", TEST_ENVIRONMENT.workingDir,
            ["-rf imperative-test-cli.config.user.json imperative-test-cli.config.json test schema.json"]);
        await keytar.deletePassword(service, "secure_config_props");
    });

    afterAll(() => {
        jest.restoreAllMocks();
    })

    it("should display the help", () => {
        const response = runCliScript(__dirname + "/../__scripts__/get_help.sh",
            TEST_ENVIRONMENT.workingDir, ["secure"]);
        expect(response.output.toString()).toContain(`prompt for secure configuration properties`);
    });

    it("should secure the project config", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, [""]);
        const response = runCliScript(__dirname + "/__scripts__/secure_prompt.sh", TEST_ENVIRONMENT.workingDir, [""]);
        const fileContents = JSON.parse(fs.readFileSync(expectedProjectConfigLocation).toString());
        const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
        const configJson = JSON.parse(config);
        const securedValue = await keytar.getPassword(service, "secure_config_props");
        const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
        const expectedSecuredValueJson = {};
        expectedSecuredValueJson[expectedProjectConfigLocation] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "anotherFakeValue"
        };

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        expect(configJson.data).toEqual(expectedJson);
        // Should not contain human readable credentials
        expect(fileContents.profiles.my_profiles.profiles.secured.secure).toEqual(["secret"]);
        expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({secret: "anotherFakeValue"});
        // Check the securely stored JSON
        expect(securedValueJson).toEqual(expectedSecuredValueJson);
    });

    it("should secure the user config", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--user-config"]);
        const response = runCliScript(__dirname + "/__scripts__/secure_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--user-config"]);
        const fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
        const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
        const configJson = JSON.parse(config);
        const securedValue = await keytar.getPassword(service, "secure_config_props");
        const securedValueJson = (securedValue == null ? null : JSON.parse(Buffer.from(securedValue, "base64").toString()));
        const expectedSecuredValueJson = null;

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        expect(configJson.data).toEqual(expectedUserJson);
        // Should not contain human readable credentials
        expect(fileContents.profiles.my_profiles.profiles.secured.secure).not.toEqual(["secret"]);
        expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({secret: "anotherFakeValue"});
        // Check the securely stored JSON
        expect(securedValueJson).toEqual(expectedSecuredValueJson);
    });

    it("should secure the global project config", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global-config"]);
        const response = runCliScript(__dirname + "/__scripts__/secure_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global-config"]);
        const fileContents = JSON.parse(fs.readFileSync(expectedGlobalProjectConfigLocation).toString());
        const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
        const configJson = JSON.parse(config);
        const securedValue = await keytar.getPassword(service, "secure_config_props");
        const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());
        const expectedSecuredValueJson = {};
        expectedSecuredValueJson[expectedGlobalProjectConfigLocation] = {
            "profiles.my_profiles.profiles.secured.properties.secret": "anotherFakeValue"
        };

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        expect(configJson.data).toEqual(expectedJson);
        // Should not contain human readable credentials
        expect(fileContents.profiles.my_profiles.profiles.secured.secure).toEqual(["secret"]);
        expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({secret: "anotherFakeValue"});
        // Check the securely stored JSON
        expect(securedValueJson).toEqual(expectedSecuredValueJson);
    });

    it("should secure the global user config", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global-config --user-config"]);
        const response = runCliScript(__dirname + "/__scripts__/secure_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--global-config --user-config"]);
        const fileContents = JSON.parse(fs.readFileSync(expectedGlobalUserConfigLocation).toString());
        const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
        const configJson = JSON.parse(config);
        const securedValue = await keytar.getPassword(service, "secure_config_props");
        const securedValueJson = (securedValue == null ? null : JSON.parse(Buffer.from(securedValue, "base64").toString()));
        const expectedSecuredValueJson = null;

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        expect(configJson.data).toEqual(expectedUserJson);
        // Should not contain human readable credentials
        expect(fileContents.profiles.my_profiles.profiles.secured.secure).not.toEqual(["secret"]);
        expect(fileContents.profiles.my_profiles.profiles.secured.properties).not.toEqual({secret: "anotherFakeValue"});
        // Check the securely stored JSON
        expect(securedValueJson).toEqual(expectedSecuredValueJson);
    });
});
