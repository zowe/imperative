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

import { ITestEnvironment } from "../../../../../../__src__/environment/doc/response/ITestEnvironment";
import { SetupTestEnvironment } from "../../../../../../__src__/environment/SetupTestEnvironment";
import { runCliScript } from "../../../../../../src/TestUtil";
import { ICommandResponse } from "../../../../../../../packages/cmd";


let TEST_ENVIRONMENT: ITestEnvironment;

describe("cmd-cli respond with-log-messages", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_CLI_HOME",
            testName: "cmd_root_respond_with_log_messages"
        });
    });

    it("should display the help", async () => {
        const response = runCliScript(__dirname + "/__scripts__/with-log-messages/respond_with_log_messages_help.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it("should display a syntax error if no parameters are specified", async () => {
        const response = runCliScript(__dirname + "/__scripts__/with-log-messages/respond_with_log_messages_no_parms.sh",
            TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(1);
        expect(response.stdout.toString()).toBe("");
        expect(response.stderr.toString()).toMatchSnapshot();
    });

    it("should display display a few log messages and allow format strings", async () => {
        const response = runCliScript(__dirname + "/__scripts__/with-log-messages/respond_with_log_messages.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it("should display display a few log messages and allow format strings and produce a JSON response", async () => {
        const response = runCliScript(__dirname + "/__scripts__/with-log-messages/respond_with_log_messages_rfj.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");

        // Ensure we can parse to JSON
        const respObj: ICommandResponse = JSON.parse(response.stdout.toString());

        // Ensure the properties are correct
        expect(respObj.success).toBe(true);
        expect(respObj.stderr).toBe("");
        expect(respObj.stdout).toMatchSnapshot();
        expect(respObj.message).toBe("");
    });
});
