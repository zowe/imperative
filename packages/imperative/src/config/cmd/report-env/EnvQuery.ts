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
        const getResult: IGetItemVal = { itemVal: null, itemValMsg: "No value", itemProbMsg: "" };
        switch(itemId) {
            case ItemId.ZOWE_VER: {
                getResult.itemVal = "0";
                getResult.itemValMsg = "Zowe CLI version = " + getResult.itemVal;
                break;
            }
            case ItemId.NODEJS_VER: {
                getResult.itemVal = "17.5.0";
                getResult.itemValMsg = "NodeJS version = " + getResult.itemVal;
                break;
            }
            case ItemId.NPM_VER: {
                getResult.itemVal = "2222";
                getResult.itemValMsg = "MPM version = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_CONFIG_TYPE: {
                getResult.itemVal = "Team config";
                getResult.itemValMsg = "Zowe Config type = " + getResult.itemVal + ". Location = who knows?";
                break;
            }
            case ItemId.ZOWE_CLI_HOME: {
                getResult.itemVal = "Your/homedir/.zowe";
                getResult.itemValMsg = "ZOWE_CLI_HOME = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_APP_LOG_LEVEL: {
                getResult.itemVal = "WARN";
                getResult.itemValMsg = "ZOWE_APP_LOG_LEVEL = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_IMPERATIVE_LOG_LEVEL: {
                getResult.itemVal = "ERROR";
                getResult.itemValMsg = "ZOWE_IMPERATIVE_LOG_LEVEL = " + getResult.itemVal;
                break;
            }
            case ItemId.ZOWE_PLUGINS: {
                getResult.itemValMsg = "ZOWE_PLUGINS : Lots of text";
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
}
