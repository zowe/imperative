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

describe("cmd-cli", () => {

    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_CLI_HOME",
            testName: "cmd_root"
        });
    });

    it("should display the help", async () => {
        const response = runCliScript(__dirname + "/__scripts__/root_help.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it("should show a list of available commands", async () => {
        const response = runCliScript(__dirname + "/__scripts__/available_commands.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it("should flag an invalid group and give a close suggestion", async () => {
        const response = runCliScript(__dirname + "/__scripts__/invalid_command.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(1);
        expect(response.stdout.toString()).toMatchSnapshot();
        expect(response.stderr.toString()).toMatchSnapshot();
    });

    it("should flag an invalid command and list valid commands", async () => {
        const response = runCliScript(__dirname + "/__scripts__/invalid_command2.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(1);
        expect(response.stderr.toString()).toContain("Available commands are \"banana-profile, strawberry-profile, kiwi-profile, insecure-profile, base-profile\"");
    });

    it("should display the version", async () => {
        const response = runCliScript(__dirname + "/__scripts__/root_version.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });
});
