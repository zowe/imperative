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

import * as fs from "fs";
import * as path from "path";
import * as rimraf from "rimraf";

import { Imperative } from "../../../imperative/src/Imperative";
import { WebHelpGenerator } from "../../src/help/WebHelpGenerator";
import { WebHelpManager } from "../../src/help/WebHelpManager";
import { CommandResponse } from "../../src/response/CommandResponse";
import { IImperativeConfig } from "../../../imperative/src/doc/IImperativeConfig";
import { ImperativeConfig } from "../../../utilities/src/ImperativeConfig";
import { IO } from "../../../io";

describe("WebHelpGenerator", () => {
    describe("buildHelp", () => {
        let cliHome: string;
        let configForHelp: IImperativeConfig;
        let webHelpDirNm: string;

        beforeAll( async () => {
            cliHome = "packages/__tests__/fakeCliHome";
            webHelpDirNm = path.join(cliHome, "web-help");

            configForHelp = {
                definitions: [
                    {
                        name: "hello",
                        type: "command",
                        options: [],
                        description: "my command"
                    }
                ],
                productDisplayName: "WinHelp Test",
                defaultHome: cliHome,
                rootCommandDescription: "Some Product CLI"
            };

            rimraf.sync(cliHome);

            /* getResolvedCmdTree calls getCallerLocation, and we need it to return some string.
             * getCallerLocation is a getter of a property, so mock we the property.
             */
            Object.defineProperty(process, "mainModule", {
                configurable: true,
                get: jest.fn(() => {
                    return {
                        filename: "FakeCli"
                    };
                })
            });

            // imperative.init does all the setup for WebHelp to be run
            await Imperative.init(configForHelp);
        });

        afterAll( async () => {
            /* Give the browser time to launch before we remove the HTML files.
             * This results in a Jest warning of :
             *      Jest did not exit one second after the test run has completed.
             * However, that is better than the browser popping up "file not found".
             */
            const msDelay = 3000;
            setTimeout(() =>
                { rimraf.sync(cliHome); },
                msDelay
            );
        });

        it("should create Help files", async () => {
            /* jenkins machine needs the path to docs to exist,
             * even though Windows & other Linux systems do not care.
            */
            const webHelpDocsDirNm = webHelpDirNm + "/docs";
            if (!fs.existsSync(webHelpDocsDirNm)) {
                IO.mkdirp(webHelpDocsDirNm);
            }

            const webHelpGen = new WebHelpGenerator(
                WebHelpManager.instance.fullCommandTree,
                ImperativeConfig.instance,
                webHelpDirNm
            );
            webHelpGen.buildHelp(new CommandResponse({ silent: false }));

            // do our generated files contain some of the right stuff?
            let fileNmToTest = webHelpDirNm + "/index.html";
            let fileText = fs.readFileSync(fileNmToTest, "utf8");
            expect(fileText).toContain('div id="panel-container"');
            expect(fileText).toContain('div id="tree-bar"');
            expect(fileText).toContain('div id="cmd-tree"');

            fileNmToTest = webHelpDirNm + "/tree-data.js";
            fileText = fs.readFileSync(fileNmToTest, "utf8");
            expect(fileText).toContain('"id": "FakeCli.html"');

            // do a reasonable set of generated files exist?
            expect(fs.existsSync(webHelpDocsDirNm + "/FakeCli.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/FakeCli_config.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/FakeCli_hello.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/FakeCli_plugins_install.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/FakeCli_plugins_uninstall.html")).toBe(true);
    });
});
