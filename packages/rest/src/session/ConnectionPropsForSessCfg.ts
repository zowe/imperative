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
import { ImperativeConfig } from "../../../utilities";
import { IProfileProperty } from "../../../profiles";
import { ConfigAutoStore } from "../../../config/src/ConfigAutoStore";

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
        connOpts: IOptionsForAddConnProps = {}
    ): Promise<SessCfgType> {
        const impLogger = Logger.getImperativeLogger();

        /* Create copies of our initialSessCfg and connOpts so that
         * we can modify them without changing the caller's copy.
         */
        const sessCfgToUse = { ...initialSessCfg };
        const connOptsToUse = { ...connOpts };

        // resolve all values between sessCfg and cmdArgs using option choices
        ConnectionPropsForSessCfg.resolveSessCfgProps(
            sessCfgToUse, cmdArgs, connOptsToUse
        );

        // This function will provide all the needed properties in one array
        const promptForValues: (keyof ISession)[] = [];

        // check what properties are needed to be prompted
        if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.hostname) === false) {
            promptForValues.push("hostname");
        }

        if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.port) === false) {
            promptForValues.push("port");
        }

        if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.tokenValue) === false &&
            ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.cert) === false)
        {
            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.user) === false) {
                promptForValues.push("user");
            }

            if (ConnectionPropsForSessCfg.propHasValue(sessCfgToUse.password) === false) {
                promptForValues.push("password");
            }
        }

        if (connOptsToUse.getValuesBack == null && connOptsToUse.doPrompting) {
            connOptsToUse.getValuesBack = this.getValuesBack(connOptsToUse);
        }

        if (connOptsToUse.getValuesBack != null) {
            // put all the needed properties in an array and call the external function
            const answers = await connOptsToUse.getValuesBack(promptForValues);

            // validate what values are given back and move it to sessCfgToUse
            for (const value of promptForValues) {
                if (ConnectionPropsForSessCfg.propHasValue(answers[value])) {
                    (sessCfgToUse as any)[value] = answers[value];
                }
            }

            if (connOptsToUse.autoStore !== false && connOptsToUse.parms != null) {
                await ConfigAutoStore.storeSessCfgProps(connOptsToUse.parms, sessCfgToUse, promptForValues);
            }
        }

        impLogger.debug("Session config after any prompting for missing values:");
        ConnectionPropsForSessCfg.logSessCfg(sessCfgToUse);
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
        if (!Object.prototype.hasOwnProperty.call(connOpts, "requestToken")) {
            connOpts.requestToken = false;
        }
        if (!Object.prototype.hasOwnProperty.call(connOpts, "doPrompting")) {
            connOpts.doPrompting = true;
        }
        if (!Object.prototype.hasOwnProperty.call(connOpts, "defaultTokenType")) {
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
        } else if (ConnectionPropsForSessCfg.propHasValue(sessCfg.user) === false &&
                   ConnectionPropsForSessCfg.propHasValue(sessCfg.password) === false &&
                   ConnectionPropsForSessCfg.propHasValue(cmdArgs.tokenValue))
        {
            // set tokenValue if token is in args, and user and password are NOT supplied.
            sessCfg.tokenValue = cmdArgs.tokenValue;
        }

        // we use a cert when none of user, password, or token are supplied
        if (ConnectionPropsForSessCfg.propHasValue(sessCfg.user) === false &&
            ConnectionPropsForSessCfg.propHasValue(sessCfg.password) === false &&
            ConnectionPropsForSessCfg.propHasValue(sessCfg.tokenValue) === false &&
            ConnectionPropsForSessCfg.propHasValue(cmdArgs.certFile))
        {
            if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.certKeyFile)) {
                sessCfg.cert = cmdArgs.certFile;
                sessCfg.certKey = cmdArgs.certKeyFile;
            }
            // else if (ConnectionPropsForSessCfg.propHasValue(cmdArgs.certFilePassphrase)) {
            //     sessCfg.cert = cmdArgs.certFile;
            //     sessCfg.passphrase = cmdArgs.certFilePassphrase;
            // }
        }

        if (ConnectionPropsForSessCfg.propHasValue(sessCfg.tokenValue)) {
            // when tokenValue is set at this point, we are definitely using the token.
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
        } else if (ConnectionPropsForSessCfg.propHasValue(sessCfg.cert)) {
            // when cert property is set at this point, we will use the certificate
            if (ConnectionPropsForSessCfg.propHasValue(sessCfg.certKey)) {
                impLogger.debug("Using PEM Certificate authentication");
                sessCfg.type = SessConstants.AUTH_TYPE_CERT_PEM;
            }
            // else if (ConnectionPropsForSessCfg.propHasValue(sessCfg.passphrase)) {
            //  impLogger.debug("Using PFX Certificate authentication");
            //  sessCfg.type = SessConstants.AUTH_TYPE_CERT_PFX;
            // }
        } else {
            // we are using basic auth
            impLogger.debug("Using basic authentication");
            sessCfg.type = SessConstants.AUTH_TYPE_BASIC;
        }
        ConnectionPropsForSessCfg.setTypeForTokenRequest(sessCfg, connOpts, cmdArgs.tokenType);
        ConnectionPropsForSessCfg.logSessCfg(sessCfg);
    }

    /**
     * List of properties on `sessCfg` object that should be kept secret and
     * may not appear in Imperative log files.
     */
    private static readonly secureSessCfgProps: string[] = ["user", "password", "tokenValue", "passphrase"];

    private static readonly promptTextForValues: { [key: string]: string } = {
        hostname: "Enter the host name of",
        port: "Enter the port number of",
        user: "Enter the user name for",
        password: "Enter the password for"
    };

    private static getValuesBack(connOpts: IOptionsForAddConnProps): (properties: string[]) => Promise<{ [key: string]: any }> {
        return async (promptForValues: string[]) => {
            const answers: { [key: string]: any } = {};
            const profileSchema = this.loadSchemaForSessCfgProps(connOpts.parms, promptForValues);
            const serviceDescription = connOpts.serviceDescription || "your service";

            for (const value of promptForValues) {
                let answer;
                while (answer === undefined) {
                    answer = await this.clientPrompt(`${this.promptTextForValues[value]} ${serviceDescription}: `, {
                        hideText: profileSchema[value]?.secure,
                        parms: connOpts.parms
                    });
                    if (answer === null) {
                        throw new ImperativeError({ msg: `Timed out waiting for ${value}.` });
                    }
                }
                if (profileSchema[value]?.type === "number") {
                    answer = Number(answer);
                    if (isNaN(answer)) {
                        throw new ImperativeError({ msg: `Specified ${value} was not a number.` });
                    }
                }
                answers[value] = answer;
            }

            return answers;
        };
    }

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
     * Determine if we want to request a token.
     * Set the session's type and tokenType accordingly.
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
    private static setTypeForTokenRequest(
        sessCfg: any,
        options: IOptionsForAddConnProps,
        tokenType: SessConstants.TOKEN_TYPE_CHOICES
    ) {
        const impLogger = Logger.getImperativeLogger();
        if (options.requestToken) {
            impLogger.debug("Requesting a token");
            if (sessCfg.type === SessConstants.AUTH_TYPE_BASIC) {
                // Set our type to token to get a token from user and pass
                sessCfg.type = SessConstants.AUTH_TYPE_TOKEN;
            }
            sessCfg.tokenType = tokenType || sessCfg.tokenType || options.defaultTokenType;
        }
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
        return propToTest != null && propToTest !== "";
    }

    private static loadSchemaForSessCfgProps(params: IHandlerParameters | undefined, promptForValues: string[]): { [key: string]: IProfileProperty } {
        if (params == null || ImperativeConfig.instance.loadedConfig?.baseProfile == null) {
            return {};
        }

        const schemas: { [key: string]: IProfileProperty } = {};
        for (const propName of promptForValues) {
            const profilePropName = propName === "hostname" ? "host" : propName;
            schemas[propName] = ImperativeConfig.instance.loadedConfig.baseProfile.schema.properties[profilePropName];
        }
        return schemas;
    }
}
