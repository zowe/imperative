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

import { URL } from "url";
import { AUTH_TYPE_BASIC, HTTP_PROTOCOL_CHOICES } from "./SessConstants";
import { AbstractSession } from "./AbstractSession";
import { ISession } from "./doc/ISession";

/**
 * Non-abstract session class
 * @export
 * @class Session
 * @extends {AbstractSession}
 */
export class Session extends AbstractSession {

    /**
     * Creates an instance of Session.
     * @param {ISession} newSession - contains input for new session
     * @memberof Session
     */
    constructor(newSession: ISession) {
        super(newSession);
    }

    public static buildFromUrl(url: URL, includePath?: boolean): Session {
        const sessCfg: ISession = {
            hostname: url.hostname,
            user: url.username,
            password: url.password
        };

        if (url.protocol === "http:" || url.protocol === "https:") {
            sessCfg.protocol = url.protocol.slice(0, -1) as HTTP_PROTOCOL_CHOICES;
        }

        if (url.port) {
            sessCfg.port = parseInt(url.port);
        }

        if (includePath !== false) {
            sessCfg.basePath = url.pathname;
        }

        if (sessCfg.user != null && sessCfg.password != null) {
            sessCfg.type = AUTH_TYPE_BASIC;
        }

        return new this(sessCfg);
    }
}
