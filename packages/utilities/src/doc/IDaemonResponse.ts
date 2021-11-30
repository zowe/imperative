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
 * Option interface to construct response from daemon client
 * @export
 * @interface IDaemonResponse
 */
export interface IDaemonResponse {

    /**
     * Content is from daemon client, not an interactive user
     * @type {string}
     * @memberof IDaemonResponse
     */
    id: string;

    /**
     * Content is reply from daemon
     * @type {string}
     * @memberof IDaemonResponse
     */
    reply?: string;
}