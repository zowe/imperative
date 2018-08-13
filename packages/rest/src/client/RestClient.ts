/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import { AbstractSession } from "../session/AbstractSession";
import { RestConstants } from "./RestConstants";
import { HTTP_VERB } from "./types/HTTPVerb";
import { AbstractRestClient } from "./AbstractRestClient";
import { JSONUtils } from "../../../utilities";

/**
 * Class to handle http(s) requests, build headers, collect data, report status codes, and header responses
 * and passes control to session object for maintaining connection information (tokens, checking for timeout, etc...)
 * @export
 * @class RestClient
 * @extends {AbstractRestClient}
 */
export class RestClient extends AbstractRestClient {

    /**
     * Wrap get for common error handling and supporting generic JSON types
     * @static
     * @template T - object type to return
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - the API URI that we are targeting
     * @param {any[]} reqHeaders - headers for the http(s) request
     * @returns {Promise<T>} - object on promise
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static async getExpectJSON<T extends object>(session: AbstractSession, resource: string,
                                                        reqHeaders: any[] = []): Promise<T> {
        const data = await this.getExpectString(session, resource, reqHeaders);
        return JSONUtils.parse<T>(data, "The get request appeared to succeed, but the response was not in the expected format");
    }

    /**
     * Wrap put for common error handling and supporting generic JSON types
     * @static
     * @template T - object type to return
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - the API URI that we are targeting
     * @param {any[]} reqHeaders - headers for the http(s) request
     * @param {any} payload - data to write on the http(s) request
     * @returns {Promise<T>} - object on promise
     * @throws  if the request gets a status code outside of the 200 range
     *                                   or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static async putExpectJSON<T extends object>(session: AbstractSession, resource: string,
                                                        reqHeaders: any[] = [], payload: any): Promise<T> {
        const data = await this.putExpectString(session, resource, reqHeaders, payload);
        return JSONUtils.parse<T>(data, "The put request appeared to succeed, but the response was not in the expected format");
    }

    /**
     * Wrap post for common error handling and supporting generic JSON types
     * @static
     * @template T - object type to return
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - the API URI that we are targeting
     * @param {any[]} reqHeaders - headers for the http(s) request
     * @param {any} payload - data to write on the http(s) request
     * @returns {Promise<T>} - object on promise
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static async postExpectJSON<T extends object>(session: AbstractSession, resource: string,
                                                         reqHeaders: any[] = [], payload?: any): Promise<T> {
        const data = await this.postExpectString(session, resource, reqHeaders, payload);
        return JSONUtils.parse<T>(data, "The post request appeared to succeed, but the response was not in the expected format");
    }

    /**
     * Wrap post for common error handling and supporting generic JSON types
     * @static
     * @template T - object type to return
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - the API URI that we are targeting
     * @param {any[]} reqHeaders - headers for the http(s) request
     * @returns {Promise<T>} - object on promise
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static async deleteExpectJSON<T extends object>(session: AbstractSession, resource: string, reqHeaders: any[] = []): Promise<T> {
        const data = await this.deleteExpectString(session, resource, reqHeaders);
        return JSONUtils.parse<T>(data, "The delete request appeared to succeed, but the response was not in the expected format");
    }

    /**
     * REST HTTP GET operation
     * @static
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - URI for which this request should go against
     * @param {any} reqHeaders - headers to include in the REST request
     * @returns {Promise<string>} - response body content from http(s) call
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static getExpectString(session: AbstractSession, resource: string, reqHeaders: any[] = []): Promise<string> {
        return new this(session).performRest(resource, HTTP_VERB.GET, reqHeaders);
    }

    /**
     * REST HTTP PUT operation
     * @static
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - URI for which this request should go against
     * @param {object[]} reqHeaders - headers to include in the REST request
     * @param {any} data - payload data
     * @returns {Promise<string>} - response body content from http(s) call
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static putExpectString(session: AbstractSession, resource: string, reqHeaders: any[] = [], data: any): Promise<string> {
        return new this(session).performRest(resource, HTTP_VERB.PUT, reqHeaders, data);
    }

    /**
     * REST HTTP POST operation
     * @static
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - URI for which this request should go against
     * @param {object[]} reqHeaders - headers to include in the REST request
     * @param {any} data - payload data
     * @returns {Promise<string>} - response body content from http(s) call
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static postExpectString(session: AbstractSession, resource: string, reqHeaders: any[] = [], data?: any): Promise<string> {
        return new this(session).performRest(resource, HTTP_VERB.POST, reqHeaders, data);
    }

    /**
     * REST HTTP DELETE operation
     * @static
     * @param {AbstractSession} session - representing connection to this api
     * @param {string} resource - URI for which this request should go against
     * @param {any} reqHeaders - headers to include in the REST request
     * @returns {Promise<string>} - response body content from http(s) call
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     * @memberof RestClient
     */
    public static deleteExpectString(session: AbstractSession, resource: string, reqHeaders: any[] = []): Promise<string> {
        return new this(session).performRest(resource, HTTP_VERB.DELETE, reqHeaders);
    }

    /**
     * Helper method to return an indicator for whether or not a URI contains a query string.
     * @static
     * @param {string} query - URI
     * @returns {boolean} - true if query is contained within URI
     * @memberof RestClient
     */
    public static hasQueryString(query: string): boolean {
        return (query.slice(-1) !== RestConstants.QUERY_ID);
    }
}
