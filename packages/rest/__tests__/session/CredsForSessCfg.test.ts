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
import { CliUtils } from "../../../utilities/src/CliUtils";
import { ImperativeError } from "../../../error";
import * as SessConstants from "../../src/session/SessConstants";

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

    it("get user name from prompt", async() => {
        const userFromPrompt = "FakeUser";
        const passFromArgs = "FakePassword";

        const sleepReal = CliUtils.sleep;
        CliUtils.sleep = jest.fn();
        const promptWithTimeoutReal = CliUtils.promptWithTimeout;
        CliUtils.promptWithTimeout = jest.fn(() => {
            return userFromPrompt;
        });

        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            password: passFromArgs,
        };

        let sessCfgWithCreds: ISession;
        sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args
        );
        CliUtils.sleep = sleepReal;
        CliUtils.promptWithTimeout = promptWithTimeoutReal;

        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_BASIC);
        expect(sessCfgWithCreds.user).toBe(userFromPrompt);
        expect(sessCfgWithCreds.password).toBe(passFromArgs);
        expect(sessCfgWithCreds.tokenType).toBeUndefined();
        expect(sessCfgWithCreds.tokenValue).toBeUndefined();
    });

    it("get password from prompt", async() => {
        const userFromArgs = "FakeUser";
        const passFromPrompt = "FakePassword";

        const sleepReal = CliUtils.sleep;
        CliUtils.sleep = jest.fn();
        const promptWithTimeoutReal = CliUtils.promptWithTimeout;
        CliUtils.promptWithTimeout = jest.fn(() => {
            return passFromPrompt;
        });

        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            user: userFromArgs,
        };

        let sessCfgWithCreds: ISession;
        sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
            intialSessCfg, args
        );
        CliUtils.sleep = sleepReal;
        CliUtils.promptWithTimeout = promptWithTimeoutReal;

        expect(sessCfgWithCreds.type).toBe(SessConstants.AUTH_TYPE_BASIC);
        expect(sessCfgWithCreds.user).toBe(userFromArgs);
        expect(sessCfgWithCreds.password).toBe(passFromPrompt);
        expect(sessCfgWithCreds.tokenType).toBeUndefined();
        expect(sessCfgWithCreds.tokenValue).toBeUndefined();
    });

    it("timeout waiting for user name", async() => {
        const sleepReal = CliUtils.sleep;
        CliUtils.sleep = jest.fn();
        const promptWithTimeoutReal = CliUtils.promptWithTimeout;
        CliUtils.promptWithTimeout = jest.fn(() => null);

        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            password: "FakePassword",
        };

        let sessCfgWithCreds: ISession;
        let caughtError;
        try {
            sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
                intialSessCfg, args
            );
        } catch (thrownError) {
            caughtError = thrownError;
        }
        CliUtils.sleep = sleepReal;
        CliUtils.promptWithTimeout = promptWithTimeoutReal;
        expect(caughtError instanceof ImperativeError).toBe(true);
        expect(caughtError.message).toBe("We timed-out waiting for user name.");
    });

    it("timeout waiting for password", async() => {
        const sleepReal = CliUtils.sleep;
        CliUtils.sleep = jest.fn();
        const promptWithTimeoutReal = CliUtils.promptWithTimeout;
        CliUtils.promptWithTimeout = jest.fn(() => null);

        const intialSessCfg = {
            hostname: "SomeHost",
            port: 11,
            rejectUnauthorized: true,
        };
        const args = {
            user: "FakeUser",
        };

        let sessCfgWithCreds: ISession;
        let caughtError;
        try {
            sessCfgWithCreds = await CredsForSessCfg.addCredsOrPrompt<ISession>(
                intialSessCfg, args
            );
        } catch (thrownError) {
            caughtError = thrownError;
        }
        CliUtils.sleep = sleepReal;
        CliUtils.promptWithTimeout = promptWithTimeoutReal;
        expect(caughtError instanceof ImperativeError).toBe(true);
        expect(caughtError.message).toBe("We timed-out waiting for password.");
    });
});
