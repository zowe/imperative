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

/**
 * Interface for options supplied to CredsForSessCfg.addCredsOrPrompt()
 * @export
 * @interface ISession
 */
export interface IOptionsForAddCreds {

    /**
     * Indicates that we want to generate a token.
     * When true, we use the user and password for the operation
     * to obtain a token. This applies during a login command.
     * Otherwise, you typically want this to be false.
     * The default value is false.
     */
    requestToken?: boolean;

    /**
     * Indicates that want to prompt for user name and password when
     * no form of credentials are supplied. CLI programs typically
     * want this to be true. A GUI app calling the API may do its
     * own prompting in the GUI and would set this value to false.
     * The default value is true.
     */
    doPrompting?: boolean;
}
