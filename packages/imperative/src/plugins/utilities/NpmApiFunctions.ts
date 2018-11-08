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

import { PMFConstants } from "./PMFConstants";
import * as path from "path";
const npm = path.join(__dirname, "./../../../../../node_modules/npm");
const node = require("child_process");
const nodeExecPath = process.execPath;

/**
 * Common function that installs a npm package using npm APIs.
 * npm.load doesn't install with passed configuration values such as global and prefix
 * that's why need to use npm.config functions to install packages globally and to a specific prefix
 * The link for all configuration values and descriptions:
 * https://docs.npmjs.com/misc/config
 * The link for use case:
 * https://stackoverflow.com/questions/15957529/can-i-install-a-npm-package-from-javascript-running-in-node-js/15957574#15957574
 * The link how to use NPM programmatically from npm-cli.js documentation:
 * https://github.com/npm/cli/blob/latest/bin/npm-cli.js#L75
 * @param {string} prefix Path where to install npm the npm package.
 *
 * @param {string} registry The npm registry to install from.
 *
 * @param {string} npmPackage The name of package to install.
 *
 * @return {string} Log response from NPM api
 *
 */
export function installPackages(prefix: string, registry: string, npmPackage: string): string {
    const pipe = ["pipe", "pipe", process.stderr];

    const execOutput = node.execSync(`"${nodeExecPath}" "${npm}" install "${npmPackage}" --prefix "${prefix}" ` +
        `-g --registry "${registry}"`, {
        cwd: PMFConstants.instance.PMF_ROOT,
        stdio: pipe
    });
    return execOutput.toString();
}

/**
 * Get the registry to install to.
 *
 * @return {string}
 */
export function getRegistry(): string {
    const execOutput = node.execSync(`"${nodeExecPath}" "${npm}" config get registry`);
    return execOutput.toString();
}
