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
 * Options that will affect the behavior of the ProfileInfo class.
 * They are supplied on the ProfileInfo constructor.
 */
export interface IProfOpts {
    /**
     * Indicates if environment variables should override values
     * stored in Zowe configuration profiles on disk.
     * The default is false.
     */
    overrideWithEnv?: boolean;
}
