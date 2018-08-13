/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import {ICommandDefinition} from "../../../../../cmd";
import {join} from "path";

const pluginDescription =
  "The name of the plug-in to update.\n\n" +
  "If the plug-in argument is omitted, no action is taken.";

const registryDescription =
  "The npm registry that is used when installing remote packages. When this value is omitted, the " +
  "value returned by `npm config get registry` is used.\n" +
  "\n" +
  "For more information about npm registries, see: " +
  "https://docs.npmjs.com/misc/registry";

/**
 * Definition of the update command.
 * @type {ICommandDefinition}
 */
export const updateDefinition: ICommandDefinition = {
  name: "update",
  type: "command",
  summary: "update a plug-in",
  description: "Update plug-ins.",
  handler: join(__dirname, "update.handler"),
  positionals: [
    {
      name: "plugin...",
      type: "string",
      description: pluginDescription,
      required: false
    }
  ],
  options: [
    {
      name: "registry",
      type: "string",
      description: registryDescription,
      required: false
    }
  ],
  examples: [
    {
      description: "Update a plug-in",
      options    : "my-plugin"
    },
  ]
};
