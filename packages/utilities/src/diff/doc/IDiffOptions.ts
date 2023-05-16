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

type outputFormat = "html" | "unifiedstring" | "terminal";

/**
 * interface for diff options
 */
export interface IDiffOptions {

    /**
     * Output format of differences between two, to be returned
     * @type {outputFormat}
     * @memberOf IDiffOptions
     */
    outputFormat: outputFormat,

    /**
     * Number of context line arguments
     * @type {number}
     * @memberOf IDiffOptions
     */
    contextLinesArg?: number,

    /**
     * Optional name for string1
     * @type {string}
     * @memberOf IDiffOptions
     */
    name1?: string,

    /**
     * Optional name for string2
     * @type {string}
     * @memberOf IDiffOptions
     */
    name2?: string,
}