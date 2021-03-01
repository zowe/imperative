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
 * Option interface to construct headers for daemon mode protocol
 * @export
 * @interface IDaemonHeaderOptions
 */
export interface IDaemonHeaderOptions {

    /**
     * Process exit code
     * @type {number}
     * @memberof IDaemonHeaderOptions
     */
    exitCode?: number;

    /**
     * Indicator for prompting
     * @type {number}
     * @memberof IDaemonHeaderOptions
     */
    prompt?: number;

    /**
     * Indicator for interactive
     * @type {number}
     * @memberof IDaemonHeaderOptions
     */
    interactive?: boolean;

    /**
     * Content is for stdout
     * @type {boolean}
     * @memberof IDaemonHeaderOptions
     */
    stdout?: boolean;

    /**
     * Content is for stderr
     * @type {boolean}
     * @memberof IDaemonHeaderOptions
     */
    stderr?: boolean;

    /**
     * Content is progress spinner
     * @type {boolean}
     * @memberof IDaemonHeaderOptions
     */
    progress?: boolean;
}