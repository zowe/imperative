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

import { runCliScript } from "../../../../../../src/TestUtil";
import { ITestEnvironment } from "../../../../../../__src__/environment/doc/response/ITestEnvironment";
import { SetupTestEnvironment } from "../../../../../../__src__/environment/SetupTestEnvironment";
import { join } from "path";
import * as fs from "fs";
import * as keytar from "keytar";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;
describe("cmd-cli auth logout", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_auth_login"
        });
        fs.mkdirSync(TEST_ENVIRONMENT.workingDir + "/testDir");
    });

    afterEach(async () => {
        runCliScript(__dirname + "/__scripts__/delete.sh", TEST_ENVIRONMENT.workingDir + "/testDir",
                     ["imperative-test-cli.config.json imperative-test-cli.config.user.json imperative-test-cli.schema.json"]);
        // runCliScript(__dirname + "/__scripts__/delete.sh", join(os.homedir(), ".imperative-test-cli"),
        runCliScript(__dirname + "/__scripts__/delete.sh", TEST_ENVIRONMENT.workingDir,
                     ["imperative-test-cli.config.json imperative-test-cli.config.user.json imperative-test-cli.schema.json"]);
        await keytar.deletePassword("imperative-test-cli", "secure_config_props");
    });

    it("should have auth logout command that loads values from base profile and removes the token 1", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_local.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_logout_config.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir");
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).not.toContain("tokenType:");
        expect(response.stdout.toString()).not.toContain("tokenValue:");
    });

    it("should have auth logout command that loads values from base profile and removes the token 2", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_global.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_logout_config.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir");
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).not.toContain("tokenType:");
        expect(response.stdout.toString()).not.toContain("tokenValue:");
    });

    it("should have auth logout command that loads values from base profile and removes the token 3", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_local_user.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_logout_config.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir");
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).not.toContain("tokenType:");
        expect(response.stdout.toString()).not.toContain("tokenValue:");
    });

    it("should have auth logout command that loads values from base profile and removes the token 4", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_global_user.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_logout_config.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir");
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).not.toContain("tokenType:");
        expect(response.stdout.toString()).not.toContain("tokenValue:");
    });

    it("should have auth logout command that invalidates another token", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_local.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_logout_specify_token_config.sh",
            TEST_ENVIRONMENT.workingDir + "/testDir", ["jwtToken=fakeToken:fakeToken@fakeToken"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
    });
});
