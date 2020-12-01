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
import * as path from "path";


// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config list", () => {
    let expectedProjectConfigLocation: string;
    let expectedUserConfigLocation: string;
    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_list_command"
        });
        runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--ci"]);
        runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user --ci"]);
        runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--global --ci"]);
        runCliScript(__dirname + "/../init/__scripts__/init_config.sh", TEST_ENVIRONMENT.workingDir, ["--user --global --ci"]);
        expectedUserConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.user.json");
        expectedProjectConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
    });
    it("should display the help", () => {
        const response = runCliScript(__dirname + "/../__scripts__/get_help.sh",
            TEST_ENVIRONMENT.workingDir, ["list"]);
        expect(response.stdout.toString()).toContain(`List config properties`);
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should list the configuration", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, [""]);
        expect(response.stdout.toString()).toMatchSnapshot();
        expect(response.stdout.toString()).toContain("secured: my_secured");
        expect(response.stdout.toString()).toContain("type:       secured");
        expect(response.stdout.toString()).toContain("defaults:");
        expect(response.stdout.toString()).toContain("profiles:");
        expect(response.stdout.toString()).toContain("plugins:");
        expect(response.stdout.toString()).toContain("secure:");
        expect(response.stdout.toString()).toContain("(empty array)");
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should list the configuration in RFJ", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--rfj"]);
        const parsedResponse = JSON.parse(response.stdout.toString());
        const expectedResponse = {
            data: {
                defaults: {
                    secured: "my_secured"
                },
                profiles: {
                    my_secured: {
                        type: "secured",
                        properties: {
                            info: "",
                        }
                    }
                },
                plugins: [],
                secure: []
            }
        };
        expect(parsedResponse.success).toEqual(true);
        expect(parsedResponse.stderr).toEqual("");
        expect(parsedResponse.exitCode).toEqual(0);
        expect(parsedResponse.data).toEqual(expectedResponse.data);
    });
    it("should list the configurations based on location", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--locations"]);
        expect(response.stdout.toString()).toContain(expectedProjectConfigLocation);
        expect(response.stdout.toString()).toContain(expectedUserConfigLocation);
        expect(response.stdout.toString()).toContain("defaults:");
        expect(response.stdout.toString()).toContain("profiles:");
        expect(response.stdout.toString()).toContain("plugins:");
        expect(response.stdout.toString()).toContain("secure:");
        expect(response.stdout.toString()).toContain("my_secured:");
        expect(response.stdout.toString()).toContain("type:       secured");
        expect(response.stdout.toString()).toContain("properties:");
        expect(response.stdout.toString()).toContain("secured: my_secured");
        expect(response.stdout.toString()).toContain("$schema:  ./schema.json");
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should list the configurations based on location in RFJ", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--locations --rfj"]);
        const parsedResponse = JSON.parse(response.stdout.toString());
        const expectedUserConfig = {
            $schema: "./schema.json",
            profiles: {},
            defaults: {},
            plugins: [],
            secure: []
        };
        const expectedProjectConfig = {
            $schema: "./schema.json",
            profiles: {
                my_secured: {
                    type: "secured",
                    properties: {
                        info: ""
                    }
                }
            },
            defaults: {
                secured: "my_secured"
            },
            plugins: [],
            secure: ["profiles.my_secured.properties.secret"]
        }
        const expectedResponse = {
            data: {}
        };
        expectedResponse.data[expectedUserConfigLocation] = expectedUserConfig;
        expectedResponse.data[expectedProjectConfigLocation] = expectedProjectConfig;
        expect(parsedResponse.success).toEqual(true);
        expect(parsedResponse.stderr).toEqual("");
        expect(parsedResponse.exitCode).toEqual(0);
        expect(parsedResponse.data).toEqual(expectedResponse.data);
    });
    it("should list the root level property names only", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--root"]);
        expect(response.stdout.toString()).toMatchSnapshot();
        expect(response.stdout.toString()).toContain("defaults");
        expect(response.stdout.toString()).toContain("profiles");
        expect(response.stdout.toString()).toContain("plugins");
        expect(response.stdout.toString()).toContain("secure");
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should get a list of config file paths", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["--locations --root"]);
        expect(response.stdout.toString()).toContain(expectedProjectConfigLocation);
        expect(response.stdout.toString()).toContain(expectedUserConfigLocation);
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should list the profiles configuration property", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["profiles"]);
        expect(response.stdout.toString()).toMatchSnapshot();
        expect(response.stdout.toString()).toContain("my_secured:");
        expect(response.stdout.toString()).toContain("type:       secured");
        expect(response.stdout.toString()).toContain("properties:");
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should list the defaults configuration property", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["defaults"]);
        expect(response.stdout.toString()).toMatchSnapshot();
        expect(response.stdout.toString()).toContain("secured: my_secured");
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should not list the secure configuration property", () => {
        const response = runCliScript(__dirname + "/__scripts__/list_config.sh", TEST_ENVIRONMENT.workingDir, ["secure"]);
        expect(response.stdout.toString()).toMatchSnapshot();
        expect(response.stdout.toString()).not.toContain("profiles.my_secured.properties.secret");
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
});
