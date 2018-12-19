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

/**
 * Definition of the list command.
 * @type {ICommandDefinition}
 */
export const setDefinition: ICommandDefinition = {
  name: "set",
  type: "command",
  handler: join(__dirname, "set.common.handler"),
  summary: "Set configuration items",
  description: "Set configuration items for Imperative CLI",
  positionals: [
    {
      name: "configName",
      type: "string",
      description: "Setting name",
      required: true
    },
    {
      name: "configValue",
      type: "string",
      description: "Value to set",
      required: true
    },
  ]
};
