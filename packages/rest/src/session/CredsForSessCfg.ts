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
import { ICommandArguments } from "../../../cmd";
import { ImperativeError } from "../../../error";
import { IOptionsForAddCreds } from "./doc/IOptionsForAddCreds";
import { Logger } from "../../../logger";
import * as SessConstants from "./SessConstants";

/**
 * This class creates a session configuration object for making
 * REST API calls with the Imperative RestClient.
 */
export class CredsForSessCfg {

    // ***********************************************************************
    /**
     * Create a REST session configuration object starting with the supplied
     * initialSessCfg and retrieving credential properties from the command
     * line arguments (or environment, or profile). Upon finding no credentials,
     * we interactively prompt the user for user name and password.
     * Any prompt will timeout after 30 seconds so that this function can
     * be run from an automated script, and will not indefinitely hang that
     * script.
     *
     * The following are possible credential-related session properties that
     * can be added to the session configuration:
     *
     *      user
     *      password
     *      type
     *      tokenType
     *      tokenValue
     *
     * @param initialSessCfg
     *        An initial session configuration (like ISession, or other
     *        specially defined configuration) that contains your desired
     *        session configuration properties.
     *
     * @param cmdArgs
     *        The arguments specified by the user on the command line
     *        (or in environment, or in profile)
     *
     * @param options
     *        Options that alter our actions. See IOptionsForAddCreds.
     *        The options parameter need not be supplied.
     *
     * @example
     *      // Within the process() function of a command handler,
     *      // do steps similar to the following:
     *      const sessCfg: ISession =  {
     *          hostname: commandParameters.arguments.host,
     *          port: commandParameters.arguments.port,
     *          rejectUnauthorized: commandParameters.arguments.rejectUnauthorized,
     *          basePath: commandParameters.arguments.basePath
     *      };
     *      const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
     *           sessCfg, commandParameters.arguments
     *      );
     *      mySession = new Session(sessCfgWithCreds);
     *
     * @returns A session configuration object with credentials added
     *          to the initialSessCfg. Its intended use is for our
     *          caller to create a session for a REST Client.
     */
    public static async addCredsOrPrompt<T>(
        initialSessCfg: T,
        cmdArgs: ICommandArguments,
        options: IOptionsForAddCreds = {}
    ): Promise<T> {
        const impLogger = Logger.getImperativeLogger();

        const optionDefaults: IOptionsForAddCreds = {
            requestToken: false,
            doPrompting: true
        };

        // override our defaults with what our caller wants.
        const optsToUse = {...optionDefaults, ...options};

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
        if (optsToUse.requestToken) {
            // ignoring tokenValue, will ensure that user & password are used for authentication
            tokenValExists = false;
        }

        if (userExists || tokenValExists === false) {
            /* When a user name is supplied, that is what we use.
             * If neither user name or token is supplied,
             * we prompt for username and password, as needed.
             */
            if (optsToUse.requestToken) {
                // Set our type to token to get a token from user and pass
                impLogger.debug("Using basic authentication to get token");
                finalSessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
                if (tokenTypeExists) {
                    finalSessCfg.tokenType = cmdArgs.tokenType;
                } else {
                    // When no tokenType supplied, user wants bearer
                    finalSessCfg.tokenType = SessConstants.TOKEN_TYPE_LTPA;  // TODO:Gene: change to TOKEN_TYPE_APIML
                }
            } else {
                impLogger.debug("Using basic authentication with no request for token");
                finalSessCfg.type = SessConstants.AUTH_TYPE_BASIC;
            }

            if (userExists) {
                finalSessCfg.user = cmdArgs.user;
            } else if (optsToUse.doPrompting) {
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
            } else if (optsToUse.doPrompting) {
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
        } else {
            // we have no user name, but we have a token. Use the token.
            impLogger.debug("Using token authentication");
            finalSessCfg.tokenValue = cmdArgs.tokenValue;
            if (tokenTypeExists) {
                finalSessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
                finalSessCfg.tokenType = cmdArgs.tokenType;
            } else {
                // When no tokenType supplied, user wants bearer
                finalSessCfg.type = SessConstants.AUTH_TYPE_BEARER;
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
