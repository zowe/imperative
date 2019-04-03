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
import * as fs from "fs";
import * as logger from "../../../../../../../packages/logger/src/logger";
// import * as suppose from "suppose";

const TEST_CREDENTIAL_MANAGER: string = " m";
const IMP_SETTINGS_DIR = "/settings/";
const IMP_SETTINGS = IMP_SETTINGS_DIR + "imperative.json";
const PROMPT: string = "prompt*";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;
this.console = logger.Logger.getImperativeLogger();

describe("imperative-test-cli config set credential-manager", () => {

    // Create the test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "IMPERATIVE_TEST_CLI_CLI_HOME",
            testName: "imperative_test_cli_test_config_set_credential_manager_command"
        });
    });

    it("should override the default credential manager", () => {
        const response = runCliScript(__dirname + "/__scripts__/set_credential_manager.sh",
            TEST_ENVIRONMENT.workingDir, [TEST_CREDENTIAL_MANAGER]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);

        const settings = fs.readFileSync(TEST_ENVIRONMENT.workingDir + IMP_SETTINGS).toString();
        expect(settings).toContain(`"CredentialManager": "${TEST_CREDENTIAL_MANAGER}"`);
    });

    it("should prompt for the credential manager", () => {
        const suppose = require("suppose");
        const assert = require("assert");

        process.chdir(__dirname + "/__scripts__/");
        suppose("imperative-test-cli", ["config", "set", "CredentialManager", PROMPT],
          {debug: fs.createWriteStream(__dirname + "/__scripts__/prompt.md")})
          .when(`Please enter "configValue":`).respond("AAA")
          .end((code: any) => {
              this.console.info("END");
              const settings = fs.readFileSync(TEST_ENVIRONMENT.workingDir + IMP_SETTINGS).toString();
              expect(settings).toContain(`"CredentialManager": "${"AAA"}"`);
          });
    });

    it("should execute sample suppose", () => {
        const suppose = require("suppose");
        const assert = require("assert");
        this.console.info("TEST");

        process.chdir(__dirname + "/");
        fs.writeFileSync(__dirname + "/README.md", "READ IT");
        try {
            fs.unlinkSync( __dirname + "/package.json");
        }
        catch (e) {
        }
        // debug is an optional writable output stream
        console.log("READ.MD");
        // debug is an optional writable output stream
        suppose("npm", ["init"], {debug: fs.createWriteStream(__dirname + "/README.md")})
          .when(/name\: \([\w|\-]+\)[\s]*/).respond("awesome_package\n")
          .when("version: (1.0.0) ").respond("0.0.1\n")
          // response can also bnpm e the second argument to .when
          .when("description: ", "It's an awesome package man!\n")
          .when("entry point: (prompt.js) ").respond("\n")
          .when("test command: ").respond("npm test\n")
          .when("git repository: ").respond("\n")
          .when("keywords: ").respond("awesomely, cool\n")
          .when("author: ").respond("JP Richardson\n")
          .when("license: (ISC) ").respond("MIT\n")
          .when("Is this OK? (yes) " ).respond("yes\n")
          .on("error", (err: any) => {
              console.log(err);
          })
          .end((code: any) => {
              console.log("PROMPT END");
              const packageFile = __dirname + "/package.json";
              fs.readFile(packageFile, (err, data) => {
                  const packageObj = JSON.parse(data.toString());
                  console.log(packageObj);
              });
          });
    });
});
