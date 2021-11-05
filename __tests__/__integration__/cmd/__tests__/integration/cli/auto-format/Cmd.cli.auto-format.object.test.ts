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


let TEST_ENVIRONMENT: ITestEnvironment;

describe("cmd-cli auto-format object", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_HOME",
            testName: "cmd_cli_auto_format_object"
        });
    });

    it ("should use the defaults coded in the handler to prettify the object", () => {
        const response = runCliScript(__dirname + "/__scripts__/default_object_output.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it ("should allow a single field to be output", () => {
        const response = runCliScript(__dirname + "/__scripts__/object_format_single_field.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it ("should allow a single field to be filtered and printed as a table", () => {
        const response = runCliScript(__dirname + "/__scripts__/object_print_inner_table.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it ("should allow the object to be printed as a single row of a table with a header", () => {
        const response = runCliScript(__dirname + "/__scripts__/object_format_table.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it ("should allow a nested property to be targeted and formatted", () => {
        const response = runCliScript(__dirname + "/__scripts__/object_nested_property.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it ("should allow multiple nested properties to be extract and formatted as a table and object", () => {
        const response = runCliScript(__dirname + "/__scripts__/object/create_table_and_object_nested.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(0);
        expect(response.stderr.toString()).toBe("");
        expect(response.stdout.toString()).toMatchSnapshot();
    });
});
