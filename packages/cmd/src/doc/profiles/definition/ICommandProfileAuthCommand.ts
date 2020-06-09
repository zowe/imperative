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

import { ICommandExampleDefinition, ICommandOptionDefinition } from "../../../..";

export interface ICommandProfileAuthCommand {
    /**
     * Command summary for help text
     */
    summary?: string;

    /**
     * Command description for help text
     */
    description?: string;

    /**
     * Command examples for help text
     */
    examples?: ICommandExampleDefinition[];

    /**
     * Additional command options
     */
    options?: ICommandOptionDefinition[];
}
