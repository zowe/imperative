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
import { fstat, runCliScript } from "../../../../../../../src/TestUtil";
import * as fs from "fs";
import * as path from "path";
import * as keytar from "keytar";
import { Config } from "../../../../../../../../packages/config";


// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config set-secure", () => {
    let expectedProjectConfigLocation: string;
    let expectedUserConfigLocation: string;
    let expectedGlobalProjectConfigLocation: string;
    let expectedGlobalUserConfigLocation: string;
    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_set-secure_command"
        });
        // runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--ci"]);
        // runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user --ci"]);
        // runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--global --ci"]);
        // runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user --global --ci"]);
        expectedGlobalUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.user.json");
        expectedGlobalProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
        expectedUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.user.json");
        expectedProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json");
    });
    afterEach(() => {
        runCliScript(__dirname + "/../__scripts__/delete_configs.sh", TEST_ENVIRONMENT.workingDir,
            ["-rf imperative-test-cli.config.user.json imperative-test-cli.config.json test schema.json"]);
    });
    it("should display the help", () => {
        const response = runCliScript(__dirname + "/../__scripts__/get_help.sh",
            TEST_ENVIRONMENT.workingDir, ["set-secure"]);
        expect(response.output.toString()).toContain(`create or update secure configuration property`);
    });
    it("should make the info property secure in the project config", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, [""]);
        const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
            ["profiles.my_secured.properties.info", "some_fake_information", ""]);
        const fileContents = JSON.parse(fs.readFileSync(expectedProjectConfigLocation).toString());
        const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
        const configJson = JSON.parse(config);
        const expectedJson = {
            defaults: {
                secured: "my_secured"
            },
            profiles: {
                my_secured: {
                    type: "secured",
                    properties: {
                        info: "some_fake_information",
                        secret: "fakeValue"
                    }
                }
            },
            plugins: [],
            secure: []
        };
        const securedValue = await keytar.getPassword("Zowe", "secure_config_props");
        const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        expect(configJson.data).toEqual(expectedJson);
        // Should not contain human readable credentials
        expect(fileContents.secure).toEqual(["profiles.my_secured.properties.secret", "profiles.my_secured.properties.info"]);
        expect(fileContents.profiles.my_secured.properties).not.toEqual({info: "some_fake_information"});
        // Check the securely stored JSON

    });
    it("should make the info property secure in the user config", async () => {
        runCliScript(__dirname + "/../init/__scripts__/init_config_prompt.sh", TEST_ENVIRONMENT.workingDir, ["--user"]);
        const response = runCliScript(__dirname + "/__scripts__/set_secure.sh", TEST_ENVIRONMENT.workingDir,
            ["profiles.my_secured.properties.info", "some_fake_information", "--user"]);
        const fileContents = JSON.parse(fs.readFileSync(expectedUserConfigLocation).toString());
        const config = runCliScript(__dirname + "/../list/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]).stdout.toString();
        const configJson = JSON.parse(config);
        const expectedJson = {
            defaults: {
                secured: "my_secured"
            },
            profiles: {
                my_secured: {
                    type: "secured",
                    properties: {
                        info: "some_fake_information",
                        secret: "fakeValue"
                    }
                }
            },
            plugins: [],
            secure: []
        };
        const securedValue = await keytar.getPassword("Zowe", "secure_config_props");
        const securedValueJson = JSON.parse(Buffer.from(securedValue, "base64").toString());

        expect(response.stderr.toString()).toEqual("");
        expect(response.status).toEqual(0);
        expect(configJson.data).toEqual(expectedJson);
        // Should not contain human readable credentials
        expect(fileContents.secure).toEqual(["profiles.my_secured.properties.secret", "profiles.my_secured.properties.info"]);
        expect(fileContents.profiles.my_secured.properties).not.toEqual({info: "some_fake_information"});

    });
});
