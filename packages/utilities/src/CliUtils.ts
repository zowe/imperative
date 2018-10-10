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

import { isNullOrUndefined } from "util";
import { ImperativeError } from "../../error";
import { Constants } from "../../constants";
import { Arguments } from "yargs";
import { TextUtils } from "./TextUtils";
import { IOptionFormat } from "./doc/IOptionFormat";
import { Logger } from "../../logger";

/**
 * Cli Utils contains a set of static methods/helpers that are CLI related (forming options, censoring args, etc.)
 * @export
 * @class CliUtils
 */
export class CliUtils {
    /**
     * Used as the place holder when censoring arguments in messages/command output
     * @static
     * @memberof CliUtils
     */
    public static readonly CENSOR_RESPONSE = "****";

    /**
     * A list of cli options/keywords that should normally be sensored
     * @static
     * @memberof CliUtils
     */
    public static CENSORED_OPTIONS = ["auth", "p", "pass", "password", "passphrase", "credentials",
        "authentication", "basic-auth", "basicAuth"];

    /**
     * Get the 'dash form' of an option as it would appear in a user's command,
     * appending the proper number of dashes depending on the length of the option name
     * @param {string} optionName - e.g. my-option
     * @returns {string} - e.g. --my-option
     */
    public static getDashFormOfOption(optionName: string): string {
        if (!isNullOrUndefined(optionName) && optionName.length >= 1) {
            const dashes = optionName.length > 1 ? Constants.OPT_LONG_DASH : Constants.OPT_SHORT_DASH;
            return dashes + optionName;
        }
        else {
            throw new ImperativeError({
                msg: "A null or blank option was supplied. Please correct the option definition."
            });
        }
    }

    /**
     * Copy and censor any sensitive CLI arguments before logging/printing
     * @param {string[]} args - The args list to censor
     * @returns {string[]}
     */
    public static censorCLIArgs(args: string[]): string[] {
        const newArgs: string[] = JSON.parse(JSON.stringify(args));
        const censoredValues = CliUtils.CENSORED_OPTIONS.map(CliUtils.getDashFormOfOption);
        for (const value of censoredValues) {
            if (args.indexOf(value) >= 0) {
                const valueIndex = args.indexOf(value);
                if (valueIndex < args.length - 1) {
                    newArgs[valueIndex + 1] = CliUtils.CENSOR_RESPONSE; // censor the argument after the option name
                }
            }
        }
        return newArgs;
    }

    /**
     * Copy and censor a yargs argument object before logging
     * @param {yargs.Arguments} args the args to censor
     * @returns {yargs.Arguments}  a censored copy of the arguments
     */
    public static censorYargsArguments(args: Arguments): Arguments {
        const newArgs: Arguments = JSON.parse(JSON.stringify(args));

        for (const optionName of Object.keys(newArgs)) {
            if (CliUtils.CENSORED_OPTIONS.indexOf(optionName) >= 0) {
                const valueToCensor = newArgs[optionName];
                newArgs[optionName] = CliUtils.CENSOR_RESPONSE;
                for (const checkAliasKey of Object.keys(newArgs)) {
                    if (newArgs[checkAliasKey] === valueToCensor) {
                        newArgs[checkAliasKey] = CliUtils.CENSOR_RESPONSE;
                    }
                }
            }
        }
        return newArgs;
    }

    /**
     * Get the value of an environment variable associated with the specified option name.
     * The environment variable name will be formed by concatenating an environment name prefix,
     * the subCmdName, and the cmdOption using underscores as delimeters.
     *
     * The subCmdName and cmdOption name can be specified in camelCase or in kabab-style.
     * Regardless of the style, both will be converted to upper case
     * We replace dashes in Kabab-style values with underscores. We replace each uppercase
     * character in a camelCase value with underscore and that character.
     *
     * The envPrefix will be used exactly as specified.
     *
     * Example: The values myEnv-Prefix, some-command-name someOptionName would retrieve
     * the value of an environment variable named
     *      myEnv-Prefix_SOME_COMMAND_NAME_SOME_OPTION_NAME
     *
     * @param {string} envPrefix - The prefix for environment variables for this CLI.
     *      The value obtained by ImperativeConfig.getEnvVariablePrefix() will use the
     *      envVariablePrefix from the Imperative config object, and will use the
     *      rootCommandName as a fallback value.
     *
     * @param {string} subCmdName - The name of the 1st-level sub-command that is being run.
     *
     * @param {string} cmdOption - The name of the option in either camelCase or kabab-style.
     *
     * @returns {string | null} - The value of the environment variable which corresponds
     *      to the supplied option for the supplied command. If no such environment variable
     *      exists we return null.
     *
     * @memberof CliUtils
     */
    public static getEnvValForOption(
        envPrefix: string, subCmdName: string, cmdOption: string
    ): string | null
    {
        const cmdNmChoices: IOptionFormat = CliUtils.getOptionFormat(subCmdName);
        const optChoices: IOptionFormat = CliUtils.getOptionFormat(cmdOption);

        // Form envPrefix, subCmdName, and option into an environment variable
        const envDelim = "_";
        let envVarName = cmdNmChoices.kebabCase + envDelim + optChoices.kebabCase;
        envVarName = envPrefix + envDelim + envVarName.toUpperCase().replace(/-/g, envDelim);

        // Get the value of the environment variable
        if (process.env.hasOwnProperty(envVarName)) {
            return process.env[envVarName];
        }

        // no corresponding environment variable exists
        return null;
    }

    /**
     * Constructs the yargs style positional argument string.
     * @static
     * @param {boolean} positionalRequired - Indicates that this positional is required
     * @param {string} positionalName - The name of the positional
     * @returns {string} - The yargs style positional argument string (e.g. <name>);
     * @memberof CliUtils
     */
    public static getPositionalSyntaxString(positionalRequired: boolean, positionalName: string): string {
        const leftChar = positionalRequired ? "<" : "[";
        const rightChar = positionalRequired ? ">" : "]";
        return leftChar + positionalName + rightChar;
    }

    /**
     * Format the help header - normally used in help generation etc.
     * @static
     * @param {string} header
     * @param {string} [indent=" "]
     * @param {string} color
     * @returns {string}
     * @memberof CliUtils
     */
    public static formatHelpHeader(header: string, indent: string = " ", color: string): string {
        if (isNullOrUndefined(header) || header.trim().length === 0) {
            throw new ImperativeError({
                msg: "Null or empty header provided; could not be formatted."
            });
        }
        const numDashes = header.length + 1;
        const headerText = TextUtils.formatMessage("{{indent}}{{headerText}}\n{{indent}}{{dashes}}",
            { headerText: header.toUpperCase(), dashes: Array(numDashes).join("-"), indent });
        return TextUtils.chalk[color](headerText);
    }

    /**
     * Takes a key and converts it to both camelCase and kebab-case.
     *
     * @param key The key to transform
     *
     * @returns An object that contains the new format.
     *
     * @example <caption>Conversion of keys</caption>
     *
     * CliUtils.getOptionFormat("helloWorld");
     *
     * // returns
     * const return1 = {
     *     key: "helloWorld",
     *     camelCase: "helloWorld",
     *     kebabCase: "hello-world"
     * }
     *
     * /////////////////////////////////////////////////////
     *
     * CliUtils.getOptionFormat("hello-world");
     *
     * // returns
     * const return2 = {
     *     key: "hello-world",
     *     camelCase: "helloWorld",
     *     kebabCase: "hello-world"
     * }
     *
     * /////////////////////////////////////////////////////
     *
     * CliUtils.getOptionFormat("hello--------world");
     *
     * // returns
     * const return3 = {
     *     key: "hello--------world",
     *     camelCase: "helloWorld",
     *     kebabCase: "hello-world"
     * }
     *
     * /////////////////////////////////////////////////////
     *
     * CliUtils.getOptionFormat("hello-World-");
     *
     * // returns
     * const return4 = {
     *     key: "hello-World-",
     *     camelCase: "helloWorld",
     *     kebabCase: "hello-world"
     * }
     */
    public static getOptionFormat(key: string): IOptionFormat {
        return {
            camelCase: key.replace(/(-+\w?)/g, (match, p1) => {
                /*
                 * Regular expression checks for 1 or more "-" characters followed by 0 or 1 word character
                 * The last character in each match is converted to upper case and returned only if it
                 * isn't equal to "-"
                 *
                 * Examples: (input -> output)
                 *
                 * - helloWorld         -> helloWorld
                 * - hello-world        -> helloWorld
                 * - hello--------world -> helloWorld
                 * - hello-World-       -> helloWorld
                 */
                const returnChar = p1.substr(-1).toUpperCase();
                return  returnChar !== "-" ? returnChar : "";
            }),
            kebabCase: key.replace(/(-*[A-Z]|-{2,}|-$)/g, (match, p1, offset, inputString) => {
                /*
                 * Regular expression matches the following:
                 *
                 * 1. Any string segment containing 0 or more "-" characters followed by any uppercase letter.
                 * 2. Any string segment containing 2 or more consecutive "-" characters
                 * 3. Any string segment where the last character is "-"
                 *
                 * Matches for 1.
                 *
                 * - "A"           -> If condition 1.2
                 * - "-B"          -> If condition 2.2
                 * - "------C"     -> If condition 2.2
                 *
                 * Matches for 2.
                 *
                 * - "--"          -> If condition 2.1.1
                 * - "-------"     -> If condition 2.1.1 or 2.1.2
                 *
                 * 2.1.1 will be entered if the match is the last sequence of the string
                 * 2.1.2 will be entered if the match is not the last sequence of the string
                 *
                 * Matches for 3.
                 * - "-<end_of_string>" -> If condition 1.1
                 *
                 * Examples: (input -> output)
                 *
                 * - helloWorld         -> hello-world
                 * - hello-world        -> hello-world
                 * - hello--------world -> hello-world
                 * - hello-World-       -> hello-world
                 */

                if (p1.length === 1) {                                          // 1
                    if (p1 === "-") {                                           // 1.1
                        // Strip trailing -
                        return "";
                    } else {                                                    // 1.2
                        // Change "letter" to "-letter"
                        return "-" + p1.toLowerCase();
                    }
                } else {                                                        // 2
                    const returnChar = p1.substr(-1); // Get the last character of the sequence

                    if (returnChar === "-") {                                   // 2.1
                        if (offset + p1.length === inputString.length) {        // 2.1.1
                            // Strip a trailing -------- sequence
                            return "";
                        } else {                                                // 2.1.2
                            // Change a sequence of -------- to a -
                            return "-";
                        }
                    } else {                                                    // 2.2
                        // Change a sequence of "-------letter" to "-letter"
                        return "-" + returnChar.toLowerCase();
                    }
                }
            }),
            key
        };
    }
}
