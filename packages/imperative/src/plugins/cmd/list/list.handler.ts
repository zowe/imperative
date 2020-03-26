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

import { ICommandHandler, ICommandResponse, IHandlerParameters, CommandResponse } from "../../../../../cmd";
import { Logger } from "../../../../../logger/";
import { readFileSync } from "jsonfile";
import { IPluginJson } from "../../doc/IPluginJson";
import { TextUtils } from "../../../../../utilities";
import { ImperativeError } from "../../../../../error";
import { PMFConstants } from "../../utilities/PMFConstants";

/**
 * The install command handler for cli plugin install.
 *
 * @see {installDefinition}
 */
export default class ListHandler implements ICommandHandler {
    /**
     * A logger for this class
     *
     * @private
     * @type {Logger}
     */
    private log: Logger = Logger.getImperativeLogger();

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @returns {Promise<ICommandResponse>} The command response
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const chalk = TextUtils.chalk;

        const installedPlugins: IPluginJson = readFileSync(PMFConstants.instance.PLUGIN_JSON);

        params.response.data.setObj(installedPlugins);
        let listOutput: string = "";
        let firstTime = true;

        for (const pluginName in installedPlugins) {
            if (installedPlugins.hasOwnProperty(pluginName)) {
                // Build the console output
                if (firstTime) {
                  listOutput = `\n${chalk.yellow.bold("Installed plugins:")} \n\n`;
                }

                listOutput = listOutput + `${chalk.yellow.bold(" -- pluginName: ")}` +
                  `${chalk.red.bold(pluginName)} \n`;
                listOutput = listOutput + `${chalk.yellow.bold(" -- package: ")}` +
                  `${chalk.red.bold(installedPlugins[pluginName].package)} \n`;
                listOutput = listOutput + `${chalk.yellow.bold(" -- version: ")}` +
                  `${chalk.red.bold(installedPlugins[pluginName].version)} \n`;
                listOutput = listOutput + `${chalk.yellow.bold(" -- registry: ")}` +
                  installedPlugins[pluginName].registry + "\n\n";

                // Write to the log file
                if (firstTime) {
                    this.log.simple(" ");
                    this.log.simple("Installed plugins:");
                    this.log.simple(" ");
                    firstTime = false;
                }
                this.log.simple("    pluginName: " + pluginName);
                this.log.simple("    package: " + installedPlugins[pluginName].package);
                this.log.simple("    version: " + installedPlugins[pluginName].version);
                this.log.simple("    registry: " + installedPlugins[pluginName].registry);
                this.log.simple(" ");
            }
        }

        if (listOutput === "") {
          listOutput = "No plugins have been installed into your CLI application.";
        }

        // Write to the results of the list command to console
        params.response.console.log(listOutput);
    }
}
