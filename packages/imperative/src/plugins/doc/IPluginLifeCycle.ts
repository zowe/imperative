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

import { IHandlerResponseApi } from "../../../../cmd/src/doc/response/api/handler/IHandlerResponseApi";

/**
 * An optional module of a plugin adheres to this interface to
 * perform actions during the installation lifecycle of a plugin.
 */
export interface IPluginLifeCycle {
    /**
     * This function will be called after a plugin is installed.
     * A plugin can use this opportunity to perform a sanity test or to
     * perform some additional setup which is specific to that plugin.
     * A plugin which provides a specialized credential manager should use
     * this opportunity to insert itself as an override of the standard
     * credential manager that is delivered with Zowe CLI.
     *
     * @throws
     *      A ImperativeError containing a message describing any error
     *      that occurred while performing post-install actions.
     */
    postInstall(): void;

    /**
     * This function will be called before a plugin is uninstalled.
     * This lifecycle hook is intended to replace the capability that used to
     * be performed by the NPM pre-uninstall action before NPM removed that
     * capability in NPM version 7.
     * See https://docs.npmjs.com/cli/v9/using-npm/scripts#a-note-on-a-lack-of-npm-uninstall-scripts
     *
     * A plugin can use this opportunity to revert any specialized setup that was
     * established during the lifetime of the plugin. A plugin which provides a
     * specialized credential manager should use this opportunity to remove itself as
     * an override of the standard credential manager that is delivered with Zowe CLI.
     *
     * @throws
     *      A ImperativeError containing a message describing any error
     *      that occurred while performing post-install actions.
     *
     * After an error occurs, the CLI will NOT perform the un-installation of the plugin.
     */
    preUnstall(): void;
}
