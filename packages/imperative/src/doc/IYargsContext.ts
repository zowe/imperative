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

import * as net from "net";


/**
 * Allow for passing our own "context" / user data through yargs
 * @export
 * @interface IYargsContext
 */
export interface IYargsContext {

    /**
     * Stream to write response to
     * @type {net.Socket}
     * @memberof IYargsContext
     */
    stream?: net.Socket;

    /**
     * Current working directory from socket client
     * @type {string}
     * @memberof IYargsContext
     */
    cwd?: string;
};