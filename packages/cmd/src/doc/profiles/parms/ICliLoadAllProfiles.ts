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

/**
 * Optional parameters to profile manager load all profiles
 * @export
 * @interface ICliLoadAllProfiles
 */
export interface ICliLoadAllProfiles {
    /**
     * If true, do not load secure fields
     * @type {boolean}
     * @memberof ICliLoadAllProfiles
     */
    noSecure?: boolean;
    /**
     * If true, loads only the profiles of the current instance of the profile
     * managers "type" - specified when allocating the profile manager.
     * @type {boolean}
     * @memberof ICliLoadAllProfiles
     */
    typeOnly?: boolean;
}
