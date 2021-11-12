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

import { Arguments } from "yargs";
import { EnvironmentalVariableSettings } from "../../imperative/src/env/EnvironmentalVariableSettings";
import { CliUtils } from "../../utilities/src/CliUtils";
import { ImperativeConfig } from "../../utilities/src/ImperativeConfig";
import * as lodash from "lodash";

export class LoggerUtils {
    public static readonly CENSOR_RESPONSE = "****";
    public static CENSORED_OPTIONS = ["auth", "p", "pass", "password", "passphrase", "credentials",
        "authentication", "basic-auth", "basicAuth", "tv", "token-value", "tokenValue",
        "cert-file-passphrase", "certFilePassphrase"];

    /**
     * Copy and censor any sensitive CLI arguments before logging/printing
     * @param {string[]} args
     * @returns {string[]}
     */
    public static censorCLIArgs(args: string[]): string[] {
        const newArgs: string[] = JSON.parse(JSON.stringify(args));
        const censoredValues = LoggerUtils.CENSORED_OPTIONS.map(CliUtils.getDashFormOfOption);
        for (const value of censoredValues) {
            if (args.indexOf(value) >= 0) {
                const valueIndex = args.indexOf(value);
                if (valueIndex < args.length - 1) {
                    newArgs[valueIndex + 1] = LoggerUtils.CENSOR_RESPONSE; // censor the argument after the option name
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
            if (LoggerUtils.CENSORED_OPTIONS.indexOf(optionName) >= 0) {
                const valueToCensor = newArgs[optionName];
                newArgs[optionName] = LoggerUtils.CENSOR_RESPONSE;
                for (const checkAliasKey of Object.keys(newArgs)) {
                    if (newArgs[checkAliasKey] === valueToCensor) {
                        newArgs[checkAliasKey] = LoggerUtils.CENSOR_RESPONSE;
                    }
                }
            }
        }
        return newArgs;
    }

    /**
     * Copy and censor any sensitive CLI arguments before logging/printing
     * @param {string} data
     * @returns {string}
     */
    public static censorRawData(data: string, category: string = ""): string {
        // Return the data if not using config
        if (!ImperativeConfig.instance.config?.exists) return data;

        // Return the data if we are printing to the console and masking is disabled
        const envMaskOutput = EnvironmentalVariableSettings.read(ImperativeConfig.instance.envVariablePrefix).maskOutput.value;
        // Hardcoding "console" instead of using Logger.DEFAULT_CONSOLE_NAME because of circular dependencies
        if (category === "console" && envMaskOutput.toUpperCase() === "FALSE") return data;

        let newData = data;
        const config = ImperativeConfig.instance.config;
        const layer = config.api.layers.get();
        const secProps = config.api.secure.secureFields();
        for (const prop of secProps) {
            const sec = lodash.get(layer.properties, prop);
            if (sec && !prop.endsWith(".user") && !prop.endsWith(".password") && !prop.endsWith(".tokenValue"))
                newData = newData.replace(new RegExp(sec, "gi"), LoggerUtils.CENSOR_RESPONSE);
        }
        return newData;
    }
}
