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
import { Imperative } from "../../../../../../../packages/imperative";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("cmd-cli invalid no-handler", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_CLI_HOME",
            testName: "cmd_cli_invoke"
        });
    });

    it("should fail the command with a message if the command definition of type command omits a handler", () => {
        const response = runCliScript(__dirname + "/__scripts__/invalid-handler.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(1);
        // Check only the first line of the error message
        // In Node v12, the error message contains multiple lines
        // In previous versions of Node, the message is only one line
        expect(response.stderr.toString().replace(/^(Require stack:).+/ms, "")).toMatchSnapshot();
        expect(response.stdout.toString().replace(/\\n(Require stack:).+?((\\n)?")/g, "$2")).toMatchSnapshot();
    });
});
