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
import { IConfig } from "../../../../../../../../packages/config";
import { expectedSchemaObject, expectedConfigObject, expectedUserConfigObject } from "../__resources__/expectedObjects";
import * as fs from "fs";
import * as path from "path";


// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config init", () => {
    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_init_command"
        });
    });
    afterEach(() => {
        runCliScript(__dirname + "/../__scripts__/delete_configs.sh", TEST_ENVIRONMENT.workingDir,
            ["-rf imperative-test-cli.config.user.json imperative-test-cli.config.json test imperative-test-cli.schema.json"]);
    })
    it("should display the help", () => {
        const response = runCliScript(__dirname + "/../__scripts__/get_help.sh",
            TEST_ENVIRONMENT.workingDir, ["init"]);
        expect(response.output.toString()).toContain(`Initialize config files. Defaults to initializing`);
        expect(response.output.toString()).toContain(`"imperative-test-cli.config.json" in the current working directory unless`);
        expect(response.output.toString()).toContain(`otherwise specified. Use "--user" to init`);
        expect(response.output.toString()).toContain(`"imperative-test-cli.config.user.json". Use "--global" to initialize the`);
        expect(response.output.toString()).toContain(`configuration files your home "~/.zowe" directory.`);
        expect(response.stderr.toString()).toEqual("");
        expect(response.error).not.toBeDefined();
    });
    it("should initialize a project config", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config.sh",
            TEST_ENVIRONMENT.workingDir, ["--ci"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);

    });
    it("should initialize a user project config", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config.sh",
            TEST_ENVIRONMENT.workingDir, ["--user --ci"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.user.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedUserConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    it("should initialize a global config", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config.sh",
            TEST_ENVIRONMENT.workingDir, ["--global --ci"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    it("should initialize a user global config", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config.sh",
            TEST_ENVIRONMENT.workingDir, ["--global --user --ci"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.user.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedUserConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    it("should initialize a project config with prompting", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config_prompt.sh",
            TEST_ENVIRONMENT.workingDir, [""]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    it("should initialize a user project config with prompting", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config_prompt.sh",
            TEST_ENVIRONMENT.workingDir, ["--user"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.config.user.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "test", "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedUserConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    it("should initialize a global config with prompting", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config_prompt.sh",
            TEST_ENVIRONMENT.workingDir, ["--global"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    it("should initialize a user global config with prompting", () => {
        const response = runCliScript(__dirname + "/__scripts__/init_config_prompt.sh",
            TEST_ENVIRONMENT.workingDir, ["--global --user"]);
        const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.user.json");
        const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.schema.json");
        expect(response.output.toString()).toContain(`Saved config template to`);
        expect(response.output.toString()).toContain(expectedConfigLocation);
        expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
        expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
        expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedUserConfigObject);
        expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    });
    // it("should create a profile of a specified name", () => {
    //     const response = runCliScript(__dirname + "/__scripts__/init_config.sh",
    //         TEST_ENVIRONMENT.workingDir, ["--profile lpar.service --ci"]);
    //     const expectedConfigLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json");
    //     const expectedSchemaLocation = path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.schema.json");
    //     const expectedConfigObject: IConfig = {
    //         $schema: "./imperative-test-cli.schema.json",
    //         profiles: {
    //             lpar: {
    //                 properties: {},
    //                 profiles: {
    //                     service: {
    //                         properties: {}
    //                     }
    //                 }
    //             }
    //         },
    //         defaults: {},
    //         plugins: [],
    //         secure: []
    //     };
    //     expect(response.output.toString()).toContain(`Saved config template to`);
    //     expect(response.output.toString()).toContain(expectedConfigLocation);
    //     expect(fs.existsSync(expectedConfigLocation)).toEqual(true);
    //     expect(fs.existsSync(expectedSchemaLocation)).toEqual(true);
    //     expect(JSON.parse(fs.readFileSync(expectedConfigLocation).toString())).toEqual(expectedConfigObject);
    //     expect(JSON.parse(fs.readFileSync(expectedSchemaLocation).toString())).toEqual(expectedSchemaObject);
    //     runCliScript(__dirname + "/../__scripts__/delete_configs.sh", TEST_ENVIRONMENT.workingDir,
    //         ["imperative-test-cli.config.json imperative-test-cli.schema.json"]);
    // });
});
