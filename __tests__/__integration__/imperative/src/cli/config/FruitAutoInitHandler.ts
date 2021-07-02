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

import { AbstractSession, BaseAutoInitHandler, ICommandArguments, IConfig, IHandlerParameters,
         ISession, SessConstants } from "../../../../../../lib";

/**
 * This class is used by the auto-init command handlers as the base class for their implementation.
 */
export default class FruitAutoInitHandler extends BaseAutoInitHandler {
    /**
     * The profile type where token type and value should be stored
     */
    protected mProfileType: string = "base";

    /**
     * This is called by the {@link BaseAutoInitHandler#process} when it needs a
     * session. Should be used to create a session to connect to the auto-init
     * service.
     * @param {ICommandArguments} args The command line arguments to use for building the session
     * @returns {ISession} The session object built from the command line arguments.
     */
    protected createSessCfgFromArgs(args: ICommandArguments): ISession {
        return {
            hostname: args.host,
            port: args.port,
            user: args.user,
            password: args.password,
            tokenType: args.tokenType,
            tokenValue: args.tokenValue
        };
    }

    /**
     * This is called by the "auto-init" command after it creates a session, to generate a configuration
     * @param {AbstractSession} session The session object to use to connect to the configuration service
     * @returns {Promise<string>} The response from the auth service containing a token
     */
    protected async doAutoInit(session: AbstractSession, params: IHandlerParameters): Promise<IConfig> {
        return {
            profiles: {
                my_base_fruit: {
                    type: this.mProfileType,
                    properties: {
                        host: session.ISession.hostname,
                        port: session.ISession.port,
                        authToken: `${SessConstants.TOKEN_TYPE_JWT}=${session.ISession.user}:${session.ISession.password}@fakeToken`
                    },
                    secure: [
                        "authToken"
                    ]
                }
            },
            defaults: {
                [this.mProfileType]: "my_base_fruit"
            },
            plugins: []
        };
    }
}
