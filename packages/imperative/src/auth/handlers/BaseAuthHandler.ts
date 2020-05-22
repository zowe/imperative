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

import { ICommandHandler, IHandlerParameters, ICommandArguments } from "../../../../cmd";
import { Constants } from "../../../../constants";
import { Logger } from "../../../../Logger";
import { ISession, CredsForSessCfg, Session, SessConstants, AbstractSession } from "../../../../rest";
import { Imperative } from "../../..";

/**
 * This class is used by the auth command handlers as the base class for their implementation.
 */
export abstract class BaseAuthHandler implements ICommandHandler {
    protected mProfileType: string;

    /**
     * The session creating from the command line arguments / profile
     */
    protected mSession: AbstractSession;

    private log: Logger = Logger.getImperativeLogger();

    /**
     * This will grab the zosmf profile and create a session before calling the subclass
     * {@link ZosFilesBaseHandler#processWithSession} method.
     *
     * @param {IHandlerParameters} commandParameters Command parameters sent by imperative.
     *
     * @returns {Promise<void>}
     */
    public async process(commandParameters: IHandlerParameters) {
        switch (commandParameters.definition.name) {
            case Constants.LOGIN_ACTION:
                this.processLogin(commandParameters);
                break;
            case Constants.LOGOUT_ACTION:
                this.log.info("Logout not yet implemented");
                break;
            default:
                this.log.error(`The definition name "${commandParameters.definition.name}" was passed to the BaseAuthHandler, but it is not valid.`);
                break;
        }
    }

    /**
     * This is called by the {@link ZosFilesBaseHandler#process} after it creates a session. Should
     * be used so that every class under files does not have to instantiate the session object.
     *
     * @param {IHandlerParameters} commandParameters Command parameters sent to the handler.
     * @param {AbstractSession} session The session object generated from the zosmf profile.
     * @param {IProfile} zosmfProfile The zosmf profile that was loaded for the command.
     *
     * @returns {Promise<IZosFilesResponse>} The response from the underlying zos-files api call.
     */
    public abstract createSessCfgFromArgs(args: ICommandArguments): ISession;

    public abstract async doLogin(session: AbstractSession): Promise<void>;

    public abstract async doLogout(session: AbstractSession): Promise<void>;

    private async processLogin(params: IHandlerParameters) {
        const loadedProfile = params.profiles.getMeta(this.mProfileType, false);

        const sessCfg: ISession = this.createSessCfgFromArgs(
            params.arguments
        );
        const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            sessCfg, params.arguments, { requestToken: true }
        );

        this.mSession = new Session(sessCfgWithCreds);

        // we want to receive a token in our response
        this.mSession.ISession.type = SessConstants.AUTH_TYPE_TOKEN;

        // set the type of token we expect to receive
        if (params.arguments.tokenType) {
            // use the token type requested by the user
            this.mSession.ISession.tokenType = params.arguments.tokenType;
        } else {
            // use our default token
            this.mSession.ISession.tokenType = SessConstants.TOKEN_TYPE_APIML;
        }

        // login to obtain a token
        const tokenValue = await this.doLogin(this.mSession);

        // update the profile given
        await Imperative.api.profileManager(this.mProfileType).update({
            name: loadedProfile.name,
            args: {
                "token-type": this.mSession.ISession.tokenType,
                "token-value": tokenValue
            },
            merge: true
        });

        params.response.console.log("Login successful.");

        if (params.arguments.showToken) {
            params.response.console.log(
                "\nReceived a token of type = " + this.mSession.ISession.tokenType +
                ".\nThe following token was stored in your profile:\n" + tokenValue
            );
        }
    }
}
