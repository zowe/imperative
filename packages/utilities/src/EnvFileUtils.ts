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

import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { ImperativeError } from "../../error";

/**
 * Utility to load environment JSON files and set variables
 * @export
 * @class EnvFileUtils
 */
export class EnvFileUtils {

    /**
     * Check and read in an environment file from the user home directory using the app name
     * If the file is valid, set the environment variables
     * If the file is not valid, display an error and continue
     * @param {string} appName - The application name
     * @returns {void}
     * @throws {ImperativeError}
     */
    public static setEnvironmentForApp(appName: string) {
        const expectedFileLocation = this.getEnvironmentFilePath(appName);
        try {
            const fileContents = readFileSync(expectedFileLocation).toString(); // Read the file in
            const fileContentsJSON = JSON.parse(fileContents);
            Object.keys(fileContentsJSON).forEach( key => {
                process.env[key] = fileContentsJSON[key];
            });
        } catch (err) {
            if (err.code !== "ENOENT") {
                // Something unexpected went wrong, so return an error
                throw new ImperativeError({msg: "Failed to set up environment variables from the environment file.\n" +
                    "Environment variables will not be available.", causeErrors: err});
            }
        }
    }

    /**
     * Get the expected path for the user's environment variable file
     * @param {string} appName - The application name
     * @returns {string}
     */
    public static getEnvironmentFilePath(appName: string) {
        const expectedBasename = "." + appName + ".env.json";
        return join(homedir(), expectedBasename);
    }
}