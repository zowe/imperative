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

import { ImperativeError } from "../../error";
import { isNullOrUndefined } from "util";

/**
 * Process utility to wrap callback process routines into promises
 * @export
 * @class ProcessUtils
 */
export class ProcessUtils {

    /**
     * Throw imperative error or return parsed data
     * @static
     * @template T - type to parse
     * @param {string} data - string input data to parse as JSON
     * @param {string} [failMessage="Parse of " + data + " failed"] - failure message
     * @returns {T} - parsed object
     * @memberof JSONUtils
     */

    /**
     * Turn nextTick into a promise to prevent nesting
     * @static
     * @param {() => void} callback - called before promise is resolved
     * @param {...any[]} args - arguments passed to the callback
     * @returns {Promise<void>} - fullfilled whenever callback is invoked
     * @memberof ProcessUtils
     */
    public static nextTick(callback: (...args: any[]) => void, ...args: any[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            process.nextTick(() => {
                callback(...args);
                resolve();
            });
        });
    }
}
