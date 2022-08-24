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

import * as path from "path";
import { spawnSync, StdioOptions } from "child_process";

import { ImperativeConfig, TextUtils} from "../../../../../utilities";
import { ItemId, IProbTest, probTests } from "./EnvItems";

/**
 * This interface represents the result from getEnvItemVal().
 */
export interface IGetItemVal {
    itemVal: string;        // Value of the item. Null when we cannot get the value.
    itemValMsg: string;     // Message to display the item's value.
    itemProbMsg: string;    /* Message to display any problems with the value.
                             * Empty string (length 0) when there are no problems.
                             */
}

/**
 * This class encapulates operations for Zowe CLI environment information.
 * We use the term environment loosely. Sometimes it is an environment variable.
 * It can also be something in the runtime environment, like version of NodeJS.
 */
export class EnvQuery {
    // __________________________________________________________________________
    /**
     * For the specified itemId, get its value.
     *
     * @param itemId ID of the environmental item for which we want get the value.
     * @returns A string with the value of the item.
     */
    public static getEnvItemVal(itemId: ItemId): IGetItemVal {
        const os = require("os");
        const getResult: IGetItemVal = { itemVal: null, itemValMsg: "", itemProbMsg: "" };
        switch(itemId) {
            case ItemId.ZOWE_VER: {
                this.getZoweVer(getResult);
                break;
            }
            case ItemId.NODEJS_VER: {
                getResult.itemVal = process.versions.node;
                getResult.itemValMsg = "NodeJS version = " + getResult.itemVal;
                break;
            }
            case ItemId.NPM_VER: {
                getResult.itemVal = this.getCmdOutput("npm", ["--version"]);
                getResult.itemValMsg = "NPM version = " + getResult.itemVal;
                break;
            }
            case ItemId.NVM_VER: {
                getResult.itemVal = this.getCmdOutput("nvm", ["version"]);
                getResult.itemValMsg = "Node Version Manager version = " + getResult.itemVal;
                break;
            }
            case ItemId.PLATFORM: {
                getResult.itemVal = os.platform();
                getResult.itemValMsg = "O.S. platform = " + getResult.itemVal;
                break;
            }
            case ItemId.ARCHITECTURE: {
                getResult.itemVal = os.arch();
                getResult.itemValMsg = "O.S. architecture = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_CLI_HOME: {
                getResult.itemVal = process.env.ZOWE_CLI_HOME;
                if (getResult.itemVal === undefined) {
                    getResult.itemVal += "   Default = " + path.normalize(ImperativeConfig.instance.cliHome);
                }
                getResult.itemValMsg = "\nZOWE_CLI_HOME = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_APP_LOG_LEVEL: {
                getResult.itemVal = process.env.ZOWE_APP_LOG_LEVEL;
                getResult.itemValMsg = "ZOWE_APP_LOG_LEVEL = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_IMPERATIVE_LOG_LEVEL: {
                getResult.itemVal = process.env.ZOWE_IMPERATIVE_LOG_LEVEL;
                getResult.itemValMsg = "ZOWE_IMPERATIVE_LOG_LEVEL = " + getResult.itemVal;
                break;
            }
            case ItemId.OTHER_ZOWE_VARS: {
                this.getOtherZoweEnvVars(getResult);
                break;
            }
            case ItemId.ZOWE_CONFIG_TYPE: {
                this.getConfigInfo(getResult);
                break;
            }
            case ItemId.ZOWE_PLUGINS: {
                getResult.itemValMsg = this.getCmdOutput("zowe", ["plugins", "list"]);
                break;
            }
            default: {
                getResult.itemProbMsg = "An unknown item ID was supplied = " + itemId;
                return getResult;
            }
        }

        getResult.itemProbMsg = this.getEnvItemProblems(itemId, getResult.itemVal);
        return getResult;
    }

    // __________________________________________________________________________
    /**
     * For the specified itemId, get any known problems.
     *
     * @param itemId ID of the environmental item for which we want to detect problems.
     * @param itemVal The value of the environmental item.
     * @returns A string with a message about the problems. An empty string if no problems are detected.
     */
    private static getEnvItemProblems(itemId: ItemId, itemVal: string): string {
        let probMsgs: string = "";
        for (const nextProbTest of probTests) {
            if (itemId == nextProbTest.itemId) {
                if (EnvQuery.detectProbVal(itemVal, nextProbTest)) {
                    if (probMsgs.length > 0) {
                        probMsgs += "\n";
                    }
                    probMsgs += nextProbTest.probMsg;
                }
            }
        }
        return probMsgs;
    }

    // __________________________________________________________________________
    /**
     * Detect if a specified problem test finds a problem for the specified value.
     *
     * @param itemVal The value of the environmental item.
     * @param probTest A problem test to be evaluated.
     *
     * @returns True if we find a problem. False otherwise.
     */
    private static detectProbVal(value: string, probTest: IProbTest): boolean {
        /* eslint-disable unused-imports/no-unused-vars */
        const semver = require('semver');
        const probExprWithVals = probTest.probExpr.replaceAll("{val}", value);
        return eval(probExprWithVals);
    }

    // __________________________________________________________________________
    /**
     * Get the Zowe version number.
     *
     * @param getResult The itemVal and itemValMsg properties are filled
     *                  by this function.
     */
    private static getZoweVer(getResult: IGetItemVal): void {
        const cliPackageJson: any = ImperativeConfig.instance.callerPackageJson;
        if (Object.prototype.hasOwnProperty.call(cliPackageJson, "version")) {
            getResult.itemVal = cliPackageJson.version;
        }
        else {
            getResult.itemVal = "No version found in CLI package.json!";
        }
        getResult.itemValMsg = "Zowe CLI version = " + getResult.itemVal;
    }

    // __________________________________________________________________________
    /**
     * Get information about the Zowe configuration.
     *
     * @param getResult The itemVal and itemValMsg properties are filled
     *                  by this function.
     */
    private static getConfigInfo(getResult: IGetItemVal): void {
        const teamCfg: string = "V2 Team Config";
        const v1Profiles = "V1 Profiles";
        if (ImperativeConfig.instance.config?.exists) {
            getResult.itemVal = teamCfg;
        } else {
            getResult.itemVal = v1Profiles;
        }
        getResult.itemValMsg =  "\nZowe Config type = " + getResult.itemVal;
    }

    // __________________________________________________________________________
    /**
     * Run a command that displays output.
     *
     * @param cmdToRun The command name to be run.
     * @param args The arguments to the command.
     *
     * @return The output of the command.
     */
    private static getCmdOutput(cmdToRun: string, args: string[]): string {
        let cmdOutput: string = "";
        const ioOpts: StdioOptions = ["pipe", "pipe", "pipe"];
        try {
            const spawnResult = spawnSync(cmdToRun, args, {
                stdio: ioOpts,
                shell: true
            });
            if (spawnResult.stdout && spawnResult.stdout.length > 0) {
                // remove any trailing newline from the output
                cmdOutput = spawnResult.stdout.toString();
            } else {
                cmdOutput = cmdToRun + " does not appear to be installed.";
                if (spawnResult.stderr) {
                    cmdOutput += "\nReason = " + spawnResult.stderr.toString();
                }
            }
        } catch (err) {
            cmdOutput = "Failed to run commmand = " + cmdToRun + " " + args.join(" ");
            if (err.message) {
                cmdOutput += "\nDetails = " + err.message;
            }
            cmdOutput = TextUtils.chalk.red(cmdOutput);
        }

        // remove any trailing newline from the output
        cmdOutput = cmdOutput.replace(/(\r?\n|\r)$/, "");

        if (cmdOutput.length == 0) {
            cmdOutput = "Failed to get any information from " + cmdToRun + " " + args.join(" ");
        }
        return cmdOutput;
    }

    // __________________________________________________________________________
    /**
     * Get other Zowe variables, beyond the ones we check for problem values.
     *
     * @param getResult The itemValMsg property is filled by this function.
     *                  The itemVal property is given no value by this function.
     */
    private static getOtherZoweEnvVars(getResult: IGetItemVal): void {
        getResult.itemValMsg = "";
        const envVars = process.env;
        for (const nextVar of Object.keys(envVars)) {
            if (nextVar.startsWith("ZOWE_") && nextVar != "ZOWE_CLI_HOME" &&
                nextVar != "ZOWE_APP_LOG_LEVEL" && nextVar != "ZOWE_IMPERATIVE_LOG_LEVEL")
            {
                getResult.itemValMsg += nextVar + " = " ;
                if (nextVar.toUpperCase().includes("PASSWORD") ||
                    nextVar.toUpperCase().includes("TOKEN"))
                {
                    getResult.itemValMsg += "******";
                } else {
                    getResult.itemValMsg += envVars[nextVar];

                }
                getResult.itemValMsg += "\n";
            }
        }

        // remove the last newline
        getResult.itemValMsg = getResult.itemValMsg.replace(/(\r?\n|\r)$/, "");
        if (getResult.itemValMsg.length == 0) {
            getResult.itemValMsg += "No other 'ZOWE_' variables have been set.";
        }
    }}
