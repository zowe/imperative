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

import {PMFConstants} from "../PMFConstants";
import {Logger} from "../../../../../logger";
const npm  = require("npm");

/**
 * @TODO - allow multiple packages to be updated?
 * Common function that abstracts the update process.
 *
 * @param {string} packageName A package name. This value is a valid npm package name.
 *
 * @param {string} registry The npm registry.
 *
 */
export async function update(packageName: string, registry: string) {
  const iConsole = Logger.getImperativeLogger();
  const npmPackage = packageName;

  iConsole.debug(`updating package: ${packageName}`);

  // NOTE: Using npm install in order to retrieve the version which may be updated
  //
  // Perform the npm install, somehow piping stdout and inheriting stderr gives
  // some form of a half-assed progress bar. This progress bar doesn't have any
  // formatting or colors but at least I can get the output of stdout right. (comment from install handler)
  iConsole.info("updating package...this may take some time.");

  const npmOptions: object = {
      prefix: PMFConstants.instance.PLUGIN_INSTALL_LOCATION,
      global: true,
      registry
  };

  const execOutput = await new Promise((resolve) => {
      npm.load(npmOptions, (err: Error) => {
          if (err) {
              iConsole.error(err.message);
              throw new Error(err.message);
          }
          resolve(new Promise((resolveInstall) => {
              npm.commands.install(PMFConstants.instance.PLUGIN_INSTALL_LOCATION,
                  [npmPackage], (installError: Error, response: any) => {
                      if (installError) {
                          iConsole.error(installError.message);
                          throw new Error(installError.message);
                      }
                      resolveInstall(response);
                  });
          }));
      });
  });

  /* We get the package name (aka plugin name)
   * from the output of the npm command.
   * The regex is meant to match: + plugin-name@version.
   */
  const stringOutput = execOutput.toString();
  iConsole.info("stringOutput = " + stringOutput);
  let regex = /(@[a-z]*\/[a-z0-9]*)@([0-9][^,]*)/gm;
  if (npmPackage.includes("/") || npmPackage.includes("\\")) {
      const pluginName = npmPackage.substring((npmPackage.indexOf("/") + 1));
      regex = new RegExp("(@[a-z]*\\/" + pluginName + ")@([0-9][^,]*)", "gm");
  }
  const match = regex.exec(stringOutput);
  const packageVersion = match[2];

  iConsole.info("Update complete");

  // return the package version so the plugins.json file can be updated
  return packageVersion;
}

