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

/* eslint-disable no-console */
import { diff } from "jest-diff";
import { createTwoFilesPatch } from "diff";
import { IDiffOptions } from "./doc/IDiffOptions";
import { TextUtils } from "../TextUtils";
import { html } from "diff2html";
import { WebDiffManager } from "./WebDiffManager";

/**
 * Utilities to get the diff strings and open the diff strings in terminal and in browser
 * @export
 * @class DiffUtils
 */
export class DiffUtils {
    /**
     * Get the differnce between two string in the form of html, unifiedString and terminal output depending uponn the
     * options passed into the funtions
     * @param {string} string1
     * @param {string} string2
     * @param {string} options
     * @returns {Promise<string>}
     */
    public static async getDiffString(string1: string, string2: string, options: IDiffOptions): Promise<string> {

        if (options.outputFormat === 'terminal') {
            let expandflag = true;
            if (options.contextLinesArg >= 0) {
                expandflag = false;
            }
            const jsonDiff = await diff(string1, string2, {
                aAnnotation: "Removed",
                bAnnotation: "Added",
                aColor: TextUtils.chalk.red,
                bColor: TextUtils.chalk.green,
                contextLines: options.contextLinesArg,
                expand: expandflag
            });

            return jsonDiff;
        }

        if (options.outputFormat === 'unifiedstring' || options.outputFormat === "html") {
            const patchDiff = createTwoFilesPatch(
                'file-a', 'file-b', string1, string2
            );

            if (options.outputFormat === 'html') {
                const htmlDiff = await html(patchDiff, {
                    outputFormat: "side-by-side",
                    matching: "lines",
                    diffStyle: "char",
                });

                return htmlDiff;
            }
            return patchDiff;
        }
    }

    /**
 * Get the differnce between two string in browser
 * @param {string} string1
 * @param {string} string2
 * @return {void}
 */
    public static async openDiffInbrowser(string1: string, string2: string) {
        const patchDiff = createTwoFilesPatch(
            'file-a', 'file-b', string1, string2
        );

        await WebDiffManager.instance.openDiffs(patchDiff);

    }
}