import { IHandlerResponseApi } from "../../doc/response/api/handler/IHandlerResponseApi";

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
 * Web help manager API that handles launching of web help and generating it if necessary.
 * @export
 * @interface IWebHelpManager
 */
export interface IWebHelpManager {
    /**
     * Launches root help page in browser.
     * @memberof IWebHelpManager
     */
    openRootHelp(cmdResponse: IHandlerResponseApi): void;

    /**
     * Launches help page for specific group/command in browser.
     * @param {string} inContext - Name of the page to load, passed as a URL param
     * @memberof IWebHelpManager
     */
    openHelp(inContext: string, cmdResponse: IHandlerResponseApi): void;
}
