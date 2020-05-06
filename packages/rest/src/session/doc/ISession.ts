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

import * as SessConstants from "../SessConstants";

/**
 * Session interface for maintaining cookie and protocol information
 * @export
 * @interface ISession
 */
export interface ISession {

    /**
     * Host to get data from, not including http(s) from a URL, e.g. jsonplaceholder.typicode.com
     * @type {string}
     * @memberof ISession
     */
    hostname?: string;

    /**
     * Port to obtain data from
     * 80 is the default for http
     * 443 is the default 443 for https
     * @type {number}
     * @memberof ISession
     */
    port?: number;

    /**
     * User name for logging in
     * @type {string}
     * @memberof ISession
     */
    user?: string;

    /**
     * Password
     * @type {string}
     * @memberof ISession
     */
    password?: string;

    /**
     * Currently only HTTPS is supported
     * @type {string}
     * @memberof ISession
     */
    protocol?: SessConstants.HTTP_PROTOCOL_CHOICES;

    /**
     * The base path (or first part) of the resources that we will access.
     * It is used to specify the first part of the resource in a URL that
     * points to any API mediation layer, gateway, or router used at a site
     * to dispatch web requests to services that are managed by that gateway.
     * It is pre-pended to the resource path of the underlying service.
     * When not supplied, or is an empty string we use the the resource path of
     * the underlying service directly.
     * @type {string}
     * @memberof ISession
     */
    basePath?: string;

    /**
     * Type of authentication, none is default
     * "none"  - no authorization header is used
     * "basic" - use basic auth for every request
     * "bearer" - use bearer auth for every request.
     *           Indicates use token value provided.
     * "token" - use cookie auth for every request.
     *           Indicates use token value provided and check for timeout / expiration
     *           if not token is provided, basic auth is used and the tokenType is obtained
     *           from the cookie header and stored as a token value to be used on subsequent
     *           requests
     * @type {string}
     * @memberof ISession
     */
    type?: SessConstants.AUTH_TYPE_CHOICES

    /**
     * Base 64 encoded authentication materials created by base 64 encoding:
     *  Basic <user_name>:<password>
     * @type {string}
     * @memberof ISession
     */
    base64EncodedAuth?: string;

    /**
     * e.g. LTPA2
     * @type {string}
     * @memberof ISession
     */
    tokenType?: SessConstants.TOKEN_TYPE_CHOICES;

    /**
     * aldgfuq;iwgueroquw3evrqj4e0f9iuq0324fq9034ifgq0394fjg08934ujg0q93j4fq3j4f09jq40[f9j]
     * @type {string}
     * @memberof ISession
     */
    tokenValue?: string;

    /**
     * The following options map to TLS options available within the node.js TLS APIs, please
     * see the official Node.js documentation for these fields
     * @type {boolean}
     * @memberof ISession
     */
    rejectUnauthorized?: boolean;

    /**
     * todo
     * @type {string}
     * @memberof ISession
     */
    cert?: string;

    /**
     * todo
     * @type {string}
     * @memberof ISession
     */
    passphrase?: string;

    /**
     * todo
     * @type {string}
     * @memberof ISession
     */
    serverCertificate ?: string;

    /**
     * see node.js api
     * @type {boolean}
     * @memberof ISession
     */
    strictSSL?: boolean;

    /**
     * todo
     * @type {boolean}
     * @memberof ISession
     */
    checkServerIdentity?: (host: string, cert: object) => Error | undefined;

    /**
     * Default is SSLv23_method
     * @type {string}
     * @memberof ISession
     */
    secureProtocol?: string;
}
