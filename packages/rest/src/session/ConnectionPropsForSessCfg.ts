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
import { ISession } from "./doc/ISession";
import * as lodash from "lodash";

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
     *        (or in environment, or in profile). The contents of the
     *        supplied cmdArgs will be modified.
     *
     * @param connOpts
     *        Options that alter our connection actions. See IOptionsForAddConnProps.
     *        The connOpts parameter need not be supplied.
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
    public static async addPropsOrPrompt<SessCfgType extends ISession>(
        initialSessCfg: SessCfgType,
        cmdArgs: ICommandArguments,
        connOpts: IOptionsForAddConnProps = {},
    ): Promise<SessCfgType> {
        const impLogger = Logger.getImperativeLogger();

        /* Create copies of our initialSessCfg and connOpts so that
         * we can modify them without changing the caller's copy.
         */
        const sessCfgToUse = { ...initialSessCfg };
        const connOptsToUse = { ...connOpts };
        const serviceDescription = connOptsToUse.serviceDescription || "your service";

        // resolve all values between sessCfg and cmdArgs using option choices
        ConnectionPropsForSessCfg.resolveSessCfgProps(
            sessCfgToUse, cmdArgs, connOptsToUse
        );

        // This function will provide all the needed properties in one array
        const promptForValues = [];
        if (connOptsToUse.getValuesBack) {

            // set doPrompting to false if there's a value in getValuesBack
            connOptsToUse.doPrompting = false;

            // check what properties are needed to be prompted
            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.hostname) === false) {
                promptForValues.push("hostname");
            }

            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.port) === false) {
                promptForValues.push("port");
            }

            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.tokenValue) === false) {
                if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.user) === false) {
                    promptForValues.push("user");
                }

                if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.password) === false) {
                    promptForValues.push("password");
                }
            }

            // put all the needed properties in an array and call the external function
            const answer = await connOptsToUse.getValuesBack(promptForValues);

            // validate what values are given back and move it to sessCfgToUse
            if (ConnectionPropsForSessCfg.propHasValue(answer.hostname)) {
                sessCfgToUse.hostname = answer.hostname;
            }
            if (ConnectionPropsForSessCfg.propHasValue(answer.port)) {
                sessCfgToUse.port = answer.port;
            }
            if (ConnectionPropsForSessCfg.propHasValue(answer.user)) {
                sessCfgToUse.user = answer.user;
            }
            if (ConnectionPropsForSessCfg.propHasValue(answer.password)) {
                sessCfgToUse.password = answer.password;
            }
        }

        // if our caller permits, prompt for host and port as needed
        if (connOptsToUse.doPrompting) {
            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.hostname) === false) {
                let answer = "";
                while (answer === "") {
                    answer = await this.clientPrompt(`Enter the host name of ${serviceDescription}: `, {
                        parms: connOptsToUse.parms
                    });
                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for host name."});
                    }
                }
                sessCfgToUse.hostname = answer;
            }

            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.port) === false) {
                let answer: any;
                while (answer === undefined) {
                    answer = await this.clientPrompt(`Enter the port number for ${serviceDescription}: `, {
                        parms: connOptsToUse.parms
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
                sessCfgToUse.port = answer;
            }
        }

        /**
         * If we are running in daemon mode, check if a cached session exists
         * that matches the hostname and port number.
         */
        if (connOptsToUse.parms?.cacheCredentials) {
            const cachedSession = this.mSessionCache.find(({ hostname, port }) => hostname === sessCfgToUse.hostname && port === sessCfgToUse.port);
            if (cachedSession != null) {
                const mergedSession = { ...cachedSession, ...sessCfgToUse, type: cachedSession.type };
                this.cacheSession(mergedSession);
                return mergedSession as SessCfgType;
            }
        }

        /* If we do not have a token, we must use user name and password.
         * If our caller permit, we prompt for any missing user name or password.
         */
        if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.tokenValue) === false &&
            connOptsToUse.doPrompting)
        {
            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.user) === false) {
                let answer = "";
                while (answer === "") {
                    answer = await this.clientPrompt("Enter user name: ", {
                        parms: connOptsToUse.parms
                    });
                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for user name."});
                    }
                }
                sessCfgToUse.user = answer;
            }

            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.password) === false) {
                let answer = "";
                while (answer === "") {

                    answer = await this.clientPrompt("Enter password : ", {
                        hideText: true,
                        parms: connOptsToUse.parms
                    });

                    if (answer === null) {
                        throw new ImperativeError({msg: "Timed out waiting for password."});
                    }
                }
                sessCfgToUse.password = answer;
            }
        }

        impLogger.debug("Session config after any prompting for missing values:");
        ConnectionPropsForSessCfg.logSessCfg(sessCfgToUse);

        /**
         * If we are running in daemon mode and prompted for credentials, cache
         * the session for future commands to use.
         */
        if (connOptsToUse.parms?.cacheCredentials) {
            this.cacheSession(sessCfgToUse);
        }

        return sessCfgToUse;
    }

    // ***********************************************************************
    /**
     * Resolve the overlapping or mutually exclusive properties that can
     * occur. Ensure that the resulting session configuration object contains
     * only the applicable properties. The contents of the supplied sessCfg,
     * cmdArgs, and connOpts will be modified.
     *
     * @param sessCfg
     *      An initial session configuration that contains your desired
     *      session configuration properties.
     *
     * @param cmdArgs
     *      The arguments specified by the user on the command line
     *      (or in environment, or in profile)
     *
     * @param connOpts
     *      Options that alter our actions. See IOptionsForAddConnProps.
     *      The connOpts parameter need not be supplied.
     *      The only option values used by this function are:
     *          connOpts.requestToken
     *          connOpts.defaultTokenType
     *
     * @example
     *      let sessCfg = YouCollectAllProfilePropertiesRelatedToSession();
     *      let cmdArgs = YouSetPropertiesRequiredInCmdArgs();
     *      ConnectionPropsForSessCfg.resolveSessCfgProps(sessCfg, cmdArgs);
     *      sessionToUse = new Session(sessCfg);
     */
    public static resolveSessCfgProps<SessCfgType extends ISession>(
        sessCfg: SessCfgType,
        cmdArgs: ICommandArguments = {$0: "", _: []},
        connOpts: IOptionsForAddConnProps = {}
     ) {
        const impLogger = Logger.getImperativeLogger();

        // use defaults if caller has not specified these properties.
        if (!connOpts.hasOwnProperty("requestToken")) {
            connOpts.requestToken = false;
        }
        if (!connOpts.hasOwnProperty("doPrompting")) {
            connOpts.doPrompting = true;
        }
        if (!connOpts.hasOwnProperty("defaultTokenType")) {
            connOpts.defaultTokenType = SessConstants.TOKEN_TYPE_JWT;
        }

        /* Override properties from our caller's sessCfg
         * with any values from the command line.
         */
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.host)) {
            sessCfg.hostname = cmdArgs.host;
        }
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.port)) {
            sessCfg.port = cmdArgs.port;
        }
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.user)) {
            sessCfg.user = cmdArgs.user;
        }
        if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.password)) {
            sessCfg.password = cmdArgs.password;
        }

        if (connOpts.requestToken) {
            // deleting any tokenValue, ensures that basic creds are used to authenticate and get token
            delete sessCfg.tokenValue;
        } else if (ConnectionPropsForSessCfg.propHasValue(sessCfg.user) ||
                 ConnectionPropsForSessCfg.propHasValue(sessCfg.password))
        {
            /* When user or password is supplied, we use user/password instead of token.
             * Deleting any tokenValue, ensures that basic creds are used to authenticate.
             */
            delete sessCfg.tokenValue;
        } else if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.tokenValue)) {
            // Only set tokenValue if user and password were not supplied.
            sessCfg.tokenValue = cmdArgs.tokenValue;
        }

        // If sessCfg tokenValue is set at this point, we are definitely using the token.
        if (ConnectionPropsForSessCfg.propHasValue(sessCfg.tokenValue) === true) {
            impLogger.debug("Using token authentication");

            // override any token type in sessCfg with cmdArgs value
            if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.tokenType)) {
                sessCfg.tokenType = cmdArgs.tokenType;
            }

            // set the auth type based on token type
            if (ConnectionPropsForSessCfg.propHasValue(sessCfg.tokenType)) {
                sessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
            } else {
                // When no tokenType supplied, user wants bearer
                sessCfg.type = SessConstants.AUTH_TYPE_BEARER;
            }
            ConnectionPropsForSessCfg.logSessCfg(sessCfg);
        } else {
            ConnectionPropsForSessCfg.setTypeForBasicCreds(sessCfg, connOpts, cmdArgs.tokenType);
            ConnectionPropsForSessCfg.logSessCfg(sessCfg);
        }
    }

    /**
     * Cache a session for future commands to use its credentials.
     * @param sessCfg Session config with hostname, port, and credentials to be cached
     */
    public static cacheSession(sessCfg: ISession) {
        const cachedSessionIdx = this.mSessionCache.findIndex(({ hostname, port }) => hostname === sessCfg.hostname && port === sessCfg.port);
        const sessCfgProps = ["hostname", "port", "type"];
        if (sessCfg.type === null) {
            throw new Error("Cannot cache session with undefined type");
        } else if (sessCfg.type === "basic") {
            sessCfgProps.push("user", "password");
        } else {
            sessCfgProps.push("tokenType", "tokenValue");
        }
        const sessCfgWithCreds: ISession = lodash.pick(sessCfg, sessCfgProps);

        if (cachedSessionIdx === -1) {
            this.mSessionCache.push(sessCfgWithCreds);
        } else {
            this.mSessionCache[cachedSessionIdx] = sessCfgWithCreds;
        }
    }

    /**
     * Uncache a session so future commands cannot use its credentials.
     * @param sessCfg Session config with hostname and port to be uncached
     */
    public static uncacheSession(sessCfg: ISession) {
        this.mSessionCache = this.mSessionCache.filter(({ hostname, port }) => !(hostname === sessCfg.hostname && port === sessCfg.port));
    }

    /**
     * List of properties on `sessCfg` object that should be kept secret and
     * may not appear in Imperative log files.
     */
    private static readonly secureSessCfgProps: string[] = ["user", "password", "tokenValue"];

    /**
     * Session cache used to store credentials in daemon mode
     */
    private static mSessionCache: ISession[] = [];

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
            return opts.parms.response.console.prompt(promptText, opts);
        } else {
            return CliUtils.readPrompt(promptText, opts);
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
            sessCfg.tokenType = tokenType || sessCfg.tokenType || options.defaultTokenType;
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
    private static propHasValue(propToTest: any) {
        if ((propToTest === undefined || propToTest === null) || ((typeof propToTest) === "string" && propToTest.length === 0)) {
            return false;
        }
        return true;
    }
}
