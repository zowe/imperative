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

import { IProfLoc } from "./IProfLoc";

/**
 * The attributes of a profile argument.
 */
export interface IProfArgAttrs {
    /** The name of the argument */
    argName: string;

    /** The type of data for this property */
    dataType: "string" | "number" | "boolean" | "object";

    /** The value for the argument */
    argValue: string | number | boolean | object;

    /** The location of this argument */
    argLoc: IProfLoc;

    /** Whether the argument value is stored securely */
    isSecure?: boolean;
}
