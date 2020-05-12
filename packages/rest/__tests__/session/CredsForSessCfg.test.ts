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

import { CredsForSessCfg } from "../../src/session/CredsForSessCfg";
import { ImperativeError } from "../../../error";
import * as SessConstants from "../../src/session/SessConstants";

const waitForPrompt = 40000; // 40 sec is more than our prompting timeout of 30 sec

describe("CredsForSessCfg tests", () => {

    it("authenticate with user and pass", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            user: "FakeUser",
            password: "FakePassword"
        };
        const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args
        );
        expect(sessCfgWithCreds.hostname).toBe("SomeHost");
        expect(sessCfgWithCreds.user).toBe("FakeUser");
        expect(sessCfgWithCreds.password).toBe("FakePassword");
        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_BASIC);
        expect(sessCfgWithCreds.tokenValue).toBeUndefined();
        expect(sessCfgWithCreds.tokenType).toBeUndefined();
    });

    it("authenticate with user, pass, and tokenType to get token", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            user: "FakeUser",
            password: "FakePassword",
            tokenType: SessConstants.TOKEN_TYPE_JWT
        };
        const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args, {requestToken: true}
        );
        expect(sessCfgWithCreds.hostname).toBe("SomeHost");
        expect(sessCfgWithCreds.user).toBe("FakeUser");
        expect(sessCfgWithCreds.password).toBe("FakePassword");
        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_TOKEN);
        expect(sessCfgWithCreds.tokenType).toBe(SessConstants.TOKEN_TYPE_JWT);
        expect(sessCfgWithCreds.tokenValue).toBeUndefined();
    });

    it("authenticate with user, pass, and *NO* tokenType to get token", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            user: "FakeUser",
            password: "FakePassword"
        };
        const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args, {requestToken: true}
        );
        expect(sessCfgWithCreds.hostname).toBe("SomeHost");
        expect(sessCfgWithCreds.user).toBe("FakeUser");
        expect(sessCfgWithCreds.password).toBe("FakePassword");
        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_TOKEN);
        expect(sessCfgWithCreds.tokenType).toBe(SessConstants.TOKEN_TYPE_LTPA); // TODO:Gene: replace with SessConstants.TOKEN_TYPE_APIML
        expect(sessCfgWithCreds.tokenValue).toBeUndefined();
    });

    it("authenticate with token value", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            tokenValue: "FakeToken",
        };
        const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args
        );
        expect(sessCfgWithCreds.hostname).toBe("SomeHost");
        expect(sessCfgWithCreds.tokenValue).toBe("FakeToken");
        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_BEARER);
        expect(sessCfgWithCreds.user).toBeUndefined();
        expect(sessCfgWithCreds.password).toBeUndefined();
    });

    it("authenticate with token value and token type", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            tokenValue: "FakeToken",
            tokenType: SessConstants.TOKEN_TYPE_APIML
        };
        const sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args
        );
        expect(sessCfgWithCreds.hostname).toBe("SomeHost");
        expect(sessCfgWithCreds.tokenValue).toBe("FakeToken");
        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_TOKEN);
        expect(sessCfgWithCreds.tokenType).toBe(SessConstants.TOKEN_TYPE_APIML);
        expect(sessCfgWithCreds.user).toBeUndefined();
        expect(sessCfgWithCreds.password).toBeUndefined();
    });

    it("not prompt when asked not to prompt", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
        };

        let sessCfgWithCreds: ISession;
        sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args, {doPrompting: false}
        );
        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_BASIC);
        expect(sessCfgWithCreds.user).toBeUndefined();
        expect(sessCfgWithCreds.password).toBeUndefined();
        expect(sessCfgWithCreds.tokenType).toBeUndefined();
        expect(sessCfgWithCreds.tokenValue).toBeUndefined();
    });

    it("timeout waiting for user name", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            password: "FakePassword",
        };

        /* Jest hangs forever when you request data from stdin.
         * mock-stdin should let you supply data. We could not make that work.
         * At least with mock-stdin we only get our expected 30 second timout.
         */
        const mockStdIn = require("mock-stdin").stdin();
        mockStdIn.send("FakeUser\n");   // this does not work
        mockStdIn.end();

        /* jest redirects stdin and we could not override it.
         * So we catch the timeout error.
         */
        let sessCfgWithCreds: ISession;
        let caughtError;
        try {
            sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
                intialSessCfg, args
            );
        } catch (thrownError) {
            caughtError = thrownError;
        }
        expect(caughtError instanceof ImperativeError).toBe(true);
        expect(caughtError.message).toBe("We timed-out waiting for user name.");
    }, waitForPrompt);

    it("timeout waiting for password", async() => {
        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            user: "FakeUser",
        };

        /* Jest hangs forever when you request data from stdin.
         * mock-stdin should let you supply data. We could not make that work.
         * At least with mock-stdin we only get our expected 30 second timout.
         */
        const mockStdIn = require("mock-stdin").stdin();
        mockStdIn.send("FakePassword\n");   // this does not work
        mockStdIn.end();

        /* jest redirects stdin and we could not override it.
         * So we catch the timeout error.
         */
        let sessCfgWithCreds: ISession;
        let caughtError;
        try {
            sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
                intialSessCfg, args
            );
        } catch (thrownError) {
            caughtError = thrownError;
        }
        expect(caughtError instanceof ImperativeError).toBe(true);
        expect(caughtError.message).toBe("We timed-out waiting for password.");
    }, waitForPrompt);
});
