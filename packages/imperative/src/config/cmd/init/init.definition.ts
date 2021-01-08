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
import { ImperativeConfig } from "../../../../../utilities";

/**
 * Definition of the init command.
 * @type {ICommandDefinition}
 */
export const initDefinition: ICommandDefinition = {
    name: "init",
    type: "command",
    handler: join(__dirname, "init.handler"),
    summary: "init config files",
    description: `Initialize config files. Defaults to initializing "${ImperativeConfig.instance.rootCommandName}.config.json" in the current ` +
        `working directory unless otherwise specified.\n\nUse "--user" to init "${ImperativeConfig.instance.rootCommandName}.config.user.json". ` +
        `Use "--global" to initialize the configuration files in your home "~/.zowe" directory.\n\nUse "--no-prompt" to skip prompting for values` +
        `in a CI environment.`,
    options: [
        {
            name: "global",
            description: "Target the global config files.",
            aliases: ["g"],
            type: "boolean",
            defaultValue: false
        },
        {
            name: "user",
            description: "Target the user config files.",
            type: "boolean",
            defaultValue: false
        },
        // {
        //     name: "url",
        //     description: "Downloads the configuration file specified by the URL.",
        //     type: "string"
        // },
        // {
        //     name: "default",
        //     description: "When creating a profile of a specified type (--type <type>), applies default values from the profile schema.",
        //     type: "boolean",
        //     defaultValue: false
        // },
        // {
        //     name: "profile",
        //     description: "Create a profile of the specified name. You may also specify a profile \"path\" (e.g. host1.service1.details1).",
        //     type: "string",
        // },
        // {
        //     name: "type",
        //     description: "Create a profile of the specified type. You will be prompted for values based on the profile schema (definition).",
        //     type: "string",
        // },
        // {
        //     // TODO Should this be removed if it is unused?
        //     name: "template",
        //     description: "apply a type as a template to guide creation.",
        //     type: "string"
        // },
        // {
        //     name: "update",
        //     description: "update the config if it already exists.",
        //     type: "boolean",
        //     defaultValue: false
        // },
        // {
        //     name: "set-default",
        //     description: "when profiles are created, set them as the default.",
        //     type: "boolean",
        //     defaultValue: false
        // },
        {
            name: "prompt",
            description: "Prompt for secure values. Useful for disabling prompting in CI environments.",
            type: "boolean",
            defaultValue: true
        }
    ]
};
