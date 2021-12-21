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
    argv?: string[],
    cwd?: string;
    env?: Record<string, string>;
    stdinLength?: number;
    stdin?: string;
}
