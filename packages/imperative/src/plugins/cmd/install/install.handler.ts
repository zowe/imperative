/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import {ICommandHandler, ICommandResponse, IHandlerParameters} from "../../../../../cmd";
import {Logger} from "../../../../../logger/";
import {PMFConstants} from "../../utilities/PMFConstants";
import {resolve} from "path";
import {install} from "../../utilities/npm-interface";
import {IPluginJson} from "../../doc/IPluginJson";
import {IPluginJsonObject} from "../../doc/IPluginJsonObject";
import {readFileSync} from "jsonfile";
import {execSync} from "child_process";
import {TextUtils} from "../../../../../utilities";
import {ImperativeError} from "../../../../../error";
import {runValidatePlugin} from "../../utilities/runValidatePlugin";

/**
 * The install command handler for cli plugin install.
 *
 * @see {installDefinition}
 */
export default class InstallHandler implements ICommandHandler {
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
   * @param {string[]} [params.arguments.plugin=[]] This is an array of plugins to install. Plugins can be anything
   *                                                 that is acceptable to an `npm install` command. NOTE: If you want
   *                                                 to use a local plugin with a relative path, be sure to include
   *                                                 at least one / or \ character. Ex: you have a local plugin called
   *                                                 "test-plugin" in your cwd, you need to do `cli plugin install
   *                                                 ./test-plugin` as test-plugin will be interpreted as a remote npm
   *                                                 package name. When this argument is empty, we will attempt to use
   *                                                 a plugins.json file to install the plugins from.
   *
   * @param {string} [params.arguments.registry] This is the npm registry to install from, if this parameter is not
   *                                             specified by the command line, then we will use the value returned by
   *                                             `npm config get registry.
   *
   * @param {string} [params.arguments.file] This option specifies the location of a plugins.json file to be used for
   *                                         the install. When no packages are specified, all plugins specified in this
   *                                         file will be installed to the base cli and the contents will be copied over
   *                                         to plugins.json.
   *
   *                                         If this argument is missing and no packages are specified,
   *                                         we will install from the actual plugins.json file (which may or may not
   *                                         have plugins in it). The reason for this logic is because plugins may be
   *                                         deleted when a base cli is updated. However, someone could issue a command
   *                                         like, `cli plugin install`, to get everything back after an update.
   *
   * @returns {Promise<ICommandResponse>} The command response
   *
   * @throws {ImperativeError}
   */
  public async process(params: IHandlerParameters): Promise<void> {
    const chalk = TextUtils.chalk;
    this.console.debug(`Root Directory: ${PMFConstants.instance.PLUGIN_INSTALL_LOCATION}`);

    if (params.arguments.plugin.length > 0 && typeof params.arguments.file !== "undefined") {
      throw new ImperativeError({
        msg: `Option ${chalk.yellow.bold("--file")} can not be specified if positional ${chalk.yellow.bold("package...")} is as well. ` +
        `They are mutually exclusive.`
      });
    } else {
      try {
        let installRegistry: string;

        // Get the registry to install to
        if (typeof params.arguments.registry === "undefined") {
          installRegistry = execSync("npm config get registry")
            .toString()
            .replace("\n", "");
        } else {
          installRegistry = params.arguments.registry;
        }

        params.response.console.log(
          "Imperative CLI Framework plug-ins can gain control of your CLI application\n" +
          "legitimately during the execution of every command. Install 3rd party plug-ins\n" +
          "at your own risk. CA Technologies makes no warranties regarding the use of\n" +
          "3rd party plug-ins.\n\n" +
          "Imperative's plugin installation program handles peer dependencies for modules\n" +
          "in the @brightside namespace, so you can safely ignore NPM warnings about\n" +
          "missing peer dependencies related to @brightside modules.\n"
        );

        params.response.console.log("Registry = " + installRegistry);

        // This section determines which npm logic needs to take place
        if (params.arguments.plugin.length === 0) {
          const configFile = typeof params.arguments.file === "undefined" ?
            PMFConstants.instance.PLUGIN_JSON :
            resolve(params.arguments.file);

          this.console.debug("Need to install using plugins.json file");
          this.console.debug(`Using config file: ${configFile}`);

          // Attempt to load that file and formulate the corresponding package
          const packageJson: IPluginJson = readFileSync(configFile);

          if (Object.keys(packageJson).length === 0) {
            params.response.console.log("No packages were found in " +
              configFile + ", so no plugins were installed.");
            return;
          }

          for (const packageName in packageJson) {
            if (packageJson.hasOwnProperty(packageName)) {
              const packageInfo: IPluginJsonObject = packageJson[packageName];

              // Registry is typed as optional in the doc but the function expects it
              // to be passed. So we'll always set it if it hasn't been done yet.
              if (!packageInfo.registry) {
                packageInfo.registry = installRegistry;
              }

              this.console.debug(`Installing plugin: ${packageName}`);
              this.console.debug(`Location: ${packageInfo.package}`);
              this.console.debug(`Registry: ${packageInfo.registry}`);
              this.console.debug(`Version : ${packageInfo.version}`);

              // Get the argument to the install command
              // For simplicity a / or \ indicates that we are not dealing with an npm package
              const packageArgument = packageInfo.package === packageName ?
                `${packageInfo.package}@${packageInfo.version}` :
                packageInfo.package;

              this.console.debug(`Package: ${packageArgument}`);

              params.response.console.log("\n_______________________________________________________________");
              const pluginName = install(packageArgument, packageInfo.registry, true);
              params.response.console.log("Installed plugin name = '" + pluginName + "'");
              params.response.console.log(runValidatePlugin(pluginName));
            }
          }

          // write the json file when done if not the plugin json file
        } else {
          for (const packageString of params.arguments.plugin) {
            params.response.console.log("\n_______________________________________________________________");
            const pluginName = install(`${packageString}`, installRegistry);
            params.response.console.log("Installed plugin name = '" + pluginName + "'");
            params.response.console.log(runValidatePlugin(pluginName));
          }
        }
      } catch (e) {
        throw new ImperativeError({
          msg: "Install Failed",
          causeErrors: e,
          additionalDetails: e.message
        });
      }
    }
  }
}
