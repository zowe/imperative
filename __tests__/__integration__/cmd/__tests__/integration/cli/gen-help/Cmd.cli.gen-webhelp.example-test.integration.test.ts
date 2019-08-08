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
import * as fsExtra from "fs-extra";
import * as rimraf from "rimraf";

import { ITestEnvironment } from "../../../../../../__src__/environment/doc/response/ITestEnvironment";
import { SetupTestEnvironment } from "../../../../../../__src__/environment/SetupTestEnvironment";
import { runCliScript } from "../../../../../../src/TestUtil";
import { GuiResult, ProcessUtils } from "../../../../../../../packages/utilities";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;

describe("cmd-cli gen-webhelp example-test", () => {
    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_CLI_HOME",
            testName: "cmd_cli_gen_webhelp_example_test"
        });
    });

    it("should generate the help and display it", () => {
        // ensure that the plugins directory exists
        let instPluginsFileNm = path.join(TEST_ENVIRONMENT.workingDir, "plugins");
        if (!fs.existsSync(instPluginsFileNm)) {
            fs.mkdirSync(instPluginsFileNm);
        }

        // add the plugins file name to the directory, and create an empty object
        instPluginsFileNm = path.join(instPluginsFileNm, "plugins.json");
        fs.writeFileSync(instPluginsFileNm, "{}");

        // copy our webhelp distribution files to our test's fake runtime distribution directory
        const fakeRuntimeRootDir = "./__tests__/__integration__/cmd/lib/__tests__/__integration__/cmd/node_modules";
        const fakeRuntimeDistDir = path.join(fakeRuntimeRootDir, "@zowe/imperative/web-help/dist");
        fsExtra.copySync("./web-help/dist", fakeRuntimeDistDir);

        const response = runCliScript(
            __dirname + "/__scripts__/webhelp_with_example_test.sh",
            TEST_ENVIRONMENT.workingDir
        );
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        if (ProcessUtils.isGuiAvailable() === GuiResult.GUI_AVAILABLE) {
            expect(response.stdout.toString()).toContain("Generating web help");
            expect(response.stdout.toString()).toContain("Launching web help in browser");

            const indexFileNm = path.join(TEST_ENVIRONMENT.workingDir, "web-help", "index.html");
            const minSizeOfIndex = 1000;
            const stat = fs.statSync(indexFileNm);
            expect(stat.size).toBeGreaterThan(minSizeOfIndex);
        } else {
            expect(response.stdout.toString()).toContain("You are running in an environment with no graphical interface");
        }

        rimraf.sync(fakeRuntimeRootDir);
    });
});
