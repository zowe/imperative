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

import { CliUtils } from "../../../utilities";
import { ICommandArguments, IHandlerResponseApi } from "../../../cmd";
import { ImperativeError } from "../../../error";
import { ISession } from "./doc/ISession";
import { Logger } from "../../../logger";
import { Session } from "./Session";
import * as SessConstants from "./SessConstants";

/**
 * This class creates a session configuration object for making
 * REST API calls with the Imperative RestClient.
 */
export class CredsForSesscfg {

    // ***********************************************************************
    /**
     * Create a REST session configuration object starting with the supplied
     * initialSessCfg and retrieving credential properties from the command
     * line arguments (or environment, or profile). Failing that, we
     * interactively prompt the user for user name and password.
     * The possible credential properties are:
     *      user
     *      password
     *      type
     *      tokenType
     *      tokenValue
     *
     * @param initialSessCfg
     *        An initial session configuration (like ISession, or other
     *        specially defined configuration) that contains the appropriate
     *        session configuration properties.
     *
     * @param cmdArgs
     *        The arguments specified by the user on the command line
     *        (or in environment, or in profile)
     *
     * @param forceUserPass
     *        When true, we force the use of user and password.
     *        This applies during a login command, or after a token
     *        has failed to authenticate because it has expired.
     *
     * @returns A session configuration object with credentials added
     *          to the initialSessCfg. Its intended use is for our
     *          caller to create a session for a REST Client
     */
    public static async addCredsOrPrompt<T>(
        initialSessCfg: T,
        cmdArgs: ICommandArguments,
        forceUserPass: boolean = false
    ): Promise<T> {
        const impLogger = Logger.getImperativeLogger();

        // initialize session config object
        const finalSessCfg: any = initialSessCfg;

        // confirm which credential properties were supplied by user
        let tokenValExists = false;
        let tokenTypeExists = false;
        let userExists = false;
        let passExists = false;
        if (cmdArgs.tokenValue !== undefined &&
            cmdArgs.tokenValue !== null &&
            cmdArgs.tokenValue.length > 0)
        {
            tokenValExists = true;
        }
        if (cmdArgs.tokenType !== undefined &&
            cmdArgs.tokenType !== null &&
            cmdArgs.tokenType.length > 0)
        {
            tokenTypeExists = true;
        }
        if (cmdArgs.user !== undefined &&
            cmdArgs.user !== null &&
            cmdArgs.user.length > 0)
        {
            userExists = true;
        }
        if (cmdArgs.password !== undefined &&
            cmdArgs.password !== null &&
            cmdArgs.password.length > 0)
        {
            passExists = true;
        }

        // set credential values from cmdLine (or environment, or profile)
        if (forceUserPass) {
            // ignoring tokenValue, will ensure that user & password are used for authentication
            tokenValExists = false;
        }

        // We try to use the token if it is available
        if (tokenValExists) {
            impLogger.debug("Using token authentication");
            finalSessCfg.tokenValue = cmdArgs.tokenValue;
            if (tokenTypeExists) {
                finalSessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
                finalSessCfg.tokenType = cmdArgs.tokenType;
            } else {
                // When no tokenType supplied, user wants bearer
                finalSessCfg.type = SessConstants.AUTH_TYPE_BEARER;
            }
        } else { // we will use user and password
            if (tokenTypeExists) {
                /* When we have no token value but we have a tokenType,
                 * authenticate with basic auth and get a token.
                 */
                impLogger.debug("Using basic authentication to get token");
                finalSessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
                finalSessCfg.tokenType = cmdArgs.tokenType;
            } else {
                impLogger.debug("Using basic authentication with no request for token");
                finalSessCfg.type = SessConstants.AUTH_TYPE_BASIC;
            }

            if (userExists) {
                finalSessCfg.user = cmdArgs.user;
            } else {
                let answer = "";
                while (answer === "") {
                    answer = await CliUtils.promptWithTimeout(
                        "Authentication required. Enter user name: "
                    );
                    if (answer === null) {
                        throw new ImperativeError({msg: "We timed-out waiting for user name."});
                    }
                }
                finalSessCfg.user = answer;
            }

            if (passExists) {
                finalSessCfg.password = cmdArgs.password;
            } else {
                let answer = "";
                while (answer === "") {
                    answer = await CliUtils.promptWithTimeout(
                        "Authentication required. Enter password : ",
                        true
                    );
                    if (answer === null) {
                        throw new ImperativeError({msg: "We timed-out waiting for password."});
                    }
                }
                finalSessCfg.password = answer;
            }
        }

        // obscure the password for displaying in the log, then restore it before creating session
        let realPass: string;
        if (finalSessCfg.password) {
            realPass = finalSessCfg.password;
            finalSessCfg.password = "Password_is_hidden";
        }
        impLogger.debug("Creating a session config with these properties:\n" +
            JSON.stringify(finalSessCfg, null, 2)
        );
        if (finalSessCfg.password) {
            finalSessCfg.password = realPass;
        }

        return finalSessCfg;
    }
}
