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

import { IProfArgValue } from "./IProfArgAttrs";
import { IProfMergedArg } from "./IProfMergedArg";

/**
 * Required options to update any property from the ProfileInfo class.
 */
export interface IProfInfoUpdatePropOpts  {
    /**
     * Property to update
     */
    property: string;

    /**
     * Value to use when updating the given property
     */
    value: IProfArgValue;

    /**
     * Type of the active profile
     */
    profileType: string;

    /**
     * Name of the active profile
     */
    profileName: string;

    /**
     * Specifies if the property should be stored securely or not
     */
    setSecure?: boolean;
}

/**
 * Required options to update known properties from the ProfileInfo class.
 */
export interface IProfInfoUpdateKnownPropOpts  {
    /**
     * Merged arguments object describing the location of the property to update
     */
    mergedArgs: IProfMergedArg;

    /**
     * Property to update
     */
    property: string;

    /**
     * Value to use when updating the given property
     */
    value: IProfArgValue;

    /**
     * Specifies if the property should be stored securely or not
     */
    setSecure?: boolean;
}
