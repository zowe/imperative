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

import * as http from "http";
import { ISession } from "./doc/ISession";
import { Logger } from "../../../logger";
import { ImperativeError } from "../../../error";
import { isNullOrUndefined } from "util";
import { ImperativeExpect } from "../../../expect";

/**
 * The API session object, serves as the base for sessions and contains the fields that are required by
 * most API calls (hostname, port, credentials, etc).
 * @export
 * @abstract
 * @class AbstractSession
 */
export abstract class AbstractSession {

    /**
     * Basic auth prefix
     * @static
     * @type {string}
     * @memberof AbstractSession
     */
    public static readonly BASIC_PREFIX: string = "Basic ";

    /**
     * http protocol id
     * @static
     * @memberof AbstractSession
     */
    public static readonly HTTP_PROTOCOL = "http";

    /**
     * https protocol id
     * @static
     * @memberof AbstractSession
     */
    public static readonly HTTPS_PROTOCOL = "https";

    /**
     * Default protocol
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_PROTOCOL = AbstractSession.HTTPS_PROTOCOL;

    /**
     * None type id
     * @static
     * @memberof AbstractSession
     */
    public static readonly TYPE_NONE = "none";

    /**
     * Basic type id
     * @static
     * @memberof AbstractSession
     */
    public static readonly TYPE_BASIC = "basic";

    /**
     * Token type id
     * @static
     * @memberof AbstractSession
     */
    public static readonly TYPE_TOKEN = "token";

    /**
     * Default session type
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_TYPE = AbstractSession.TYPE_NONE;

    /**
     * Default http port 80
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_HTTP_PORT = 80;

    /**
     * Default https port 443
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_HTTPS_PORT = 443;

    /**
     * Default https port
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_PORT = AbstractSession.DEFAULT_HTTPS_PORT;

    /**
     * Default base path.
     * Our empty string means that we do **not** use an API mediation layer
     * base path at the beginning of every resource URL.
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_BASE_PATH = "";

    /**
     * Default reject unauthorized
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_REJECT_UNAUTHORIZED_SETTING = true;

    /**
     * Default strict ssl setting
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_STRICT_SSL = true;

    /**
     * Default SSL method
     * @static
     * @memberof AbstractSession
     */
    public static readonly DEFAULT_SECURE_PROTOCOL = "SSLv23_method";

    /**
     * Regex to extract basic from base64 encoded auth
     * @static
     * @type {RegExp}
     * @memberof AbstractSession
     */
    public static readonly BASIC: RegExp = /^Basic/ig;

    /**
     * Obtain user name from a base 64 credential
     * @static
     * @param {string} auth - base 64 encoded credentials
     * @returns {string} - user name
     * @memberof AbstractSession
     */
    public static getUsernameFromAuth(auth: string): string {
        auth = auth.replace(AbstractSession.BASIC, "");
        const decoding = Buffer.from(auth, "base64").toString();
        return decoding.substring(0, decoding.lastIndexOf(":"));
    }

    /**
     * Obtain password from a base 64 credential
     * @static
     * @param {string} auth - base 64 encoded credentials
     * @returns {string} - password
     * @memberof AbstractSession
     */
    public static getPasswordFromAuth(auth: string): string {
        auth = auth.replace(AbstractSession.BASIC, "");
        const decoding = Buffer.from(auth, "base64").toString();
        return decoding.substring(decoding.lastIndexOf(":") + 1);
    }

    /**
     * Create base 64 encoded representation of user and password
     * @static
     * @param user - plain text user
     * @param password - plain text password
     * @returns {string} - base 64 encoded auth
     * @memberof AbstractSession
     */
    public static getBase64Auth(user: string, password: string) {
        return Buffer.from(user + ":" + password).toString("base64");
    }

    /**
     * Logging object
     */
    private mLog: Logger;

    /**
     * Creates an instance of AbstractSession.
     * @param {ISession} session: Session parameter object
     * @memberof AbstractSession
     */
    constructor(private mISession: ISession) {
        this.mLog = Logger.getImperativeLogger();
        mISession = this.buildSession(mISession);
    }

    /**
     * Method to parse the requested token type
     * @param {*} cookie - cookie object from http(s) response
     * @memberof AbstractSession
     */
    public storeCookie(cookie: any) {

        const headerKeys: string[] = Object.keys(cookie);
        headerKeys.forEach( (key) => {
            const auth = cookie[key] as string;
            const authArr = auth.split(";");
            // see each field in the cookie, e/g. Path=/; Secure; HttpOnly; LtpaToken2=...
            authArr.forEach((element: string) => {
                // if we match requested token type, save it off for its length
                if (element.indexOf(this.mISession.tokenType) === 0) {
                    // parse off token value, minus LtpaToken2= (as an example)
                    this.ISession.tokenValue = element.substr(0, element.length);
                }
            });
        });
    }

    /**
     * Check that required fields are provided for basic auth requests
     * @private
     * @param {ISession} session: Session parameter object
     * @memberof AbstractSession
     */
    private checkBasicAuth(session: ISession) {
        if (!isNullOrUndefined(session.user) && !isNullOrUndefined(session.password)) {
            // ok
        } else if (!isNullOrUndefined(session.base64EncodedAuth)) {
            // ok
        } else {
            throw new ImperativeError({ msg: "Must have user & password OR base64 encoded credentials"});
        }
    }

    /**
     * Builds an ISession so all required pieces are filled in
     * @private
     * @param {ISession} session - the fully populated session
     * @memberof AbstractSession
     */
    private buildSession(session: ISession): ISession {
        const populatedSession = session;


        // set protocol if not set
        if (isNullOrUndefined(populatedSession.protocol)) {
            populatedSession.protocol = AbstractSession.DEFAULT_PROTOCOL;
        }

        // set rejectUnauthorized
        if (isNullOrUndefined(populatedSession.rejectUnauthorized)) {
            populatedSession.rejectUnauthorized = AbstractSession.DEFAULT_REJECT_UNAUTHORIZED_SETTING;
        }

        // set strictSSL
        if (isNullOrUndefined(populatedSession.strictSSL)) {
            populatedSession.strictSSL = AbstractSession.DEFAULT_STRICT_SSL;
        }

        // set port if not set
        if (isNullOrUndefined(populatedSession.port)) {
            if (populatedSession.protocol === AbstractSession.HTTP_PROTOCOL) {
                populatedSession.port = AbstractSession.DEFAULT_HTTP_PORT;
            } else if (populatedSession.protocol === AbstractSession.HTTPS_PROTOCOL) {
                populatedSession.port = AbstractSession.DEFAULT_HTTPS_PORT;
            }
        }

        // set protocol if not set
        if (isNullOrUndefined(populatedSession.secureProtocol)) {
            populatedSession.secureProtocol = AbstractSession.DEFAULT_SECURE_PROTOCOL;
        }

        // set basePath if not set
        if (isNullOrUndefined(populatedSession.basePath)) {
            populatedSession.basePath = AbstractSession.DEFAULT_BASE_PATH;
        }

        // set type if not set
        if (isNullOrUndefined(populatedSession.type)) {
            populatedSession.type = AbstractSession.DEFAULT_TYPE;
        }
        // populatedSession.type = populatedSession.type.toLocaleLowerCase();

        ImperativeExpect.keysToBeDefinedAndNonBlank(populatedSession, ["hostname"]);
        ImperativeExpect.toBeOneOf(populatedSession.type, [AbstractSession.TYPE_NONE, AbstractSession.TYPE_BASIC, AbstractSession.TYPE_TOKEN]);
        ImperativeExpect.toBeOneOf(populatedSession.protocol, [AbstractSession.HTTPS_PROTOCOL, AbstractSession.HTTP_PROTOCOL]);

        // if basic auth, must have user and password OR base 64 encoded credentials
        if (session.type === AbstractSession.TYPE_BASIC) {
            this.checkBasicAuth(session);
            ImperativeExpect.keysToBeUndefined(populatedSession, ["tokenType", "tokenValue"] );
        }

        if (session.type === AbstractSession.TYPE_TOKEN) {
            ImperativeExpect.keysToBeDefinedAndNonBlank(session, ["tokenType"], "You must provide a token type to use token authentication");

            // if you dont have a token, we need credentials to retrieve a token
            if (isNullOrUndefined(session.tokenValue)) {
                this.checkBasicAuth(session);
            }
        }

        // if basic auth
        if (populatedSession.type === AbstractSession.TYPE_BASIC || populatedSession.type === AbstractSession.TYPE_TOKEN) {

            // get base 64 encoded auth if not provided
            if (isNullOrUndefined(populatedSession.base64EncodedAuth)) {
                if (!isNullOrUndefined(populatedSession.user) && !isNullOrUndefined(populatedSession.user)) {
                    populatedSession.base64EncodedAuth = AbstractSession.getBase64Auth(populatedSession.user, populatedSession.password);
                }
            } else {
                if (isNullOrUndefined(populatedSession.user)) {
                    populatedSession.user = AbstractSession.getUsernameFromAuth(populatedSession.base64EncodedAuth);
                }
                if (isNullOrUndefined(populatedSession.password)) {
                    populatedSession.password = AbstractSession.getPasswordFromAuth(populatedSession.base64EncodedAuth);
                }
            }
        }

        return populatedSession;
    }

    /**
     * Obtain session info and defaults
     * @readonly
     * @type {ISession}
     * @memberof AbstractSession
     */
    get ISession(): ISession {
        return this.mISession;
    }
}
