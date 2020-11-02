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

import { ICommandDefinition } from "../../../../../cmd";
import { join } from "path";

export const activeDefinition: ICommandDefinition = {
    name: "active",
    type: "command",
    handler: join(__dirname, "active.handler"),
    summary: "show active options",
    description: `Displays the set of active options.`,
    options: [
        {
            name: "profile",
            type: "string",
            description: "the name of a profile to load"
        }
    ]
};
