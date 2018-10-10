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

import {Arguments} from "yargs";
import {isNullOrUndefined} from "util";
import {ICommandDefinition} from "../doc/ICommandDefinition";
import {ICommandOptionDefinition} from "../doc/option/ICommandOptionDefinition";
import {Constants} from "../../../constants";
import {ImperativeError} from "../../../error";
import { CliUtils } from "../../../utilities/src/CliUtils";
import { ICommandArguments } from "../doc/args/ICommandArguments";

/**
 * Command tree entry describes an entry of a command in the full command tree - used when flattening the command
 * tree to build fully qualified commands for searching and display purposes
 */
export interface ICommandTreeEntry {
    command: ICommandDefinition;
    fullName: string;
    tree: ICommandDefinition;
}

/**
 * The command segment represents the "level" you are at in the command (for help generation)
 */
export type CommandSegment = "group" | "command";

/**
 * Command utility class. Place static utils for command processing here.
 */
export class CommandUtils {
    /**
     * Get a representation of the original command as issued by the user .with all canonical forms of options specified.
     * You only need to supply the "command" segement of your command. The "full command" (including previous groups, etc.)
     * is extracted from the yargs arguments object "_" property.
     * TODO: Replace "maincommand" below with the name of the bin - This is new to Imperative.
     * @param {yargs.Arguments} commandArguments - The Yargs style argument object. Requires the "_" (input argv)
     * @param {ICommandDefinition} commandDefinition - The command definition document
     * @returns {string} - The reconstructed command (as would have been issued on the console).
     */
    public static reconstructCommand(commandArguments: Arguments,
                                     commandDefinition: ICommandDefinition): string {
        let command = "";
        command += "maincommand"; // todo: get main bin name
        command += " " + commandArguments._.join(" ");

        const options = commandDefinition ? commandDefinition.options : [];
        const aliases = [];
        for (const option of options) {
            aliases.push(...option.aliases);
        }
        if (!isNullOrUndefined(commandDefinition.positionals)) {
            for (const positional of commandDefinition.positionals) {
                if (!isNullOrUndefined(commandArguments[positional.name])) {
                    command += " \"" + commandArguments[positional.name] + "\"";
                }
            }
        }
        for (const option of Object.keys(commandArguments)) {
            if (CommandUtils.optionWasSpecified(option, commandDefinition, commandArguments)) {
                // don't print "true" for boolean options
                command += " " + CliUtils.getDashFormOfOption(option) + " ";
                command += CommandUtils.getOptionDefinitionFromName(option, commandDefinition).type
                === "boolean" ? "" : commandArguments[option];
            }
        }
        return command.trim();
    }

    /**
     * Check if an option was specified by the user.
     * @param optionName - the option to check for.
     * @param {ICommandArguments["args"]} args: The arguments specified by the user.
     * @param {ICommandDefinition} commandDefinition - the definition for the command
     * @returns {boolean} true: the option was specified by the user.
     *                    false: the option was omitted/set to false
     */
    public static optionWasSpecified(optionName: string, commandDefinition: ICommandDefinition, args: ICommandArguments["args"]): boolean {
        const optionDef = CommandUtils.getOptionDefinitionFromName(optionName, commandDefinition);
        console.log(args);
        if (isNullOrUndefined(optionDef)) {
            // if it's not an option, it's not specified
            return false;
        }
        if ((optionDef.type as string) === "boolean") {
            return args[optionName] === true;
        }
        else {
            return !isNullOrUndefined(args[optionName]);
        }
    }

    /**
     * Find the option definition from the .options field of the command definition
     * @param {string} optionName
     * @param {ICommandDefinition} commandDefinition - the definition for the command
     * @returns {ICommandOptionDefinition} - if the optionName is an option,
     *                                             the definition of the option, otherwise undefined
     */
    public static getOptionDefinitionFromName(optionName: string,
                                              commandDefinition: ICommandDefinition) {
        let optionDef: ICommandOptionDefinition;
        if (!isNullOrUndefined(commandDefinition.options)) {
            for (const option of commandDefinition.options) {
                if (option.name === optionName) {
                    optionDef = option;
                    break;
                }
            }
        }
        return optionDef;
    }

    /**
     * Accepts the command definition document tree and flattens to a single level. This is used to make searching
     * commands and others easily.
     * @param {ICommandDefinition} tree - The command document tree
     * @return {ICommandTreeEntry[]} - The flattened document tree
     */
    public static flattenCommandTree(tree: ICommandDefinition): ICommandTreeEntry[] {
        const result: ICommandTreeEntry[] = [];
        const addChildAndDescendantsToSearch = (prefix: string, child: ICommandDefinition) => {
            result.push(
                {
                    fullName: prefix + child.name,
                    tree,
                    command: child
                });
            if (!isNullOrUndefined(child.children)) {
                for (const descendant of child.children) {
                    addChildAndDescendantsToSearch(prefix + child.name + " ", descendant);
                }
            }
        };
        addChildAndDescendantsToSearch("", tree);
        result.sort((a, b) => {
            return a.fullName.localeCompare(b.fullName);
        });
        return result;
    }

    /**
     * TODO - This needs to be well tested
     * TODO - There is a situation where two groups could have the same child command
     * TODO - It appears to choose the last in the list
     * @static
     * @param {ICommandDefinition} commandDef
     * @param {ICommandDefinition} commandTree
     * @returns {string}
     * @memberof CommandUtils
     */
    public static getFullCommandName(commandDef: ICommandDefinition,
                                     commandTree: ICommandDefinition): string {
        for (const treeEntry of CommandUtils.flattenCommandTree(commandTree)) {
            const def = treeEntry.command;
            if (def.name === commandDef.name &&
                def.description === commandDef.description &&
                def.handler === commandDef.handler) {
                return treeEntry.fullName;
            }
        }
        // otherwise, couldn't find it, just return the current name
        return commandDef.name;
    }
}
