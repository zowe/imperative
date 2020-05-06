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
import {isBoolean} from "util";

/**
 * A Session class that will prompt for credentials
 * when it detects that they are missing.
 *
 * We contain a Session instead of extending a Session, because
 * we must construct the session in an async function, to allow
 * our caller to wait for any required prompting.
 */
export class PromptingSession {

    // ***********************************************************************
    /**
     * Create a REST Client Session from command line arguments. Prompt for
     * credentials if they are not specified in the command line arguments.
     *
     * @param cmdArgs
     *        The arguments specified by the user on the command line
     *        (or in environment, or in profile)
     *
     * @param cmdResp
     *        A command response object for displaying a message.
     *
     * @param forceUserPass
     *        When true, we force the use of user and password.
     *        This applies during a login command, or after a token
     *        has failed to authenticate because it has expired.
     *
     * @returns {Session} - A session for usage in the z/OSMF REST Client
     */
    public static async createSessFromCmdArgsOrPrompt(
        cmdArgs: ICommandArguments,
        cmdResp: IHandlerResponseApi,
        forceUserPass: boolean
    ): Promise<Session> {
        const impLogger = Logger.getImperativeLogger();

        // initialize iSess object with values from cmdLine (or environment, or profile)
        const iSessObj: ISession = {
            hostname: cmdArgs.host,
            port: cmdArgs.port,
            rejectUnauthorized: cmdArgs.rejectUnauthorized,
            basePath: cmdArgs.basePath,
        };

        // confirm which properties were supplied by user
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

        if (forceUserPass) {
            // ignoring tokenValue, will ensure that user & password are used for authentication
            tokenValExists = false;
        }

        // We try to use the token if it is available
        if (tokenValExists) {
            impLogger.debug("Using token authentication");
            iSessObj.tokenValue = cmdArgs.tokenValue;
            if (tokenTypeExists) {
                iSessObj.type = SessConstants.AUTH_TYPE_TOKEN;
                iSessObj.tokenType = cmdArgs.tokenType;
            } else {
                // When no tokenType supplied, user wants bearer
                iSessObj.type = SessConstants.AUTH_TYPE_BEARER;
            }
        } else { // we will use user and password
            if (tokenTypeExists) {
                /* When we have no token value but we have a tokenType,
                 * authenticate with basic auth and get a token.
                 */
                impLogger.debug("Using basic authentication to get token");
                iSessObj.type = SessConstants.AUTH_TYPE_TOKEN;
                iSessObj.tokenType = cmdArgs.tokenType;
            } else {
                impLogger.debug("Using basic authentication with no request for token");
                iSessObj.type = SessConstants.AUTH_TYPE_BASIC;
            }

            if (userExists) {
                iSessObj.user = cmdArgs.user;
            } else {
                let answer = "";
                while (answer === "") {
                    answer = await CliUtils.promptWithTimeout(
                        "User name required for authentication. Enter user name: "
                    );
                    if (answer === null) {
                        throw new ImperativeError({msg: "We timed-out waiting for user name."});
                    }
                }
                iSessObj.user = answer;
            }

            if (passExists) {
                iSessObj.password = cmdArgs.password;
            } else {
                let answer = "";
                while (answer === "") {
                    answer = await CliUtils.promptWithTimeout(
                        "Password  required for authentication. Enter password : ",
                        true
                    );
                    if (answer === null) {
                        throw new ImperativeError({msg: "We timed-out waiting for password."});
                    }
                }
                iSessObj.password = answer;
            }
        }

        // obscure the password for displaying in the log, then restore it before creating session
        let realPass: string;
        if (iSessObj.password) {
            realPass = iSessObj.password;
            iSessObj.password = "Password_is_hidden";
        }
        impLogger.debug("Creating a session with these properties:\n" +
            JSON.stringify(iSessObj, null, 2)
        );
        if (iSessObj.password) {
            iSessObj.password = realPass;
        }

        return new Session(iSessObj);
    }
}
