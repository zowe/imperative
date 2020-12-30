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
import * as os from "os";
import * as keytar from "keytar";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;
describe("imperative-test-cli auth login", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_auth_login"
        });
    });

    describe("single profile", () => {

        beforeAll(() => { fs.mkdirSync(TEST_ENVIRONMENT.workingDir + "/testDir"); });

        afterEach(async () => {
            runCliScript(__dirname + "/__scripts__/delete.sh", TEST_ENVIRONMENT.workingDir + "/testDir",
                         ["imperative-test-cli.config.json imperative-test-cli.config.user.json imperative-test-cli.schema.json"]);
            // runCliScript(__dirname + "/__scripts__/delete.sh", join(os.homedir(), ".imperative-test-cli"),
            runCliScript(__dirname + "/__scripts__/delete.sh", TEST_ENVIRONMENT.workingDir,
                         ["imperative-test-cli.config.json imperative-test-cli.config.user.json imperative-test-cli.schema.json"]);
            await keytar.deletePassword("imperative-test-cli", "secure_config_props");
        });

        it("should load values from base profile and store token in it 1", () => {
            const response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_local.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);

            // the output of the command should include token value
            expect(response.stdout.toString()).toContain("user:     fakeUser");
            expect(response.stdout.toString()).toContain("password: fakePass");
            expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
        });

        it("should load values from base profile and store token in it 2", () => {
            const response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_global.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);

            // the output of the command should include token value
            expect(response.stdout.toString()).toContain("user:     fakeUser");
            expect(response.stdout.toString()).toContain("password: fakePass");
            expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
        });

        it("should load values from base profile and store token in it 3", () => {
            const response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_local_user.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);

            // the output of the command should include token value
            expect(response.stdout.toString()).toContain("user:     fakeUser");
            expect(response.stdout.toString()).toContain("password: fakePass");
            expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
        });

        it("should load values from base profile and store token in it 4", () => {
            const response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_config_global_user.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);

            // the output of the command should include token value
            expect(response.stdout.toString()).toContain("user:     fakeUser");
            expect(response.stdout.toString()).toContain("password: fakePass");
            expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
        });

        it("should load values from base profile and show token only", () => {
            let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_token_config.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);

            // the output of the command should include token value
            expect(response.stdout.toString()).toContain("fakeUser:fakePass@fakeToken");

            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_config.sh", TEST_ENVIRONMENT.workingDir + "/testDir");

            // the output of the command should not include token value
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).not.toContain("tokenType:");
            expect(response.stdout.toString()).not.toContain("tokenValue:");
            expect(response.stdout.toString()).not.toContain("authToken:");
        });

        it("should load values from base profile and show token in rfj", () => {
            let response = runCliScript(__dirname + "/__scripts__/base_config_create.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);

            // the output of the command should include token value
            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_token_rfj_config.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir");
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(JSON.parse(response.stdout.toString()).data).toMatchObject({tokenType: "jwtToken", tokenValue: "fakeUser:fakePass@fakeToken"});

            // the output of the command should not include token value
            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_config.sh", TEST_ENVIRONMENT.workingDir + "/testDir");
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).not.toContain("tokenType:");
            expect(response.stdout.toString()).not.toContain("tokenValue:");
            expect(response.stdout.toString()).not.toContain("authToken:");
        });

        it("should create a profile, if requested 1", () => {
            let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_config.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["y", "fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).toContain("Login successful.");
            expect(response.stdout.toString()).toContain("The authentication token is stored in the 'my_base' base profile");

            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_config.sh", TEST_ENVIRONMENT.workingDir + "/testDir");

            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).toContain("host:      fakeHost");
            expect(response.stdout.toString()).toContain("port:      3000");
            expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
            expect(response.stdout.toString()).not.toContain("user:");
            expect(response.stdout.toString()).not.toContain("password:");
        });

        it("should create a profile, if requested 2", () => {
            let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_config.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["yes", "fakeUser", "fakePass"]);
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).toContain("Login successful.");
            expect(response.stdout.toString()).toContain("The authentication token is stored in the 'my_base' base profile");

            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_config.sh", TEST_ENVIRONMENT.workingDir + "/testDir");

            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).toContain("host:      fakeHost");
            expect(response.stdout.toString()).toContain("port:      3000");
            expect(response.stdout.toString()).toContain("authToken: jwtToken=fakeUser:fakePass@fakeToken");
            expect(response.stdout.toString()).not.toContain("user:");
            expect(response.stdout.toString()).not.toContain("password:");
        });

        it("should not create a profile, if requested", () => {
            let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_config.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["n", "fakeUser", "fakePass"]);
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).toContain("Login successful.");
            expect(response.stdout.toString()).toContain("will not be stored in your profile");
            expect(response.stdout.toString()).toContain("fakeUser:fakePass@fakeToken");

            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_config.sh", TEST_ENVIRONMENT.workingDir + "/testDir");

            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).not.toContain("user:");
            expect(response.stdout.toString()).not.toContain("password:");
            expect(response.stdout.toString()).not.toContain("host:");
            expect(response.stdout.toString()).not.toContain("port:");
            expect(response.stdout.toString()).not.toContain("tokenType:");
            expect(response.stdout.toString()).not.toContain("tokenValue:");
            expect(response.stdout.toString()).not.toContain("authToken:");
        });

        it("should not create a profile, if it times out", () => {
            let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_config_timeout.sh",
                TEST_ENVIRONMENT.workingDir + "/testDir", ["fakeUser", "fakePass"]);
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).toContain("Login successful.");
            expect(response.stdout.toString()).toContain("will not be stored in your profile");
            expect(response.stdout.toString()).toContain("fakeUser:fakePass@fakeToken");

            response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_config.sh", TEST_ENVIRONMENT.workingDir + "/testDir");

            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(response.stdout.toString()).not.toContain("user:");
            expect(response.stdout.toString()).not.toContain("password:");
            expect(response.stdout.toString()).not.toContain("host:");
            expect(response.stdout.toString()).not.toContain("port:");
            expect(response.stdout.toString()).not.toContain("tokenType:");
            expect(response.stdout.toString()).not.toContain("tokenValue:");
            expect(response.stdout.toString()).not.toContain("authToken:");
        });
    });
});
