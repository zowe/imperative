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

/**
 * Options that will affect the behavior of the ProfileInfo class.
 * They are supplied on the ProfileInfo constructor.
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
}
