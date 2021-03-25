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

import { Logger } from "../../../logger";

/**
 * Options that will affect the behavior of the ProfileInfo class.
 * They are supplied on the ProfileInfo constructor.
 */
export interface IProfOpts {
    /**
     * Specifies an already initialized Imperative logger that the ProfileInfo
     * class should use. If omitted, a new logger will be instantiated.
     */
    imperativeLogger?: Logger;

    /**
     * TODO? Disable loading of secure properties in profiles.
     */
    // noSecure?: boolean;

    /**
     * Indicates if environment variables should override values
     * stored in Zowe configuration profiles on disk.
     * The default is false.
     */
    overrideWithEnv?: boolean;

    /**
     * Implements a custom method to require Keytar module which manages
     * secure credentials. If undefined, the default implementation is to
     * `require("keytar")` from the caller app's node_modules folder.
     */
    requireKeytar?: () => NodeModule;
}
