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

export interface ISetupEnvironmentParms {
    /**
     * The home environment variable for your CLI - sets it to the working directory create for your test.
     * @type {string}
     * @memberof ISetupEnvironmentParms
     */
    cliHomeEnvVar: string;
    /**
     * The name of your test suite. Do not include spaces - used to create the working directory (to allow
     * for easier debug reference if a test fails).
     * @type {string}
     * @memberof ISetupEnvironmentParms
     */
    testName: string;
}
