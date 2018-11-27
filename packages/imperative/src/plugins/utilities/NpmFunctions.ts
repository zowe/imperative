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
import { execSync } from "child_process";
const npm = path.join(require.resolve("npm"), "../..");
const nodeExecPath = process.execPath;

/**
 * Common function that installs a npm package using the local npm cli.
 * @param {string} prefix Path where to install npm the npm package.
 *
 * @param {string} registry The npm registry to install from.
 *
 * @param {string} npmPackage The name of package to install.
 *
 * @return {string} command response
 *
 */
export function installPackages(prefix: string, registry: string, npmPackage: string): string {
    const pipe = ["pipe", "pipe", process.stderr];
    try {
        const execOutput = execSync(`"${nodeExecPath}" "${npm}" install "${npmPackage}" --prefix "${prefix}" ` +
            `-g --registry "${registry}"`, {
            cwd: PMFConstants.instance.PMF_ROOT,
            stdio: pipe
        });
        return execOutput.toString();
    } catch (err) {
        throw (err.message);
    }
}

/**
 * Get the registry to install to.
 *
 * @return {string}
 */
export function getRegistry(): string {
    try {
        const execOutput = execSync(`"${nodeExecPath}" "${npm}" config get registry`);
        return execOutput.toString();
    } catch (err) {
        throw(err.message);
    }
}

/**
 * NPM login to be able to install from secure registry
 * @param {string} registry The npm registry to install from.
 */
export function npmLogin(registry: string) {
    try {
        execSync(`"${nodeExecPath}" "${npm}" adduser --registry ${registry} ` +
            `--always-auth --auth-type=legacy`, {stdio: [0,1,2]});
    } catch (err) {
        throw(err.message);
    }
}
