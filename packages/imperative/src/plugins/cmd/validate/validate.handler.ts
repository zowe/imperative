/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import { ICommandHandler, ICommandResponse, IHandlerParameters, IHandlerResponseApi } from "../../../../../cmd";
import { TextUtils } from "../../../../../utilities";
import { ImperativeError } from "../../../../../error";
import { PluginIssues } from "../../utilities/PluginIssues";
import { IPluginJson } from "../../doc/IPluginJson";

/**
 * The validate command handler for the cli plugin validate command.
 *
 * @see {validateDefinition}
 */
export default class ValidateHandler implements ICommandHandler {

  /**
   * A class with recorded issues for each plugin for which problems were detected.
   *
   * @private
   * @type {IPluginIssues}
   */
  private pluginIssues = PluginIssues.instance;

  // __________________________________________________________________________
  /**
   * Process the command and input.
   *
   * @param {IHandlerParameters} params - Parameters supplied by yargs
   *
   * @param {string[]} [params.arguments.plugin] - The name of
   *        a plugin to validate. If omitted all installed plugins
   *        will be validated.
   *
   * @returns {Promise<ICommandResponse>} The command response
   *
   * @throws {ImperativeError}
   */
  public async process(params: IHandlerParameters): Promise<void> {
    let pluginName: string = null;
    const installedPlugins: IPluginJson = this.pluginIssues.getInstalledPlugins();

    if (params.arguments.plugin == null ||
      params.arguments.plugin.length === 0 ||
      params.arguments.plugin === "") {
      if (Object.keys(installedPlugins).length === 0) {
        params.response.console.log(
          "No plugins have been installed into your CLI application."
        );
      } else {
        // loop through each plugin installed in our plugins file
        for (pluginName in installedPlugins) {
          if (this.pluginIssues.getInstalledPlugins().hasOwnProperty(pluginName)) {
            this.displayPluginIssues(pluginName, params.response);
          }
        }
      }
    } else {
      // is the specified plugin installed?
      pluginName = params.arguments.plugin;
      if (!installedPlugins.hasOwnProperty(pluginName)) {
        params.response.console.log(TextUtils.chalk.red(
          "The specified plugin '" + pluginName +
          "' has not been installed into your CLI application."
        ));
      } else {
        this.displayPluginIssues(pluginName, params.response);
      }
    }
  }

  // __________________________________________________________________________
  /**
   * Display the issues assocated with the specified plugin.
   *
   * @param {string} pluginName - The name of the plugin.
   *
   * @param {IHandlerResponseApi} cmdResponse - Used to supply the response from the command.
   */
  private displayPluginIssues(pluginName: string, cmdResponse: IHandlerResponseApi): void {
    // display any plugin issues
    let valResultsMsg: string = "\nValidation results for plugin '" + pluginName +
      "':\n";
    const issueListForPlugin = this.pluginIssues.getIssueListForPlugin(pluginName);
    if (issueListForPlugin.length === 0) {
      valResultsMsg += "Successfully validated.";
      cmdResponse.console.log(valResultsMsg);
    } else {
      for (const nextIssue of issueListForPlugin) {
        valResultsMsg += "___ " + nextIssue.issueSev + ": " + nextIssue.issueText + "\n";
      }

      let msgColor: string = "yellow";
      if (this.pluginIssues.doesPluginHaveError(pluginName)) {
        msgColor = "red";
        valResultsMsg += "No operations from this plugin will be available for future commands.\n";
      }

      cmdResponse.console.log(TextUtils.chalk[msgColor](valResultsMsg));
    }
  }
}
