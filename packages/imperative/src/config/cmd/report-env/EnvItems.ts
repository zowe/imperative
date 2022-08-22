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

/**
 * This enum represents the runtime environment items of interest.
 * These are more than just environment variables.
 * We will report on these items (and report on any detected problems)
 * in the order that the items are listed below.
 */
export enum ItemId {
    ZOWE_VER,
    NODEJS_VER,
    NPM_VER,
    NVM_VER,
    PLATFORM,
    ARCHITECTURE,
    ZOWE_CLI_HOME,
    ZOWE_APP_LOG_LEVEL,
    ZOWE_IMPERATIVE_LOG_LEVEL,
    OTHER_ZOWE_VARS,    // Zowe variables not listed above
    ZOWE_CONFIG_TYPE,   // detect if we have V1 profiles or V2 config
    ZOWE_PLUGINS
}

/**
 * This is the structure for defining a test to identify if a problem exists
 * for a given runtime environment item, and the message to give when the
 * problem is detected.
 */
export interface IProbTest {
    itemId: ItemId;
    probExpr: string;   // if probExpr evaluates to true, we have a problem
    probMsg: string;
}

// used in probTests below.
const logLevelExpr = "'{val}' != 'ALL' && '{val}' != 'TRACE' && '{val}' != 'DEBUG' && " +
    "'{val}' != 'INFO' && '{val}' != 'WARN' && '{val}' != 'ERROR' && " +
    "'{val}' != 'FATAL' && '{val}' != 'MARK' && '{val}' != 'OFF' && '{val}' != 'undefined'";

function formatLogLevelMsg(logTypeName: string) {
    return ` The ${logTypeName}  must be set to one of: ` +
    "ALL, TRACE, DEBUG, INFO, WARN, ERROR, FATAL, MARK, OFF";
}

/**
 * The tests to check for problems that we run for environmental items.
 * One ItemId can have multiple entries in the array, to check for
 * different problems.
 */
export const probTests: IProbTest[] = [
    {
        itemId: ItemId.ZOWE_VER,
        probExpr: "'{val}' == '0'",
        probMsg: "Zowe version must not be 0"
    },
    {
        itemId: ItemId.NODEJS_VER,
        probExpr: "semver.satisfies('{val}', '<10.0.0 || >=16.0.0')",
        probMsg: "Only NodeJS versions 10.x, 12.x, and 14.x are supported."
    },
    {
        itemId: ItemId.ZOWE_APP_LOG_LEVEL,
        probExpr: logLevelExpr,
        probMsg: formatLogLevelMsg("ZOWE_APP_LOG_LEVEL")
    },
    {
        itemId: ItemId.ZOWE_IMPERATIVE_LOG_LEVEL,
        probExpr: logLevelExpr,
        probMsg: formatLogLevelMsg("ZOWE_IMPERATIVE_LOG_LEVEL")
    }
];
