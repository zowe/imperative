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

import * as https from "https";
import * as http from "http";
import { Session } from "../../src/session/Session";
import { RestClient } from "../../src/client/RestClient";
import { Headers } from "../../src/client/Headers";
import { ProcessUtils } from "../../../utilities";
import { MockHttpRequestResponse } from "./__model__/MockHttpRequestResponse";
import { EventEmitter } from "events";
import { ImperativeError } from "../../../error";


/**
 * To test the AbstractRestClient, we use the existing default RestClient which
 * extends AbstractRestClient to use as a __model__.
 */

describe("AbstractRestClient tests", () => {

    it("should not append any headers to a request by default", () => {
        const client = new RestClient(new Session({hostname: "test"}));
        expect((client as any).appendHeaders(["Test"])).toMatchSnapshot();
        expect((client as any).appendHeaders(undefined)).toMatchSnapshot();
    });

    it("should give an error when no session is provided", async () => {
        let error;

        try {
            await RestClient.getExpectString(undefined, "/resource");
        } catch (thrownError) {
            error = thrownError;
        }

        expect(error.message).toMatchSnapshot();
    });

    it("should give an error when no resource URI is provided", async () => {
        let error;

        try {
            await RestClient.getExpectString(new Session({hostname: "test"}), "  ");
        } catch (thrownError) {
            error = thrownError;
        }

        expect(error.message).toMatchSnapshot();
    });

    it("should not error when chunking data and payload data are present in outgoing request", async () => {

        interface IPayload {
            data: string;
        }

        interface IResponseload {
            newData: string;
        }

        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("{\"newData\":", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("\"response data\"}", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });

            return emitter;
        });

        (https.request as any) = requestFnc;

        const payload: IPayload = {
            data: "input data",
        };

        const data = await RestClient.putExpectJSON<IResponseload>(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], payload);
        expect(data).toMatchSnapshot();
    });

    it("should error with request rejection when status code is not in 200 range", async () => {

        interface IResponseload {
            newData: string;
        }

        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                newEmit.statusCode = "400";
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("{\"newData\":", "utf8"));
                });

                // missing closing bracket
                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("\"response data\"}", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });
            return emitter;
        });

        (https.request as any) = requestFnc;
        const headers: any = [{"My-Header": "value is here"}];
        const payload: any = {"my payload object": "hello"};
        let error;
        try {
            await RestClient.putExpectJSON<IResponseload>(new Session({hostname: "test"}), "/resource", headers, payload);
        } catch (thrownError) {
            error = thrownError;
        }
        expect(error instanceof ImperativeError).toBe(true);
        expect(error.message).toMatchSnapshot();
        expect(error.errorCode).toMatchSnapshot();
        expect(error.causeErrors).toMatchSnapshot();
        for (const header of headers) {
            // make sure the error contains the headers that were appended to the request
            for (const key of Object.keys(header)) {
                expect(error.additionalDetails).toContain(key);
                expect(error.additionalDetails).toContain(header[key]);
            }
        }
        expect(error.additionalDetails).toMatchSnapshot();
    });

    it("should error when chunking JSON data that does not parse", async () => {

        interface IResponseload {
            newData: string;
        }

        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("{\"newData\":", "utf8"));
                });

                // missing closing bracket
                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("\"response data\"", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });

            return emitter;
        });

        (https.request as any) = requestFnc;

        let error;
        try {
            const data = await RestClient.getExpectJSON<IResponseload>(new Session({hostname: "test"}), "/resource");
        } catch (thrownError) {
            error = thrownError;
        }
        expect(error instanceof ImperativeError).toBe(true);
        expect(error.message).toMatchSnapshot();
    });

    it("should error when chunking JSON data that does not parse and allow post payload", async () => {

        interface IPayload {
            data: string;
        }

        interface IResponseload {
            newData: string;
        }

        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("{\"newData\":", "utf8"));
                });

                // missing closing bracket
                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("\"response data\"", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });

            return emitter;
        });

        (https.request as any) = requestFnc;

        const payload: IPayload = {
            data: "input data",
        };

        let error;
        try {
            const data = await RestClient.postExpectJSON<IResponseload>(new Session({hostname: "test"}),
                "/resource", [Headers.APPLICATION_JSON], payload);
        } catch (thrownError) {
            error = thrownError;
        }
        expect(error instanceof ImperativeError).toBe(true);
        expect(error.message).toMatchSnapshot();
        expect(error.errorCode).toMatchSnapshot();
    });

    it("should not error when headers and payload data are present in outgoing request", async () => {

        interface IPayload {
            data: string;
        }

        interface IResponseload {
            newData: string;
        }

        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("{\"newData\": \"response data\"}", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });

            return emitter;
        });

        (https.request as any) = requestFnc;

        const payload: IPayload = {
            data: "input data",
        };

        const data = await RestClient.putExpectJSON<IResponseload>(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], payload);
        expect(data).toMatchSnapshot();
    });

    it("should not error when data and end events are sent", async () => {
        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("Sample data", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });

            return emitter;
        });

        (https.request as any) = requestFnc;

        const data = await RestClient.getExpectString(new Session({hostname: "test"}), "/resource");
        expect(data).toMatchSnapshot();
    });

    // called IRL when no connectivity
    it("should give an error message when error event is called", async () => {
        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(() => {
                callback(new EventEmitter());
                ProcessUtils.nextTick(() => {
                    emitter.emit("error", "value");
                });
            });
            return emitter;
        });

        (https.request as any) = requestFnc;

        let error;

        try {
            await RestClient.getExpectString(new Session({hostname: "test"}), "/resource");
        } catch (thrownError) {
            error = thrownError;
        }

        expect(error.message).toMatchSnapshot();
    });

    it("should call http request for http requests", async () => {
        const requestEmitter = new MockHttpRequestResponse();
        const httpRequestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(() => {
                callback(new EventEmitter());
                ProcessUtils.nextTick(() => {
                    requestEmitter.emit("error", "value");
                });
            });

            return requestEmitter;
        });

        const emitter = new MockHttpRequestResponse();
        const httpsRequestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(() => {
                callback(new EventEmitter());
                ProcessUtils.nextTick(() => {
                    emitter.emit("error", "value");
                });
            });

            return emitter;
        });

        (https.request as any) = httpsRequestFnc;
        (http.request as any) = httpRequestFnc;

        let error;

        try {
            await RestClient.getExpectString(new Session({hostname: "test", protocol: "http"}), "/resource");
        } catch (thrownError) {
            error = thrownError;
        }

        expect(httpRequestFnc).toBeCalled();
        expect(httpsRequestFnc).not.toBeCalled();
    });

    it("should call https request for https requests", async () => {
        const requestEmitter = new MockHttpRequestResponse();
        const httpRequestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(() => {
                callback(new EventEmitter());
                ProcessUtils.nextTick(() => {
                    requestEmitter.emit("error", "value");
                });
            });
            return requestEmitter;
        });
        const httpsRequestFnc = jest.fn((options, callback) => {
            const emitter = new MockHttpRequestResponse();
            ProcessUtils.nextTick(() => {
                callback(new EventEmitter());
                ProcessUtils.nextTick(() => {
                    emitter.emit("error", "value");
                });
            });
            return emitter;
        });

        (https.request as any) = httpsRequestFnc;
        (http.request as any) = httpRequestFnc;

        let error;
        try {
            await RestClient.getExpectString(new Session({hostname: "test"}), "/resource");
        } catch (thrownError) {
            error = thrownError;
        }
        expect(httpsRequestFnc).toBeCalled();
        expect(httpRequestFnc).not.toBeCalled();
    });

    it("should not error when streaming data", async () => {

        interface IPayload {
            data: string;
        }

        const fakeResponseStream: any = {
            write: jest.fn(),
            on: jest.fn(),
            end: jest.fn()
        };
        const fakeRequestStream: any = {
            on: jest.fn((eventName: string, callback: any) => {
                // do nothing
            }),
        };
        const emitter = new MockHttpRequestResponse();
        const requestFnc = jest.fn((options, callback) => {
            ProcessUtils.nextTick(async () => {

                const newEmit = new MockHttpRequestResponse();
                callback(newEmit);

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("{\"newData\":", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("data", Buffer.from("\"response data\"}", "utf8"));
                });

                await ProcessUtils.nextTick(() => {
                    newEmit.emit("end");
                });
            });

            return emitter;
        });

        (https.request as any) = requestFnc;

        await RestClient.putStreamed(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], fakeResponseStream, fakeRequestStream);

        await RestClient.postStreamed(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], fakeResponseStream, fakeRequestStream);

        await RestClient.putStreamedRequestOnly(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], fakeRequestStream);

        await RestClient.postStreamedRequestOnly(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], fakeRequestStream);

        await RestClient.getStreamed(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], fakeResponseStream);

        await RestClient.deleteStreamed(new Session({
            hostname: "test",
        }), "/resource", [Headers.APPLICATION_JSON], fakeResponseStream);
    });
});
