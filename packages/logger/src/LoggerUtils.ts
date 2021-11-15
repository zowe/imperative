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
import { Config } from "../../config/src/Config";
import { IConfigLayer } from "../../config/src/doc/IConfigLayer";
import { ICommandProfileTypeConfiguration } from "../../cmd/src/doc/profiles/definition/ICommandProfileTypeConfiguration";

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
     * Singleton implementation of an internal reference of ImperativeConfig.instance.config
     */
    private static mConfig: Config = null;
    private static get config(): Config {
        if (LoggerUtils.mConfig == null) LoggerUtils.mConfig = ImperativeConfig.instance.config;
        return LoggerUtils.mConfig;
    }

    /**
     * Singleton implementation of an internal reference to the active layer
     * This should help with performance since one a single copy will be created for censoring data
     */
    private static mLayer: IConfigLayer = null;
    private static get layer(): IConfigLayer {
        // if (LoggerUtils.mLayer == null) LoggerUtils.mLayer = LoggerUtils.config.api.layers.get();
        // Have to get a new copy every time because of how secure properties get lazy-loaded
        LoggerUtils.mLayer = LoggerUtils.config.api.layers.get();
        return LoggerUtils.mLayer;
    }

    /**
     * Singleton implementation of an internal reference to the secure fields stored in the config
     */
    private static mSecureFields: string[] = null;
    private static get secureFields(): string[] {
        if (LoggerUtils.mSecureFields == null) LoggerUtils.mSecureFields = LoggerUtils.config.api.secure.secureFields();
        return LoggerUtils.mSecureFields;
    }

    /**
     * Singleton implementation of an internal reference to the loaded profiles
     */
    private static mProfiles: ICommandProfileTypeConfiguration[] = null;
    private static get profiles(): ICommandProfileTypeConfiguration[] {
        if (LoggerUtils.mProfiles == null) LoggerUtils.mProfiles = ImperativeConfig.instance.loadedConfig.profiles ?? [];
        return LoggerUtils.mProfiles;
    }

    /**
     * Specifies whether a given property path (e.g. "profiles.lpar1.properties.host") is a special value or not.
     * Special value: Refers to any value defined as secure in the schema definition.
     *                These values should be already masked by the application (and/or plugin) developer.
     * @param prop Property path to determine if it is a special value
     * @returns True - if the given property is to be treated as a special value; False - otherwise
     */
    public static isSpecialValue = (prop: string): boolean => {
        // Others: token, job_load, job_pmahlq
        const specialValues = ["user", "password", "tokenValue", "keyPassphrase"];
        // TODO: add special values based on secure properties in:
        // - meta (imperative config object from plugins)
        // - schema.json

        for (const profile of LoggerUtils.profiles) {

        }

        // TODO: How to handle DNS resolution (using a wrong port)
        //  ex: zowe jobs list jobs --port 12345
        //      May print the IP address of the given host if the resolved IP:port combination is not valid

        for (const v of specialValues) {
            if (prop.endsWith(`.${v}`)) return true;
        }
        return false;
    };

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
        if ((category === "console" || category === "json") && envMaskOutput.toUpperCase() === "FALSE") return data;

        let newData = data;
        const layer = LoggerUtils.layer;
        for (const prop of LoggerUtils.secureFields) {
            const sec = lodash.get(layer.properties, prop);
            if (sec && !LoggerUtils.isSpecialValue(prop)) newData = newData.replace(new RegExp(sec, "gi"), LoggerUtils.CENSOR_RESPONSE);
        }
        return newData;
    }
}
