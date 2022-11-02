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

import * as path from "path";
import * as fs from "fs";

import { ITestEnvironment } from "../../../../../../../__src__/environment/doc/response/ITestEnvironment";
import { SetupTestEnvironment } from "../../../../../../../__src__/environment/SetupTestEnvironment";
import { runCliScript } from "../../../../../../../src/TestUtil";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("imperative-test-cli config report-env", () => {
    // Create the test environment
    beforeAll(async () => {
        const serverAddressRegex = /(http.*)\s/;

        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_report-env_command"
        });
    });

    describe("success scenarios", () => {

        it("should display the help", () => {
            const response = runCliScript(__dirname + "/../__scripts__/get_help.sh", TEST_ENVIRONMENT.workingDir, ["report-env"]);
            expect(response.output.toString()).toContain("report-env");
            expect(response.output.toString()).toContain("Reports key items from your environment and identifies problem conditions");
            expect(response.output.toString()).toContain("Report information and issues about");
            expect(response.error).not.toBeDefined();
            expect(response.stderr.toString()).toEqual("");
        });

        it("should successfully produce a report", async () => {
            const pluginsDir = path.join(TEST_ENVIRONMENT.workingDir, "plugins");
            if (!fs.existsSync(pluginsDir)) {
                fs.mkdirSync(pluginsDir);
            }
            fs.copyFileSync(path.join(__dirname, "/__resources__/plugins.json"),
                path.join(pluginsDir, "/plugins.json")
            );

            fs.copyFileSync(path.join(__dirname, "/__resources__/test.config.good.json"),
                path.join(TEST_ENVIRONMENT.workingDir, "imperative-test-cli.config.json")
            );
            fs.copyFileSync(path.join(__dirname, "/__resources__/test.schema.good.json"),
                path.join(TEST_ENVIRONMENT.workingDir, "test.schema.good.json")
            );

            const response = runCliScript(path.join(__dirname, "/__scripts__/report-env.sh"),
                TEST_ENVIRONMENT.workingDir
            );

            expect(response.error).not.toBeDefined();
            expect(response.output.toString()).toContain("Zowe CLI version =");
            expect(response.output.toString()).toContain("Node.js version =");
            expect(response.output.toString()).toContain("Node Version Manager version =");
            expect(response.output.toString()).toContain("O.S. platform =");
            expect(response.output.toString()).toContain("O.S. architecture =");
            expect(response.output.toString()).toContain("O.S. PATH =");
            expect(response.output.toString()).toContain("ZOWE_CLI_HOME =");
            expect(response.output.toString()).toContain("ZOWE_APP_LOG_LEVEL =");
            expect(response.output.toString()).toContain("ZOWE_IMPERATIVE_LOG_LEVEL =");
            expect(response.output.toString()).toContain("NPM version =");
            expect(response.output.toString()).toContain("Shell =");
            expect(response.output.toString()).toContain("Global prefix =");
            expect(response.output.toString()).toContain("registry =");
            expect(response.output.toString()).toContain("node bin location =");
            expect(response.output.toString()).toContain("HOME =");
            expect(response.output.toString()).toContain("Zowe CLI configuration information");
            expect(response.output.toString()).toContain("Zowe daemon mode =");
            expect(response.output.toString()).toContain("Zowe config type = V2 Team Config");
            expect(response.output.toString()).toContain("Team config files in effect:");
            expect(response.output.toString()).toContain("imperative-test-cli.config.json");
            expect(response.output.toString()).toContain("Default profile names:");
            expect(response.output.toString()).toContain("base = myBase");
            expect(response.output.toString()).toContain("tso =  myTso");
            expect(response.output.toString()).toContain("zosmf =myMainZosmf");
            expect(response.output.toString()).toContain("Available profile names:");
            expect(response.output.toString()).toContain("mySecondaryZosmf");
            expect(response.output.toString()).toContain("Installed plugins:");
            expect(response.output.toString()).toContain("Package = @zowe/cics-for-zowe-cli");
            expect(response.output.toString()).toContain("Package = @broadcom/endevor-for-zowe-cli@zowe-v2-lts");
            expect(response.output.toString()).toContain("Package = @zowe/ims-for-zowe-cli");
            expect(response.output.toString()).toContain("Package = @zowe/zos-ftp-for-zowe-cli");
            expect(response.output.toString()).toContain("This information contains site-specific data. Redact anything required");
        });
    });
});
