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
 * Object containing metadata about a CLI package or plugin
 * @export
 * @interface IImperativePackageMetadata
 */
export interface IImperativePackageMetadata {

    /**
     * Name of package
     * @type {string}
     * @memberof IImperativePackageMetadata
     */
    name: string;

    /**
     * Version string of package
     * @type {string}
     * @memberof IImperativePackageMetadata
     */
    version: string;

    /**
     * Absolute path where package is installed
     * @type {string}
     * @memberof IImperativePackageMetadata
     */
    installPath?: string;

    /**
     * Absolute path where plugins for package are installed
     * @type {string}
     * @memberof IImperativePackageMetadata
     */
    pluginsPath?: string;
}
