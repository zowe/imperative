/*
* MIT License                                                                     *
*                                                                                 *
* Copyright (c) 2018 CA                                                           *
*                                                                                 *
* Permission is hereby granted, free of charge, to any person obtaining a copy    *
* of this software and associated documentation files (the "Software"), to deal   *
* in the Software without restriction, including without limitation the rights    *
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell       *
* copies of the Software, and to permit persons to whom the Software is           *
* furnished to do so, subject to the following conditions:                        *
*                                                                                 *
* The above copyright notice and this permission notice shall be included in all  *
* copies or substantial portions of the Software.                                 *
*                                                                                 *
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR      *
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,        *
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE     *
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER          *
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,   *
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE   *
* SOFTWARE.                                                                       *
*                                                                                 *
*/

import {execSync} from "child_process";
import {Imperative} from "../../../../";
import {IssueSeverity} from "./PluginIssues";
import {Logger} from "../../../../logger";
import {PMFConstants} from "./PMFConstants";
import * as path from "path";
import {IO} from "../../../../io";

/**
 * Run another instance of the host CLI command to validate a plugin that has
 * just been installed. We use a separate process instead of an API call
 * because when the user re-installs an existing plugin we cannot validate
 * if the plugin has conflicting command names because the plugin has
 * already been incorporated into the Imperative command tree, and thus it
 * could conflict with its own commands. However, if we run a validate command
 * in a new process, we start with a clean slate and we get accurate results.
 *
 * @param pluginName - The name of a plugin to be validated.
 */
export function runValidatePlugin(pluginName: string): string {
    if (Imperative.rootCommandName == null) {
        return `Imperative.rootCommandName is NULL. Unable to validate plugin = '${pluginName}'`;
    }

    /* When imperative fails to find a rootCommandName in the package.json bin
     * property, it uses the path to the CLI's typescript file. While this has
     * only been seen in system test scripts, we check for such a situation.
     * If the rootCommandName does not start with a 'node' command, but
     * specifies a typescript or javascript file, we add the 'node' command.
     */
    const extLen = 3;
    const nodeCmd = "node";
    let cmdToRun = Imperative.rootCommandName;
    const rootCmdPartToCompare = cmdToRun.trim().substring(0, nodeCmd.length);
    if (rootCmdPartToCompare !== nodeCmd ) {
        if (cmdToRun.substring(cmdToRun.length - extLen) === ".js") {
            cmdToRun = "node " + Imperative.rootCommandName;
        } else if (cmdToRun.substring(cmdToRun.length - extLen) === ".ts") {
            cmdToRun = "node --require ts-node/register " + Imperative.rootCommandName;
        }
    }

    const impLogger = Logger.getImperativeLogger();
    impLogger.debug(`Running plugin validation command = ${cmdToRun} plugins validate ${pluginName} --response-format-json`);
    const valOutputJsonTxt = execSync(`${cmdToRun} plugins validate ${pluginName} --response-format-json`, {
        cwd: PMFConstants.instance.PMF_ROOT
    });
    const valResultJsonObj = JSON.parse(valOutputJsonTxt.toString());
    return formValidateMsg(valResultJsonObj);
}

// _______________________________________________________________________
/**
 * Form the final validation message. We concatenate the stderr and stdout
 * of the validation command, and append a message about the success or
 * failure of the validation.
 *
 * @param {string} valResultJsonObj - The output of plugin validation command.
 *
 * @returns {String} The final message to be displayed to the end user.
 */
function formValidateMsg(valResultJsonObj: any) {
    const validateOutput = valResultJsonObj.stdout;
    const validateErr = valResultJsonObj.stderr;
    const issueIndicator = "___ ";
    let resultMsg = "";
    let fullMsg = "";
    if (validateErr && validateErr.length > 0) {
        fullMsg += validateErr + "\n";
    }
    if (validateOutput && validateOutput.length > 0) {
        if (validateOutput.includes(issueIndicator + IssueSeverity.ERROR)) {
            resultMsg = `This plugin has errors and will be excluded from the '${Imperative.rootCommandName}' application.`;
        } else if (validateOutput.includes(issueIndicator + IssueSeverity.WARNING)) {
            resultMsg = `This plugin has warnings, but will be included in the '${Imperative.rootCommandName}' application.`;
        } else {
            resultMsg = `This plugin was successfully validated. Enjoy the '${Imperative.rootCommandName}' application.`;
        }

        fullMsg = validateOutput;
    }
    if (resultMsg.length > 0) {
        fullMsg += resultMsg;
    }
    return fullMsg;
}
