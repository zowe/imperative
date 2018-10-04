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
     * CliUtils.getOptionFormat("this-is-a-test");
     *
     * // returns
     * const return1 = {
     *     key: "this-is-a-test",
     *     camelCase: "thisIsATest",
     *     kebabCase: "this-is-a-test"
     * }
     *
     * /////////////////////////////////////////////////////
     *
     * CliUtils.getOptionFormat("thisIsATest");
     *
     * // returns
     * const return2 = {
     *     key: "thisIsATest",
     *     camelCase: "thisIsATest",
     *     kebabCase: "this-is-a-test"
     * }
     *
     * /////////////////////////////////////////////////////
     *
     * CliUtils.getOptionFormat("thisIsATest-hello-world");
     *
     * // returns
     * const return3 = {
     *     key: "thisIsATest-hello-world",
     *     camelCase: "thisIsATestHelloWorld",
     *     kebabCase: "this-is-a-test-hello-world"
     * }
     */
    public static getOptionFormat(key: string): IOptionFormat {
        return {
            camelCase: key.replace(/(-+\w?)/g, (match, p1) => {
                const returnChar = p1.substr(-1).toUpperCase();
                return  returnChar !== "-" ? returnChar : "";
            }),
            kebabCase: key.replace(/(-*[A-Z]|-{2,}|-$)/g, (match, p1, offset, inputString) => {
                if (p1.length === 1) {
                    if (p1 === "-") {
                        // Strip trailing -
                        return "";
                    } else {
                        // Change "letter" to "-letter"
                        return "-" + p1.toLowerCase();
                    }
                } else {
                    const returnChar = p1.substr(-1); // Get the last character of the sequence

                    if (returnChar === "-") {
                        if (offset + p1.length === inputString.length) {
                            // Strip a trailing -------- sequence
                            return "";
                        } else {
                            // Change a sequence of -------- to a -
                            return "-";
                        }
                    } else {
                        // Change a sequence of "-------letter" to "-letter"
                        return "-" + returnChar.toLowerCase();
                    }
                }
            }),
            key
        };
    }
}
