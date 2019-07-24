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

import { Imperative } from "../../../imperative/src/Imperative";
import { WebHelpGenerator } from "../../src/help/WebHelpGenerator";
import { WebHelpManager } from "../../src/help/WebHelpManager";
import { CommandResponse } from "../../src/response/CommandResponse";
import { IImperativeConfig } from "../../../imperative/src/doc/IImperativeConfig";
import { ImperativeConfig } from "../../../utilities/src/ImperativeConfig";
import { IO } from "../../../io";

describe("WebHelpGenerator", () => {
    describe("buildHelp", () => {
        let moduleFileNm: string;
        let cliHome: string;
        let configForHelp: IImperativeConfig;
        let webHelpDirNm: string;
        let rimraf: any;

        beforeAll( async () => {
            rimraf = require("rimraf");

            // any file that lives under the imperative directory will work for our test
            moduleFileNm = "fakeCliCmd";
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
                name: moduleFileNm,
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
                        filename: moduleFileNm
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
            const cmdResp = new CommandResponse({ silent: false });

            /* jenkins machine needs the path to docs to exist,
             * even though Windows & other Linux systems do not care.
            */
            const webHelpDocsDirNm = webHelpDirNm + "/docs";
            if (!fs.existsSync(webHelpDocsDirNm)) {
                IO.mkdirp(webHelpDocsDirNm);
            }

            cmdResp.console.log("test:zzz: require.main = " + require.main);
            cmdResp.console.log("test:zzz: process.mainModule.filename = " + process.mainModule.filename);
            const impDir = require("find-up").sync("imperative", {cwd: process.mainModule.filename, type: "directory"});
            cmdResp.console.log("test:zzz: impDir = " + impDir);
            cmdResp.console.log("test:zzz: ImperativeConfig.instance.callerLocation = " + ImperativeConfig.instance.callerLocation);
            cmdResp.console.log("test:zzz: ImperativeConfig.instance.rootCommandName = " + ImperativeConfig.instance.rootCommandName);
            cmdResp.console.log("test:zzz: ImperativeConfig.instance.hostPackageName = " + ImperativeConfig.instance.hostPackageName);
            cmdResp.console.log("test:zzz: ImperativeConfig.instance.imperativePackageName = " + ImperativeConfig.instance.imperativePackageName);
            cmdResp.console.log("test:zzz: WebHelpManager.instance.fullCommandTree.name = " + WebHelpManager.instance.fullCommandTree.name);
            cmdResp.console.log("test:zzz: WebHelpManager.instance.fullCommandTree.handler = " + WebHelpManager.instance.fullCommandTree.handler);

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
            expect(fileText).toContain('"id": "' + moduleFileNm + '.html"');

            // do a reasonable set of generated files exist?
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + ".html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_config.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_hello.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_plugins_install.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_plugins_uninstall.html")).toBe(true);
        });
    });
});
