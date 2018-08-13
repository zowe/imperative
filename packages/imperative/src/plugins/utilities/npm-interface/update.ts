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

import {execSync} from "child_process";
import {PMFConstants} from "../PMFConstants";
import {readFileSync, writeFileSync} from "jsonfile";
import {IPluginJson} from "../../doc/IPluginJson";
import {Logger} from "../../../../../logger";
import {ImperativeError} from "../../../../../error";

/**
 * @TODO - allow multiple packages to be updated?
 * Common function that abstracts the update process.
 *
 * @param {string} packageName A package name. This value is a valid npm package name.
 *
 * @param {string} registry The npm registry.
 *
 */
export function update(packageName: string, registry: string): string {
  const iConsole = Logger.getImperativeLogger();
  const npmPackage = packageName;

  iConsole.debug(`updating package: ${packageName}`);

  // We need to capture stdout but apparently stderr also gives us a progress
  // bar from the npm install.
  const pipe = ["pipe", "pipe", process.stderr];

  // NOTE: Using npm install in order to retrieve the version which may be updated
  //
  // Perform the npm install, somehow piping stdout and inheriting stderr gives
  // some form of a half-assed progress bar. This progress bar doesn't have any
  // formatting or colors but at least I can get the output of stdout right. (comment from install handler)
  iConsole.info("updating package...this may take some time.");
  iConsole.info(`npm install "${npmPackage}" --prefix ${PMFConstants.instance.PLUGIN_INSTALL_LOCATION} -g --registry ${registry}`);
  const execOutput = execSync(`npm install "${npmPackage}" --prefix ${PMFConstants.instance.PLUGIN_INSTALL_LOCATION} -g --registry ${registry}`, {
    cwd  : PMFConstants.instance.PMF_ROOT,
    stdio: pipe
  });

  /* We get the package name (aka plugin name)
   * from the output of the npm command.
   * The regex is meant to match: + plugin-name@version.
   */
  const stringOutput = execOutput.toString();
  iConsole.info("stringOutput = " + stringOutput);
  const regex = /^\+\s(.*)@(.*)$/gm;
  const match = regex.exec(stringOutput);
  const packageVersion = match[2];

  iConsole.info("Update complete");

  // return the package version so the plugins.json file can be updated
  return packageVersion;
}

