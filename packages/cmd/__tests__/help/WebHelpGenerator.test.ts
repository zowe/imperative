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

import * as rimraf from "rimraf";
import * as fs from "fs";

import { Imperative } from "../../../imperative/src/Imperative";
import { WebHelpGenerator } from "../../src/help/WebHelpGenerator";
import { WebHelpManager } from "../../src/help/WebHelpManager";
import { CommandResponse } from "../../src/response/CommandResponse";
import { ImperativeConfig } from "../../../utilities/src/ImperativeConfig";

describe("WebHelpGenerator", () => {
    describe("buildHelp", () => {
        const configForHelp: IImperativeConfig = {
            definitions: [
                {
                    name: "hello",
                    type: "command",
                    options: [],
                    description: "my command"
                }
            ],
            productDisplayName: "WinHelp Test",
            defaultHome: "~/.myproduct",
            rootCommandDescription: "Some Product CLI"
        };
        const webHelpDirNm = "packages/__tests__/web-help-output";

        beforeEach( async () => {
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
            rimraf.sync(webHelpDirNm);
            await Imperative.init(configForHelp);
        });

        afterEach( async () => {
            rimraf.sync(webHelpDirNm);
        });

        it("should create Help files", async () => {
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
            expect(fs.existsSync(webHelpDirNm + "/docs/FakeCli.html")).toBe(true);
            expect(fs.existsSync(webHelpDirNm + "/docs/FakeCli_config.html")).toBe(true);
            expect(fs.existsSync(webHelpDirNm + "/docs/FakeCli_hello.html")).toBe(true);
            expect(fs.existsSync(webHelpDirNm + "/docs/FakeCli_plugins_install.html")).toBe(true);
            expect(fs.existsSync(webHelpDirNm + "/docs/FakeCli_plugins_uninstall.html")).toBe(true);
    });
});
