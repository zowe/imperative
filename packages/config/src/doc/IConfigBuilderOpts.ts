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

import { IConfig } from "./IConfig";
import { IProfileProperty } from "../../../profiles";

export interface IConfigBuilderOpts {
    /**
     * Specify true to populate default values for profile properties with the
     * `IProfileProperty.includeInTemplate` flag set to true.
     */
    populateProperties?: boolean;

    /**
     * Existing config properties that the new config will be merged with. If
     * set, the config builder skips prompting for properties that already have
     * values defined.
     */
    mergeConfig?: IConfig;

    /**
     * Callback that prompts the user to enter a value for a profile property.
     * The method will be called to populate missing values in the base profile.
     * It should return the value that the user entered, or null or undefined if the prompt was cancelled.
     * @param propName The name of the property
     * @param property The profile property definition
     */
    getValueBack? (propName: string, property: IProfileProperty): Promise<any>;
}
