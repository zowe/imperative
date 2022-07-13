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

import { Constants } from "../../../constants/src/Constants";
import {  ProcessUtils, GuiResult } from "../../../utilities/src/ProcessUtils";
import { ImperativeConfig } from "../../../utilities/src/ImperativeConfig";
import WebDiffGenerator from "./WebDiffGenerator";
import { IWebDiffManager } from "./doc/IWebDiffManager";
import { ImperativeError } from "../../../error";
import { html } from "diff2html";

/**
 * Imperatice Web Differences Manager handles the opeing of diffs and
 * constructs the dirs and files if necessary
 * @export
 * @class WebDiffManager
 */
export class WebDiffManager implements IWebDiffManager {
    /**
     * Singleton instance of this class
     * @private
     * @static
     * @type {WebHelpManager}
     * @memberof WebHelpManager
     */
    private static mInstance: WebDiffManager = null;

    /**
     * Return a singleton instance of this class
     * @static
     * @readonly
     */
    public static get instance(): WebDiffManager {
        if (this.mInstance == null) {
            this.mInstance = new WebDiffManager();
        }

        return this.mInstance;
    }


    /**
     * Launch help page for specific group/command in browser.
     * @param {string} inContext - content of diff to be shown
     * @param {IHandlerResponseApi} cmdResponse - Command response object to use for output
     * @memberof WebHelpManager
     */
    public async openDiffs(patchDiff: string) {
        const doWeHaveGui = ProcessUtils.isGuiAvailable();
        if (doWeHaveGui !== GuiResult.GUI_AVAILABLE) {
            let errMsg = "You are running in an environment with no graphical interface." +
                "\nAlternatively, you can run '" + ImperativeConfig.instance.findPackageBinName() +
                " --help' for text-based help.";
            if (doWeHaveGui === GuiResult.NO_GUI_NO_DISPLAY) {
                errMsg += "\n\nIf you are running in an X Window environment," +
                    "\nensure that your DISPLAY environment variable is set." +
                    "\nFor example, type the following:" +
                    "\n    echo $DISPLAY" +
                    "\nIf it is not set, assign a valid value. For example:" +
                    "\n    export DISPLAY=:0.0" +
                    "\nThen try the --help-web option again.";

                throw new ImperativeError({
                    msg: errMsg
                });
            }

            return;
        }

        if (this.checkWebDiffDirExists()) await new WebDiffGenerator(ImperativeConfig.instance, this.webDiffDir).buildDiffDir();

        const htmlDiff = await html(patchDiff, {
            outputFormat: "side-by-side",
            matching: "lines",
            diffStyle: "char",
        });

        if (htmlDiff != null) {
            // writing the diff content into a textt file
            fs.writeFileSync(path.join(this.webDiffDir, 'index.html'), this.genHtmlForDiffs(htmlDiff, patchDiff));
            try {
                ProcessUtils.openInDefaultApp(`file://${this.webDiffDir}/index.html`);
            } catch (e) {
                throw new ImperativeError({
                    msg: "Failed to launch web diff, try running -h for console help instead",
                    causeErrors: [e]
                });
            }
        }
    }


    /**
     * Check if the web diff direcory base has been generated
     * at cli home
     */
    private async checkWebDiffDirExists() {
        if (fs.existsSync(this.webDiffDir)) {
            return true;
        }
        return false;
    }


    /**
     * Gets the directory where built copy of web diff launcher is stored
     * @readonly
     * @private
     * @returns {string} Absolute path of directory
     */
    private get webDiffDir(): string {
        return path.join(ImperativeConfig.instance.cliHome, Constants.WEB_DIFF_DIR);
    }

    /**
     * Returns header HTML for help page
     * @private
     * @param title - Title string for the page
     */
    private genHtmlForDiffs(htmlDiff: string, unifiedStringDiff: string): string {
        return `<!DOCTYPE html>
        <html>
          <head>
            <link
              rel="stylesheet"
              href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.1/styles/github.min.css"
            />
            <link
              rel="stylesheet"
              type="text/css"
              href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css"
            />
            <script
              type="text/javascript"
              src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"
            ></script>
        
            <script>
                const fr = new FileReader()
        
                fr.onload(()=>{
                    document.getElementById('diffOutput').textContent = fr.result
                })
        
                fr.readAsText()
            const diffString = ${unifiedStringDiff}
        
              document.addEventListener('DOMContentLoaded', function () {
                var targetElement = document.getElementsByClassName('d2h-file-list-wrapper')[0];
                var configuration = {
                  drawFileList: true,
                  fileListToggle: false,
                  fileListStartVisible: false,
                  fileContentToggle: false,
                  matching: 'lines',
                  outputFormat: 'side-by-side',
                  synchronisedScroll: true,
                  highlight: true,
                  renderNothingWhenEmpty: false,
                };
                var diff2htmlUi = new Diff2HtmlUI(targetElement, diffString, configuration);
                diff2htmlUi.draw();
                diff2htmlUi.highlightCode();
              });
            </script>
        
            <meta content="0; url=diff.html?p=" />
          </head>
          <body>
            ${htmlDiff}
          </body>
        </html>
    `;
    }
}
