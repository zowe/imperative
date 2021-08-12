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
import { ICommandDefinition } from "../../../cmd/src/doc/ICommandDefinition";

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

            const exampleCommand: ICommandDefinition = {
                name: "world",
                type: "command",
                options: [],
                description: "my command"
            };
            configForHelp = {
                definitions: [
                    {
                        name: "hello",
                        type: "group",
                        options: [],
                        description: "my group",
                        children: [
                            exampleCommand,
                            {
                                name: "universe",
                                type: "group",
                                options: [],
                                description: "my subgroup",
                                children: [exampleCommand]
                            }
                        ]
                    }
                ],
                name: moduleFileNm,
                productDisplayName: "WinHelp Test",
                defaultHome: cliHome,
                rootCommandDescription: "Some Product CLI"
            };

            rimraf.sync(cliHome);

            /* process.mainModule.filename was null, so we must give it a value.
             * mainModule is a getter of a property, so we mock the property.
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
            rimraf.sync(cliHome);
        });

        it("should create Help files", async () => {
            const cmdResp = new CommandResponse({ silent: false });

            /* When jenkins machine runs this test as an integration test,
             * it needs the path to docs to exist, even though Windows does not care.
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
            webHelpGen.buildHelp(cmdResp);

            // do our generated files contain some of the right stuff?
            let fileNmToTest = webHelpDirNm + "/index.html";
            let fileText = fs.readFileSync(fileNmToTest, "utf8");
            expect(fileText).toContain('div id="panel-container"');
            expect(fileText).toContain('div id="tree-tabs"');
            expect(fileText).toContain('div id="cmd-tree"');

            fileNmToTest = webHelpDirNm + "/tree-data.js";
            fileText = fs.readFileSync(fileNmToTest, "utf8");
            expect(fileText).toContain('"id":"' + moduleFileNm + '.html"');

            fileNmToTest = webHelpDocsDirNm + "/" + moduleFileNm + "_hello.html";
            fileText = fs.readFileSync(fileNmToTest, "utf8");
            expect(fileText).toContain("<h4>Commands</h4>");
            expect(fileText).toContain("<h4>Groups</h4>");

            // do a reasonable set of generated files exist?
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + ".html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_config.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_hello_universe.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_hello_world.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_plugins_install.html")).toBe(true);
            expect(fs.existsSync(webHelpDocsDirNm + "/" + moduleFileNm + "_plugins_uninstall.html")).toBe(true);
        });
    });
});
