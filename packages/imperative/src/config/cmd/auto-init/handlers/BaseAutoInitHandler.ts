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

import { ICommandHandler, IHandlerParameters, ICommandArguments, IHandlerResponseApi } from "../../../../../../cmd";
import { Constants } from "../../../../../../constants";
import { ISession, ConnectionPropsForSessCfg, Session, SessConstants, AbstractSession } from "../../../../../../rest";
import { Imperative } from "../../../../Imperative";
import { ImperativeExpect } from "../../../../../../expect";
import { ImperativeError } from "../../../../../../error";
import { ISaveProfileFromCliArgs } from "../../../../../../profiles";
import { ImperativeConfig } from "../../../../../../utilities";
import { Config } from "../../../../../../config";
import { CredentialManagerFactory } from "../../../../../../security";
import { secureSaveError } from "../../../../../../config/src/ConfigUtils";

/**
 * This class is used by the auto init command handler as the base class for its implementation.
 */
export abstract class BaseAutoInitHandler implements ICommandHandler {

    /**
     * The profile type where connection information should be stored
     */
    protected abstract mProfileType: string;

    /**
     * The session being created from the command line arguments / profile
     */
    protected mSession: AbstractSession;

    /**
     * This is called by the {@link BaseAuthHandler#process} when it needs a
     * session. Should be used to create a session to connect to the auto-init
     * service.
     * @abstract
     * @param {ICommandArguments} args The command line arguments to use for building the session
     * @returns {ISession} The session object built from the command line arguments.
     */
    protected abstract createSessCfgFromArgs(args: ICommandArguments): ISession;

    /**
     * This handler is used for both "auth login" and "auth logout" commands.
     * It determines the correct action to take and calls either `processLogin`
     * or `processLogout` accordingly.
     *
     * @param {IHandlerParameters} commandParameters Command parameters sent by imperative.
     *
     * @returns {Promise<void>}
     */
    public async process(commandParameters: IHandlerParameters) {
        await this.processAutoInit(commandParameters);
    }

    // TODO update
    /**
     * This is called by the "auto-init" command after it creates a session, to
     * obtain information that can be used to automatically create a config
     * @abstract
     * @param {AbstractSession} session The session object to use to connect to the auth service
     * @returns {Promise<string>} The response from the auth service containing a token
     */
    protected abstract doAutoInit(session: AbstractSession, params: IHandlerParameters): Promise<void>;

    // TODO update
    /**
     * Performs the login operation. Builds a session to connect to the auth
     * service, sends a login request to it to obtain a token, and stores the
     * resulting token in the profile of type `mProfileType`.
     * @param {IHandlerParameters} params Command parameters sent by imperative.
     */
    private async processAutoInit(params: IHandlerParameters) {
        const sessCfg = this.createSessCfgFromArgs(params.arguments);
        const sessCfgWithCreds = await ConnectionPropsForSessCfg.addPropsOrPrompt<ISession>(
            sessCfg, params.arguments, { parms: params, doPrompting: true },
        );
        this.mSession = new Session(sessCfgWithCreds);
        await this.doAutoInit(this.mSession, params);
    }
}
