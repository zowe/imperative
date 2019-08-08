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

import { IO } from "../../../io/src/IO";
import { Imperative } from "../../../imperative/src/Imperative";
import { WebHelpManager } from "../../src/help/WebHelpManager";
import { CommandResponse } from "../../src/response/CommandResponse";
import { ImperativeConfig } from "../../../imperative/src/ImperativeConfig";
import { GuiResult, ProcessUtils } from "../../../utilities";
import { WebHelpGenerator } from "../..";

describe("WebHelpManager", () => {
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
        const mockCliHome = path.resolve("./packages/__tests__/mockCliHome");
        const webHelpDirNm = mockCliHome + "/web-help";
        const impCfg: ImperativeConfig = ImperativeConfig.instance;
        const cmdReponse = new CommandResponse({ silent: false });
        let instPluginsFileNm: string;

        beforeAll( async () => {
            rimraf.sync(mockCliHome);

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

            // cliHome is a getter of a property, so mock the property
            Object.defineProperty(impCfg, "cliHome", {
                configurable: true,
                get: jest.fn(() => {
                    return mockCliHome;
                })
            });
        });

        afterAll( async () => {
            // Give the browser time to launch before we remove the HTML files
            const msDelay = 3000;
            setTimeout(() =>
                { rimraf.sync(mockCliHome); },
                msDelay
            );
        });

        beforeEach( async () => {
            // ensure that the plugins directory exists
            instPluginsFileNm = path.join(mockCliHome, "plugins");
            if (!fs.existsSync(instPluginsFileNm)) {
                IO.mkdirp(instPluginsFileNm);
            }

            // add the plugins file name to the directory, and create an empty object
            instPluginsFileNm = path.join(instPluginsFileNm, "plugins.json");
            fs.writeFileSync(instPluginsFileNm, "{}");
        });

        it("should report error when calling openRootHelp before recordParms", async () => {
            WebHelpManager.instance.openRootHelp(cmdReponse);
            const jsonResult = cmdReponse.buildJsonResponse();
            expect(jsonResult.stderr.toString()).toContain(
                "Unable to launch help due to an implementation error"
            );
        });

        it("should report error when calling openHelp before recordParms", async () => {
            WebHelpManager.instance.openHelp("Does not matter - will never be used", cmdReponse);
            const jsonResult = cmdReponse.buildJsonResponse();
            expect(jsonResult.stderr.toString()).toContain(
                "Unable to launch help due to an implementation error"
            );
        });

        it("should generate and display help", async () => {
            /* imperative.init does all the setup for WebHelp to be run.
             * We can only call init() once per app. However, our first two tests
             * must be run without init() being called. So, we place our call
             * to init() here. All of our following tests (it clauses)
             * should expect init() to have already been called.
             */
            await Imperative.init(configForHelp);

            WebHelpManager.instance.openRootHelp(cmdReponse);

            if (ProcessUtils.isGuiAvailable() === GuiResult.GUI_AVAILABLE) {
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
            } else {
                const jsonResult = cmdReponse.buildJsonResponse();
                expect(jsonResult.stdout.toString()).toContain(
                    "You are running in an environment with no graphical interface"
                );
                expect(fs.existsSync(webHelpDirNm)).toBe(false);
            }
        });

        it("should display existing help", async () => {
            const realBuildHelp = WebHelpGenerator.prototype.buildHelp;
            const mockBuildHelp = jest.fn();
            WebHelpGenerator.prototype.buildHelp = mockBuildHelp;

            WebHelpManager.instance.openRootHelp(cmdReponse);

            if (ProcessUtils.isGuiAvailable() === GuiResult.GUI_AVAILABLE) {
                expect(mockBuildHelp).not.toHaveBeenCalled();
            } else {
                const jsonResult = cmdReponse.buildJsonResponse();
                expect(jsonResult.stdout.toString()).toContain(
                    "You are running in an environment with no graphical interface"
                );
                expect(fs.existsSync(webHelpDirNm)).toBe(false);
            }

            // restore real function
            WebHelpGenerator.prototype.buildHelp = realBuildHelp;
        });
    });
});
