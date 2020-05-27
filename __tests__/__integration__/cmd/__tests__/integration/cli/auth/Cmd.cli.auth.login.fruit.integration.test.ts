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

    it("should have auth login command that loads values from base profile", () => {
        const response = runCliScript(__dirname + "/__scripts__/base_profile_and_auth.sh",
            TEST_ENVIRONMENT.workingDir, ["fakeUser", "fakePass"]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        // the output of the command should include token value
        expect(response.stdout.toString()).toContain("tokenType:  jwtToken");
        expect(response.stdout.toString()).toContain("tokenValue: fakeUser:fakePass@fakeToken");
    });
});
