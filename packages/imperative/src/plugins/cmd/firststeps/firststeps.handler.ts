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

import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { Logger } from "../../../../../logger";
import { PMFConstants } from "../../utilities/PMFConstants";
import { resolve } from "path";
import { IssueSeverity, PluginIssues } from "../../utilities/PluginIssues";
import { ImperativeConfig, TextUtils } from "../../../../../utilities";
import { ImperativeError } from "../../../../../error";
import { IPluginCfgProps } from "../../doc/IPluginCfgProps";
import { PluginManagementFacility } from "../../PluginManagementFacility"
/**
 * The firststeps command handler for cli plugin firststeps.
 *
 * @see {firststepsDefinition}
 */

// export default class Handler implements ICommandHandler {
//     public async process(params: IHandlerParameters): Promise<void> {
//         params.response.console.log("Hello World!");
//     }
// }

export default class FirststepsHandler implements ICommandHandler {
    /**
     * A logger for this class
     *
     * @private
     * @type {Logger}
     */
    private console: Logger = Logger.getImperativeLogger();

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @param {string[]} [params.arguments.plugin] This is the plugin to show the first steps for.
     * 
     * @param {IPluginCfgProps} pluginCfgProps - The configuration properties for this plugin
     *
     * @returns {Promise<ICommandResponse>} The command response
     *
     * @throws {ImperativeError}
     */

    public async process(params: IHandlerParameters): Promise<void> {
        const chalk = TextUtils.chalk;
        this.console.debug(`Root Directory: ${PMFConstants.instance.PLUGIN_INSTALL_LOCATION}`);

        if (params.arguments.plugin == null || params.arguments.plugin.length === 0) {
            throw new ImperativeError({
                msg: `${chalk.yellow.bold("Package name")} is required.`
            });
        } else {
            try {
                // for (const packageName of params.arguments.plugin) {
                //     uninstall(packageName);
                // }

                const pluginsProperties = PluginManagementFacility.instance.allPluginCfgProps

                for (const nextPluginCfgProps of pluginsProperties) {
                    // log the issue list for this plugin
                    // const issueListForPlugin = this.pluginIssues.getIssueListForPlugin(nextPluginCfgProps.pluginName);
                    if (params.arguments.plugin == nextPluginCfgProps.pluginName) {
                        if (nextPluginCfgProps.impConfig.pluginFirstSteps != undefined) {
                            params.response.console.log(nextPluginCfgProps.impConfig.pluginFirstSteps);
                        } else {
                            params.response.console.log("The first steps are not defined for this plugin.");
                        }

                    } // else {
                    //     this.impLogger.info("addAllPluginsToHostCli: Plugin = '" +
                    //         nextPluginCfgProps.pluginName +
                    //         "' was successfully validated with no issues."
                    //     );
                    // }
                }

                // const pluginCfgProps: IPluginCfgProps
                // params.response.console.log(pluginCfgProps.impConfig.pluginFirstSteps);
            } catch (e) {
                throw new ImperativeError({
                    msg: "Uninstall Failed",
                    causeErrors: [e],
                    additionalDetails: e.message
                });
            }
        }
    }
}
