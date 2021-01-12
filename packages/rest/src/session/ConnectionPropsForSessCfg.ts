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
import { ICommandArguments, IHandlerParameters } from "../../../cmd";
import { ImperativeError } from "../../../error";
import { IOptionsForAddConnProps } from "./doc/IOptionsForAddConnProps";
import { Logger } from "../../../logger";
import * as SessConstants from "./SessConstants";
import { IPromptOptions } from "../../../cmd/src/doc/response/api/handler/IPromptOptions";


/**
 * Extend options for IPromptOptions for internal wrapper method
 * @interface IHandlePromptOptions
 * @extends {IPromptOptions}
 */
interface IHandlePromptOptions extends IPromptOptions {

    /**
     * Adds IHandlerParameters to IPromptOptions
     * @type {IHandlerParameters}
     * @memberof IHandlePromptOptions
     */
    parms?: IHandlerParameters;
}

/**
 * This class adds connection information to an existing session configuration
 * object for making REST API calls with the Imperative RestClient.
 */
export class ConnectionPropsForSessCfg {

    // ***********************************************************************
    /**
     * Create a REST session configuration object starting with the supplied
     * initialSessCfg and retrieving connection properties from the command
     * line arguments (or environment, or profile). If required connection
     * properties are missing we interactively prompt the user for the values.
     * for any of the following properties:
     *      host
     *      port
     *      user name
     *      password
     *
     * Any prompt will timeout after 30 seconds so that this function can
     * be run from an automated script, and will not indefinitely hang that
     * script.
     *
     * In addition to properties that we prompt for, we will also add the following
     * properties to the session configuration if they are available.
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
     *        Options that alter our actions. See IOptionsForAddConnProps.
     *        The options parameter need not be supplied.
     *
     * @example
     *      // Within the process() function of a command handler,
     *      // do steps similar to the following:
     *      const sessCfg: ISession =  {
     *          rejectUnauthorized: commandParameters.arguments.rejectUnauthorized,
     *          basePath: commandParameters.arguments.basePath
     *      };
     *      const connectableSessCfg = await ConnectionPropsForSessCfg.addPropsOrPrompt<ISession>(
     *           sessCfg, commandParameters.arguments
     *      );
     *      mySession = new Session(connectableSessCfg);
     *
     * @returns A session configuration object with connection information
     *          added to the initialSessCfg. Its intended use is for our
     *          caller to create a session for a REST Client.
     */
    public static async addPropsOrPrompt<T>(
        initialSessCfg: T,
        cmdArgs: ICommandArguments,
        options: IOptionsForAddConnProps = {},
        parms?: IHandlerParameters
    ): Promise<T> {
        const impLogger = Logger.getImperativeLogger();

        // split authToken into tokenType and tokenValue
        // TODO Evaluate if we want to keep this for new config
        ConnectionPropsForSessCfg.processAuthToken(cmdArgs);

        const optionDefaults: IOptionsForAddConnProps = {
            requestToken: false,
            doPrompting: true,
            defaultTokenType: SessConstants.TOKEN_TYPE_JWT
        };

        // override our defaults with what our caller wants.
        const optsToUse = {...optionDefaults, ...options};

        // initialize session config object with what our caller supplied
        const finalSessCfg: any = initialSessCfg;

        const promptForValues = [];

        /* Override properties from our caller's initialSessCfg
         * with any values from the command line.
         */
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.host)) {
            finalSessCfg.hostname = cmdArgs.host;
        }
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.port)) {
            finalSessCfg.port = cmdArgs.port;
        }
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.user)) {
            finalSessCfg.user = cmdArgs.user;
        }
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.password)) {
            finalSessCfg.password = cmdArgs.password;
        }

        if (optsToUse.requestToken) {
            // deleting any tokenValue, ensures that basic creds are used to authenticate and get token
            delete finalSessCfg.tokenValue;
        } else if (!ConnectionPropsForSessCfg.propHasValue(finalSessCfg.user) &&
            !ConnectionPropsForSessCfg.propHasValue(finalSessCfg.password) &&
            ConnectionPropsForSessCfg.propHasValue(cmdArgs.tokenValue))
        {
            // only set tokenValue if user and password were not supplied
            finalSessCfg.tokenValue = cmdArgs.tokenValue;
        }

        // This function will provide all the needed properties in one array
        if (optsToUse.getValuesBack) {

            // set doPrompting to false if there's a value in getValuesBack
            optionDefaults.doPrompting = false;

            // check what properties are needed to be prompted
            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.hostname)=== false) {
                promptForValues.push("hostname");
            }

            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.port)=== false) {
                promptForValues.push("port");
            }

            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.tokenValue)=== false) {
                if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.user)=== false) {
                    promptForValues.push("user");
                }

                if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.password)=== false) {
                    promptForValues.push("password");
                }
            }

            // put all the needed properties in an array and call the external function
            const answer = await optsToUse.getValuesBack(promptForValues);

            // validate what values are given back and move it to finalSessCfg
            if (ConnectionPropsForSessCfg.propHasValue(answer.hostname)) {
                finalSessCfg.hostname = answer.hostname;
            }
            if (ConnectionPropsForSessCfg.propHasValue(answer.port)) {
                finalSessCfg.port = answer.port;
            }
            if (ConnectionPropsForSessCfg.propHasValue(answer.user)) {
                finalSessCfg.user = answer.user;
            }
            if (ConnectionPropsForSessCfg.propHasValue(answer.password)) {
                finalSessCfg.password = answer.password;
            }
        }

        // if our caller permits, prompt for host and port as needed
        if (optsToUse.doPrompting) {
            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.hostname) === false) {
                let answer = "";
                while (answer === "") {
                    answer = await this.clientPrompt("Enter the host name of your service: ", {
                        parms
                    });
                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for host name."});
                    }
                }
                finalSessCfg.hostname = answer;
            }

            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.port) === false) {
                let answer: any;
                while (answer === undefined) {
                    answer = await this.clientPrompt("Enter the port number for your service: ", {
                        parms
                    });
                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for port number."});
                    } else {
                        answer = Number(answer);
                        if (isNaN(answer)) {
                            throw new ImperativeError({msg: "Specified port was not a number."});
                        }
                    }
                }
                finalSessCfg.port = answer;
            }
        }

        /* If tokenValue is set, we have already checked that user and password
         * are not, so it's safe to proceed with using the token.
         */
        if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.tokenValue) === true)
        {
            impLogger.debug("Using token authentication");
            if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.tokenType)) {
                finalSessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
                finalSessCfg.tokenType = cmdArgs.tokenType;
            } else {
                // When no tokenType supplied, user wants bearer
                finalSessCfg.type = SessConstants.AUTH_TYPE_BEARER;
            }
            ConnectionPropsForSessCfg.logSessCfg(finalSessCfg);
            return finalSessCfg;
        }

        /* At this point we ruled out token, so we use user and password. If our
         * caller permits, we prompt for any missing user name and password.
         */
        if (optsToUse.doPrompting) {
            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.user) === false) {
                let answer = "";
                while (answer === "") {
                    answer = await this.clientPrompt("Enter user name: ", {
                        parms
                    });
                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for user name."});
                    }
                }
                finalSessCfg.user = answer;
            }

            if (ConnectionPropsForSessCfg.propHasValue(finalSessCfg.password) === false) {
                let answer = "";
                while (answer === "") {

                    answer = await this.clientPrompt("Enter password : ", {
                        hideText: true,
                        parms
                    });

                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for password."});
                    }
                }
                finalSessCfg.password = answer;
            }
        }

        ConnectionPropsForSessCfg.setTypeForBasicCreds(finalSessCfg, optsToUse, cmdArgs.tokenType);
        ConnectionPropsForSessCfg.logSessCfg(finalSessCfg);
        return finalSessCfg;
    }

    /**
     * List of properties on `sessCfg` object that should be kept secret and
     * may not appear in Imperative log files.
     */
    private static readonly secureSessCfgProps: string[] = ["user", "password", "tokenValue"];

    /**
     * Handle prompting for clients.  If in a CLI environment, use the IHandlerParameters.response
     * object prompt method.
     * @private
     * @static
     * @param {string} promptText
     * @param {IHandlePromptOptions} opts
     * @returns {Promise<string>}
     * @memberof ConnectionPropsForSessCfg
     */
    private static async clientPrompt(promptText: string, opts: IHandlePromptOptions): Promise<string> {
        if (opts.parms) {
            return opts.parms.response.console.prompt(promptText, {hideText: true});
        } else {
            return CliUtils.promptWithTimeout(promptText, true);
        }
    }

    // ***********************************************************************
    /**
     * Determine if we want to use a basic authentication to acquire a token.
     * Set the session configuration accordingly.
     *
     * @param sessCfg
     *       The session configuration to be updated.
     *
     * @param options
     *       Options that alter our actions. See IOptionsForAddConnProps.
     *
     * @param tokenType
     *       The type of token that we expect to receive.
     */
    private static setTypeForBasicCreds(
        sessCfg: any,
        options: IOptionsForAddConnProps,
        tokenType: SessConstants.TOKEN_TYPE_CHOICES
    ) {
        const impLogger = Logger.getImperativeLogger();
        let logMsgtext = "Using basic authentication ";

        if (options.requestToken) {
            // Set our type to token to get a token from user and pass
            logMsgtext += "to get token";
            sessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
            sessCfg.tokenType = tokenType || options.defaultTokenType;
        } else {
            logMsgtext += "with no request for token";
            sessCfg.type = SessConstants.AUTH_TYPE_BASIC;
        }
        impLogger.debug(logMsgtext);
    }

    // ***********************************************************************
    /**
     * Log the session configuration that resulted from the addition of
     * credentials. Hide the password.
     *
     * @param sessCfg
     *       The session configuration to be logged.
     */
    private static logSessCfg(sessCfg: any) {
        const impLogger = Logger.getImperativeLogger();

        // create copy of sessCfg and obscure secure fields for displaying in the log
        const sanitizedSessCfg = JSON.parse(JSON.stringify(sessCfg));
        for (const secureProp of ConnectionPropsForSessCfg.secureSessCfgProps) {
            if (sanitizedSessCfg[secureProp] != null) {
                sanitizedSessCfg[secureProp] = `${secureProp}_is_hidden`;
            }
        }
        impLogger.debug("Creating a session config with these properties:\n" +
            JSON.stringify(sanitizedSessCfg, null, 2)
        );
    }

    // ***********************************************************************
    /**
     * Confirm whether the specified property has a value.
     *
     * @param propToTest
     *       the property key to be confirmed.
     *
     * @returns true is the property exists and has a value. false otherwise.
     */
    private static propHasValue(propToTest: string) {
        if ((propToTest === undefined || propToTest === null) || ((typeof propToTest) === "string" && propToTest.length === 0)) {
            return false;
        }
        return true;
    }

    /**
     * Split authToken loaded from config into tokenType and tokenValue args.
     * @param cmdArgs Arguments specified by the user
     */
    private static processAuthToken(cmdArgs: ICommandArguments) {
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.authToken)) {
            const [tokenType, tokenValue] = cmdArgs.authToken.split("=", 2);
            delete cmdArgs.authToken;
            cmdArgs.tokenType = tokenType;
            cmdArgs.tokenValue = tokenValue;
        }
    }
}
