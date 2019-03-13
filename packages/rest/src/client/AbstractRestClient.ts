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

import { inspect } from "util";
import { Logger } from "../../../logger";
import { IImperativeError } from "../../../error";
import { AbstractSession } from "../session/AbstractSession";
import * as https from "https";
import * as http from "http";
import { Headers } from "./Headers";
import { RestConstants } from "./RestConstants";
import { ImperativeReject } from "../../../interfaces";
import { IHTTPSOptions } from "./doc/IHTTPSOptions";
import { HTTP_VERB } from "./types/HTTPVerb";
import { ImperativeExpect } from "../../../expect";
import { Session } from "../session/Session";
import * as path from "path";
import { IRestClientError } from "./doc/IRestClientError";
import { RestClientError } from "./RestClientError";
import { PerfTiming } from "@zowe/perf-timing";

export type RestClientResolve = (data: string) => void;

/**
 * Class to handle http(s) requests, build headers, collect data, report status codes, and header responses
 * and passes control to session object for maintaining connection information (tokens, checking for timeout, etc...)
 * @export
 * @abstract
 * @class AbstractRestClient
 */
export abstract class AbstractRestClient {

    /**
     * Contains buffered data from REST chucks
     * @private
     * @type {Buffer}
     * @memberof AbstractRestClient
     */
    protected mData: Buffer = Buffer.from([]);

    /**
     * Instance of logger
     * @private
     * @type {Logger}
     * @memberof AbstractRestClient
     */
    protected mLogger: Logger;

    /**
     * Resolved when all data has been obtained
     * @private
     * @type {RestClientResolve}
     * @memberof AbstractRestClient
     */
    protected mResolve: RestClientResolve;

    /**
     * Reject for errors when obtaining data
     * @private
     * @type {ImperativeReject}
     * @memberof AbstractRestClient
     */
    protected mReject: ImperativeReject;

    /**
     * Contain response from http(s) request
     * @private
     * @type {*}
     * @memberof AbstractRestClient
     */
    protected mResponse: any;

    /**
     * Indicate if payload data is JSON to be stringified before writing
     * @private
     * @type {boolean}
     * @memberof AbstractRestClient
     */
    protected mIsJson: boolean;

    /**
     * Save resource
     * @private
     * @type {string}
     * @memberof AbstractRestClient
     */
    protected mResource: string;

    /**
     * Save request
     * @private
     * @type {HTTP_VERB}
     * @memberof AbstractRestClient
     */
    protected mRequest: HTTP_VERB;

    /**
     * Save req headers
     * @private
     * @type {any[]}
     * @memberof AbstractRestClient
     */
    protected mReqHeaders: any[];

    /**
     * Save write data
     * @private
     * @type {*}
     * @memberof AbstractRestClient
     */
    protected mWriteData: any;

    /**
     * Creates an instance of AbstractRestClient.
     * @param {AbstractSession} mSession - representing connection to this api
     * @memberof AbstractRestClient
     */
    constructor(private mSession: AbstractSession) {
        ImperativeExpect.toNotBeNullOrUndefined(mSession);
        this.mLogger = Logger.getImperativeLogger();
        this.mIsJson = false;
    }

    /**
     * Perform the actual http REST call with appropriate user input
     * @param {string} resource - URI for this request
     * @param {string} request - REST request type GET|PUT|POST|DELETE
     * @param {any[]} reqHeaders - option headers to include with request
     * @param {any} writeData - data to write on this REST request
     * @throws  if the request gets a status code outside of the 200 range
     *          or other connection problems occur (e.g. connection refused)
     */
    public performRest(resource: string, request: HTTP_VERB, reqHeaders?: any[], writeData?: any): Promise<string> {
        return new Promise<string>((resolve: RestClientResolve, reject: ImperativeReject) => {

            const timingApi = PerfTiming.api;

            if (PerfTiming.isEnabled) {
                // Marks point START
                timingApi.mark("START_PERFORM_REST");
            }

            // save for logging
            this.mResource = resource;
            this.mRequest = request;
            this.mReqHeaders = reqHeaders;
            this.mWriteData = writeData;

            // got a new promise
            this.mResolve = resolve;
            this.mReject = reject;

            ImperativeExpect.toBeDefinedAndNonBlank(resource, "resource");
            ImperativeExpect.toBeDefinedAndNonBlank(request, "request");
            const options = this.buildOptions(resource, request, reqHeaders);

            /**
             * Perform the actual http request
             */
            let clientRequest;
            if (this.session.ISession.protocol === AbstractSession.HTTPS_PROTOCOL) {
                clientRequest = https.request(options, this.requestHandler.bind(this));
            }
            else if (this.session.ISession.protocol === AbstractSession.HTTP_PROTOCOL) {
                clientRequest = http.request(options, this.requestHandler.bind(this));
            }

            /**
             * For a REST request which includes writing raw data to the http server,
             * write the data via http request.
             */
            if (writeData != null) {

                this.log.debug("will write data for request");
                /**
                 * If the data is JSON, translate to text before writing
                 */
                if (this.mIsJson) {
                    this.log.debug("writing JSON for request");
                    this.log.trace("JSON body: %s", JSON.stringify(writeData));
                    clientRequest.write(JSON.stringify(writeData));
                } else {
                    clientRequest.write(writeData);
                }
            }

            /**
             * Invoke any onError method whenever an error occurs on writing
             */
            clientRequest.on("error", (errorResponse: any) => {
                reject(this.populateError({
                    msg: "http(s) request error event called",
                    causeErrors: errorResponse,
                    source: "client"
                }));
            });

            // always end the request
            clientRequest.end();

            if (PerfTiming.isEnabled) {
                // Marks point END
                timingApi.mark("END_PERFORM_REST");
                timingApi.measure("performRest: $resource", "START_PERFORM_REST", "END_PERFORM_REST");
            }

        });
    }

    /**
     * Append specific headers for all requests by overriding this implementation
     * @protected
     * @param {(any[] | undefined)} headers - list of headers
     * @returns {any[]} - completed list of headers
     * @memberof AbstractRestClient
     */
    protected appendHeaders(headers: any[] | undefined): any[] {
        if (headers == null) {
            return [];
        }
        else {
            return headers;
        }
    }

    /**
     * Process and customize errors encountered in your client.
     * This is called any time an error is thrown from a failed Rest request using this client.
     * error before receiving any response body from the API.
     * You can use this, for example, to set the error tag for you client or add additional
     * details to the error message.
     * If you return null or undefined, Imperative will use the default error generated
     * for your failed request.
     * @protected
     * @param {IImperativeError} error - the error encountered by the client
     * @memberof AbstractRestClient
     * @returns {IImperativeError} processedError - the error with the fields set the way you want them
     */
    protected processError(error: IImperativeError): IImperativeError {
        this.log.debug("Default stub for processError was called for rest client %s - processError was not overwritten",
            this.constructor.name);
        return undefined; // do nothing by default
    }

    /**
     * Build http(s) options based upon session settings and request.
     * @private
     * @param {string} resource - URI for this request
     * @param {string} request - REST request type GET|PUT|POST|DELETE
     * @param {any[]} reqHeaders - option headers to include with request
     * @returns {IHTTPSOptions} - completed options object
     * @memberof AbstractRestClient
     */
    private buildOptions(resource: string, request: string, reqHeaders?: any[]): IHTTPSOptions {

        /**
         * HTTPS REST request options
         */
        let options: any = {
            headers: {},
            hostname: this.session.ISession.hostname,
            method: request,
            /* Posix.join forces forward-slash delimiter on Windows.
             * Path join is ok for just the resource part of the URL.
             * We also eliminate any whitespace typos at the beginning
             * or end of basePath or resource.
             */
            path: path.posix.join(path.posix.sep,
                this.session.ISession.basePath.trim(),
                resource.trim()
            ),
            port: this.session.ISession.port,
            rejectUnauthorized: this.session.ISession.rejectUnauthorized
        };

        // NOTE(Kelosky): This cannot be set for http requests
        // options.agent = new https.Agent({secureProtocol: this.session.ISession.secureProtocol});

        // NOTE(Kelosky): we can bring certificate implementation back whenever we port tests and
        // convert for imperative usage

        /**
         * Allow our session's defined identity validator run
         */
        if (this.session.ISession.checkServerIdentity) {
            this.log.trace("Check Server Identity Disabled (Allowing Mismatched Domains)");
            options.checkServerIdentity = this.session.ISession.checkServerIdentity;
        }

        /**
         * Here is where we conditionally perform our HTTP REST request using basic authentication or the stored
         * cookie in our session object.
         */
        if (this.session.ISession.type === AbstractSession.TYPE_BASIC ||
            this.session.ISession.type === AbstractSession.TYPE_TOKEN) {
            if (this.session.ISession.tokenValue) {
                this.log.trace("Using cookie authentication with token %s", this.session.ISession.tokenValue);
                const headerKeys: string[] = Object.keys(Headers.COOKIE_AUTHORIZATION);
                const authentication: string = this.session.ISession.tokenValue;
                headerKeys.forEach((property) => {
                    options.headers[property] = authentication;
                });
            } else {
                this.log.trace("Using basic authentication");
                const headerKeys: string[] = Object.keys(Headers.BASIC_AUTHORIZATION);
                const authentication: string = AbstractSession.BASIC_PREFIX + this.session.ISession.base64EncodedAuth;
                headerKeys.forEach((property) => {
                    options.headers[property] = authentication;
                });
            }
        }

        // for all headers passed into this request, append them to our options object
        reqHeaders = this.appendHeaders(reqHeaders);
        options = this.appendInputHeaders(options, reqHeaders);

        // set transfer flags
        this.setTransferFlags(options.headers);

        const logResource = path.posix.join(path.posix.sep,
            (this.session.ISession.basePath == null ? "" : this.session.ISession.basePath), resource);
        this.log.trace("Rest request: %s %s:%s%s %s", request, this.session.ISession.hostname, this.session.ISession.port,
            logResource, this.session.ISession.user ? "as user " + this.session.ISession.user : "");

        return options;
    }

    /**
     * Callback from http(s).request
     * @private
     * @param {*} res - https response
     * @memberof AbstractRestClient
     */
    private requestHandler(res: any) {
        this.mResponse = res;

        if (this.requestSuccess) {
            if (this.session.ISession.type === AbstractSession.TYPE_TOKEN) {
                if (RestConstants.PROP_COOKIE in this.response.headers) {
                    this.session.storeCookie(this.response.headers[RestConstants.PROP_COOKIE]);
                }
            }
        }

        /**
         * Invoke any onData method whenever data becomes available
         */
        res.on("data", (dataResponse: Buffer) => {
            this.onData(dataResponse);
        });

        /**
         * Invoke any onEnd method whenever all response data has been received
         */
        res.on("end", () => {
            this.onEnd();
        });
    }

    /**
     * Method to accumulate and buffer http request response data until our
     * onEnd method is invoked, at which point all response data has been accounted for.
     * NOTE(Kelosky): this method may be invoked multiple times.
     * @private
     * @param {Buffer} respData - any datatype and content
     * @memberof AbstractRestClient
     */
    private onData(respData: Buffer): void {
        this.log.trace("Data chunk received...");
        this.mData = Buffer.concat([this.mData, respData]);
    }

    /**
     * Method that must be implemented to extend the IRestClient class.  This is the client specific implementation
     * for what action to perform after all response data has been collected.
     * @private
     * @memberof AbstractRestClient
     */
    private onEnd(): void {
        this.log.debug("onEnd() called for rest client %s", this.constructor.name);
        if (this.requestFailure) {
            // Reject the promise with an error
            const errorCode = this.response == null ? undefined : this.response.statusCode;
            this.mReject(this.populateError({
                msg: "Rest API failure with HTTP(S) status " + errorCode,
                causeErrors: this.dataString,
                source: "http"
            }));
        } else {
            this.mResolve(this.dataString);
        }
    }

    /**
     * Construct a throwable rest client error with all "relevant" diagnostic information.
     * The caller should have the session, so not all input fields are present on the error
     * response. Only the set required to understand "what may have gone wrong".
     *
     * The "exit" point for the implementation error override will also be called here. The
     * implementation can choose to transform the IImperativeError details however they see
     * fit.
     *
     * @param {IRestClientError} error - The base request error. It is expected to already have msg,
     *                                   causeErrors, and the error source pre-populated.
     * @param {*} [nodeClientError] - If the source is a node http client error (meaning the request
     *                                did not make it to the remote system) this parameter should be
     *                                populated.
     * @returns {RestClientError} - The error that can be thrown or rejected.
     */
    private populateError(error: IRestClientError, nodeClientError?: any): RestClientError {

        // Final error object parameters
        let finalError: IRestClientError = error;

        // @deprecated - extract the status code - now moved to HTTP status.
        const errorCode = this.response == null ? undefined : this.response.statusCode;

        // start off by coercing the request details to string in case an error is encountered trying
        // to stringify / inspect them
        let headerDetails: string = this.mReqHeaders + "";
        let payloadDetails: string = this.mWriteData + "";
        try {
            headerDetails = JSON.stringify(this.mReqHeaders);
            payloadDetails = inspect(this.mWriteData, { depth: null });
        } catch (stringifyError) {
            this.log.error("Error encountered trying to parse details for REST request error:\n %s", inspect(stringifyError, { depth: null }));
        }

        // Populate the "relevant" fields - caller will have the session, so
        // no need to duplicate "everything" here, just host/port for easy diagnosis
        finalError.errorCode = errorCode;
        finalError.port = this.mSession.ISession.port;
        finalError.host = this.mSession.ISession.hostname;
        finalError.basePath = this.mSession.ISession.basePath;
        finalError.httpStatus = errorCode;
        finalError.errno = (nodeClientError != null) ? nodeClientError.errno : undefined;
        finalError.syscall = (nodeClientError != null) ? nodeClientError.syscall : undefined;
        finalError.payload = this.mWriteData;
        finalError.headers = this.mReqHeaders;
        finalError.resource = this.mResource;
        finalError.request = this.mRequest;

        // Construct a formatted details message
        const detailMessage: string =
        ((finalError.source === "client") ?
        `HTTP(S) client encountered an error. Request could not be initiated to host.\n` +
        `Review connection details (host, port) and ensure correctness.`
        :
        `HTTP(S) error status "${finalError.httpStatus}" received.\n` +
        `Review request details (resource, base path, credentials, payload) and ensure correctness.`) +
        "\n" +
        "\nHost:      " + finalError.host +
        "\nPort:      " + finalError.port +
        "\nBase Path: " + finalError.basePath +
        "\nResource:  " + finalError.resource +
        "\nRequest:   " + finalError.request +
        "\nHeaders:   " + headerDetails +
        "\nPayload:   " + payloadDetails;
        finalError.additionalDetails = detailMessage;

        // Allow implementation to modify the error as necessary
        // TODO - this is probably no longer necessary after adding the custom
        // TODO - error object, but it is left for compatibility.
        const processedError = this.processError(error);
        if (processedError != null) {
            this.log.debug("Error was processed by overridden processError method in RestClient %s", this.constructor.name);
            finalError = { ...finalError, ...processedError };
        }

        // Return the error object
        return new RestClientError(finalError);
    }

    /**
     * Appends output headers to the http(s) request
     * @private
     * @param {IHTTPSOptions} options - partially populated options objects
     * @param {any[]} [reqHeaders] - input headers for request on outgoing request
     * @returns {IHTTPSOptions} - with populated headers
     * @memberof AbstractRestClient
     */
    private appendInputHeaders(options: IHTTPSOptions, reqHeaders?: any[]): IHTTPSOptions {
        this.log.trace("appendInputHeaders called with options on rest client %s",
            JSON.stringify(options), this.constructor.name);
        if (reqHeaders && reqHeaders.length > 0) {
            reqHeaders.forEach((reqHeader: any) => {
                const requestHeaderKeys: string[] = Object.keys(reqHeader);
                requestHeaderKeys.forEach((property) => {
                    options.headers[property] = reqHeader[property];
                });
            });
        }
        return options;
    }

    /**
     * Determine whether we should stringify or leave writable data alone
     * @private
     * @param {http.OutgoingHttpHeaders} headers - options containing populated headers
     * @memberof AbstractRestClient
     */
    private setTransferFlags(headers: http.OutgoingHttpHeaders) {
        if ((headers[Headers.CONTENT_TYPE]) != null) {
            const contentType = headers[Headers.CONTENT_TYPE];
            if (contentType === Headers.APPLICATION_JSON[Headers.CONTENT_TYPE]) {
                this.mIsJson = true;
            } else if (contentType === Headers.OCTET_STREAM[Headers.CONTENT_TYPE]) {
                this.log.debug("Found octet-stream header in request. Will write in binary mode");
            }
        }
    }

    /**
     * Return whether or not a REST request was successful by HTTP status code
     * @readonly
     * @type {boolean}
     * @memberof AbstractRestClient
     */
    get requestSuccess(): boolean {
        if (this.response == null) {
            return false;
        } else {
            return (this.response.statusCode >= RestConstants.HTTP_STATUS_200 &&
                this.response.statusCode < RestConstants.HTTP_STATUS_300);
        }
    }

    /**
     * Return whether or not a REST request was successful by HTTP status code
     * @readonly
     * @type {boolean}
     * @memberof AbstractRestClient
     */
    get requestFailure(): boolean {
        return !this.requestSuccess;
    }

    /**
     * Return http(s) response body as a buffer
     * @readonly
     * @type {Buffer}
     * @memberof AbstractRestClient
     */
    get data(): Buffer {
        return this.mData;
    }

    /**
     * Return http(s) response body as a string
     * @readonly
     * @type {string}
     * @memberof AbstractRestClient
     */
    get dataString(): string {
        if (this.data == null) {
            return undefined;
        }
        return this.data.toString("utf8");
    }

    /**
     * Return http(s) response object
     * @readonly
     * @type {*}
     * @memberof AbstractRestClient
     */
    get response(): any {
        return this.mResponse;
    }

    /**
     * Return this session object
     * @readonly
     * @type {Session}
     * @memberof AbstractRestClient
     */
    get session(): Session {
        return this.mSession;
    }

    /**
     * Return the logger object for ease of reference
     * @readonly
     * @type {Logger}
     * @memberof AbstractRestClient
     */
    get log(): Logger {
        return this.mLogger;
    }
}
