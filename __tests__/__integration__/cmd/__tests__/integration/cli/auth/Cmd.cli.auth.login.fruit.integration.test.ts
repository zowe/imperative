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

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;
describe("cmd-cli auth login", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_CLI_HOME",
            testName: "cmd_auth_login"
        });
    });

    afterEach(() => {
        // delete profiles between tests so that they can be recreated
        require("rimraf").sync(join(TEST_ENVIRONMENT.workingDir, "profiles"));
    });

    it("should load values from base profile and store token in it", () => {
        const response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login.sh",
            TEST_ENVIRONMENT.workingDir, ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("user:       fakeUser");
        expect(response.stdout.toString()).toContain("password:   fakePass");
        expect(response.stdout.toString()).toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).toContain("tokenValue: fakeUser:fakePass@fakeToken");
    });

    it("should load values from base profile and show token only", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_token.sh",
            TEST_ENVIRONMENT.workingDir, ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("fakeUser:fakePass@fakeToken");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_profiles.sh", TEST_ENVIRONMENT.workingDir);

        // the output of the command should not include token value
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).not.toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).not.toContain("tokenValue: fakeUser:fakePass@fakeToken");
    });

    it("should load values from base profile and show token in rfj", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_token_rfj_create.sh",
            TEST_ENVIRONMENT.workingDir, ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_token_rfj.sh",
            TEST_ENVIRONMENT.workingDir);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(JSON.parse(response.stdout.toString()).data).toMatchObject({tokenType: "jwtToken", tokenValue: "fakeUser:fakePass@fakeToken"});

        // the output of the command should not include token value
        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_profiles.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).not.toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).not.toContain("tokenValue: fakeUser:fakePass@fakeToken");
    });

    it("should create a profile, if requested", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_profile.sh",
            TEST_ENVIRONMENT.workingDir, ["y", "fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).toContain("Profile created successfully.");
        expect(response.stdout.toString()).toContain("Login successful.");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_profiles.sh", TEST_ENVIRONMENT.workingDir);

        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).toContain("host:       fakeHost");
        expect(response.stdout.toString()).toContain("port:       3000");
        expect(response.stdout.toString()).toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).toContain("tokenValue: fakeUser:fakePass@fakeToken");
        expect(response.stdout.toString()).not.toContain("user:       fakeUser");
        expect(response.stdout.toString()).not.toContain("password:   fakePass");
    });

    it("should not create a profile, if requested", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_profile.sh",
            TEST_ENVIRONMENT.workingDir, ["n", "fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toContain("A login command was issued, but no base profiles exist," +
            " the show token flag was not specified, or we were not given permission to create a profile.");
        expect(response.status).toBe(1);
        expect(response.stdout.toString()).not.toContain("Profile created successfully.");
        expect(response.stdout.toString()).not.toContain("Login successful.");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_profiles.sh", TEST_ENVIRONMENT.workingDir);

        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).not.toContain("user:       fakeUser");
        expect(response.stdout.toString()).not.toContain("password:   fakePass");
        expect(response.stdout.toString()).not.toContain("host:       fakeHost");
        expect(response.stdout.toString()).not.toContain("port:       3000");
        expect(response.stdout.toString()).not.toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).not.toContain("tokenValue: fakeUser:fakePass@fakeToken");
    });

    it("should not create a profile, if it times out", () => {
        let response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_create_profile_timeout.sh",
            TEST_ENVIRONMENT.workingDir, ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toContain("A login command was issued, but no base profiles exist," +
            " the show token flag was not specified, or we were not given permission to create a profile.");
        expect(response.status).toBe(1);
        expect(response.stdout.toString()).not.toContain("Profile created successfully.");
        expect(response.stdout.toString()).not.toContain("Login successful.");

        response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth_login_show_profiles.sh", TEST_ENVIRONMENT.workingDir);

        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).not.toContain("user:       fakeUser");
        expect(response.stdout.toString()).not.toContain("password:   fakePass");
        expect(response.stdout.toString()).not.toContain("host:       fakeHost");
        expect(response.stdout.toString()).not.toContain("port:       3000");
        expect(response.stdout.toString()).not.toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).not.toContain("tokenValue: fakeUser:fakePass@fakeToken");
    });
});
