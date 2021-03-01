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
 * Protocol for daemon mode is to send headers similar to those used in HTTP.  All headers
 * must appear on the same line without a newline.  The version 1 of this protocol requires
 * that all 8 original headers be present.  The first header must always be x-zowe-daemon-headers
 * and the last must always be x-zowe-daemon-end.
 *
 * Integers are the only content passed.  For boolean header types, 0 = false, 1 = true.
 */

import { IDaemonHeaderOptions } from "./doc/IDaemonHeaderOptions";

/**
 * Class to construct headers for daemon mode protocol
 * @export
 * @class DaemonUtils
 */
export class DaemonUtils {

    /**
     * Header from the client to the server indicating a reply from `x-zowe-daemon-prompt`
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_REPLY = "x-zowe-daemon-reply:";

    /**
     * Header to indicate the count of total headers being sent including this header itself
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_HEADERS = "x-zowe-daemon-headers:";

    /**
     * Current version of the headers.  Version 1 = the first 8 headers.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_VERSION = "x-zowe-daemon-version:";

    /**
     * Alternate process exit code.  Default is 0.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_EXIT = "x-zowe-daemon-exit:";

    /**
     * Prompting is requested from the daemon to the client if 1 or 2, 2 indicates secure prompting.  Default is 0.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_PROMPT = "x-zowe-daemon-prompt:";

    /**
     * Unsecure prompting requested
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_PROMPT_UNSECURE = 1;

    /**
     * Secure prompting requested
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_PROMPT_SECURE = 2;

    /**
     * Interactive is requested from the daemon to the client
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_INTERACTIVE = "x-zowe-daemon-interactive:";

    /**
     * Content is for stdout if 1.  Default is 1.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_STDOUT = "x-zowe-daemon-stdout:";

    /**
     * Content is for stderr if 1. Default is 0.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_STDERR = "x-zowe-daemon-stderr:";

    /**
     * Content is a progress spinner
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_PROGRESS = "x-zowe-daemon-progress:";

    /**
     * Ending header.  Value does not matter.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_DAEMON_END = "x-zowe-daemon-end:";

    /**
     * Version 1 of the headers means there are 8 total.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_V1 = 1;

    /**
     * Version 1 of the headers means there are 8 total.
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_V1_LEN = 9;

    /**
     * Headers separator
     * @static
     * @memberof DaemonUtils
     */
    public static readonly X_ZOWE_HEADERS_SEPARATOR = ';';

    /**
     * Build the header string with trailing newline.
     * @static
     * @param {IDaemonHeaderOptions} options
     * @returns {string}
     * @memberof DaemonUtils
     */
    public static buildHeader(options: IDaemonHeaderOptions): string {

        let headers = "";

        const exitCode = options.exitCode || 0;
        const stdout = options.stdout ? 1 : 0;
        const stderr = options.stderr ? 1 : 0;
        const prompt = options.prompt || 0;
        const interactive = options.interactive ? 1 : 0;
        const progress = options.progress ? 1 : 0;

        // beginning header
        headers += DaemonUtils.X_ZOWE_DAEMON_HEADERS + DaemonUtils.X_ZOWE_V1_LEN;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // version
        headers += DaemonUtils.X_ZOWE_DAEMON_VERSION + DaemonUtils.X_ZOWE_V1;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // process exit
        headers += DaemonUtils.X_ZOWE_DAEMON_EXIT;
        headers += exitCode;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // stdout
        headers += DaemonUtils.X_ZOWE_DAEMON_STDOUT;
        headers += stdout;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // stderr
        headers += DaemonUtils.X_ZOWE_DAEMON_STDERR;
        headers += stderr;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // prompt
        headers += DaemonUtils.X_ZOWE_DAEMON_PROMPT;
        headers += prompt;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // interactive
        headers += DaemonUtils.X_ZOWE_DAEMON_INTERACTIVE;
        headers += interactive;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // progress
        headers += DaemonUtils.X_ZOWE_DAEMON_PROGRESS;
        headers += progress;
        headers += DaemonUtils.X_ZOWE_HEADERS_SEPARATOR;

        // ending header
        headers += DaemonUtils.X_ZOWE_DAEMON_END + 0;

        headers += `\n`;
        return headers;
    }
}