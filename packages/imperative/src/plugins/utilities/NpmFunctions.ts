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
import { execSync, StdioOptions } from "child_process";
import { readFileSync } from "jsonfile";
import * as npmPackageArg from "npm-package-arg";
import * as pacote from "pacote";
const npmCmd = cmdToRun();

/**
 * Common function that requires npm and node.exe if not found just returns npm command as a string.
 *
 * @return {string} command with node.exe and npm paths or 'npm'
 *
 */
export function cmdToRun() {
    let command;
    try {
        const npmExecPath = getNpmPath();
        const nodeExecPath = process.execPath;
        command = `"${nodeExecPath}" "${npmExecPath}"` ;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err.message);
        command = "npm";
    }
    return command;
}

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
    const pipe: StdioOptions = ["pipe", "pipe", process.stderr];
    try {
        const execOutput = execSync(`${npmCmd} install "${npmPackage}" --prefix "${prefix}" ` +
            `-g --registry "${registry}" --legacy-peer-deps`, {
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
        const execOutput = execSync(`${npmCmd} config get registry`);
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
        execSync(`${npmCmd} adduser --registry ${registry} ` +
            `--always-auth --auth-type=legacy`, {stdio: [0,1,2]});
    } catch (err) {
        throw(err.message);
    }
}

/**
 * Fetch name and version of NPM package that was installed
 * @param pkgSpec The package name as specified on NPM install
 */
export async function getPackageInfo(pkgSpec: string): Promise<{ name: string, version: string }> {
    const pkgInfo = npmPackageArg(pkgSpec);
    if (pkgInfo.registry) {
        // We already know package name, so read name and version from package.json
        return readFileSync(path.join(PMFConstants.instance.PLUGIN_NODE_MODULE_LOCATION, pkgInfo.name, "package.json"));
    } else {
        // Package name is unknown, so fetch name and version with pacote (npm SDK)
        return pacote.manifest(pkgSpec);
    }
}

/**
 * Normalize the NPM path so that it works between older and newer versions of node
 *
 * @return {string} The NPM path
 */
export function getNpmPath(): string {
    let npmPath = path.join(require.resolve("npm"));
    const npmPathArray = npmPath.split(path.sep);
    if (npmPathArray.indexOf("npm") > 0) {
        const arrayLen = npmPathArray.length;
        const npmLoc = npmPathArray.indexOf("npm");
        npmPath = path.join(...npmPathArray.splice(npmLoc, arrayLen - npmLoc));
        // eslint-disable-next-line no-console
        console.log(npmPath);
    } else {
        // eslint-disable-next-line no-console
        console.log("Broken");
        npmPath = path.join(require.resolve("npm"), "../..");
    }
    return npmPath;
}