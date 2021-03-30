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

import { CredentialManagerFactory } from "../../security";
import { ProfileCredentials } from "../src/ProfileCredentials";

jest.mock("../../security/src/CredentialManagerFactory");

describe("ProfileCredentials tests", () => {
    describe("isSecured", () => {
        it("should always be true for team config", () => {
            const profCreds = new ProfileCredentials({
                usingTeamConfig: true
            } as any);
            expect(profCreds.isSecured).toBe(true);
        });

        it("should be true for old school profiles if CredentialManager is set", () => {
            const profCreds = new ProfileCredentials({
                usingTeamConfig: false
            } as any);
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(true);
            expect(profCreds.isSecured).toBe(true);
        });

        it("should be false for old school profiles if CredentialManager is not set", () => {
            const profCreds = new ProfileCredentials({
                usingTeamConfig: false
            } as any);
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false);
            expect(profCreds.isSecured).toBe(false);
        });

        it("should be cached for subsequent calls", () => {
            const profCreds = new ProfileCredentials({
                usingTeamConfig: false
            } as any);
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false).mockReturnValueOnce(true);
            expect(profCreds.isSecured).toBe(false);
            // expect a 2nd time to ensure value has not changed
            expect(profCreds.isSecured).toBe(false);
        });
    });

    describe("loadManager", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("should fail if secure credential storage is disabled", async () => {
            const profCreds = new ProfileCredentials(null);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(false);
            let caughtError;

            try {
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toBe("Secure credential storage is not enabled");
        });

        it("should initialize CredentialManagerFactory once with good credential manager", async () => {
            const profCreds = new ProfileCredentials({
                usingTeamConfig: false
            } as any);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(true);
            jest.spyOn(CredentialManagerFactory, "initialize").mockImplementation(async () => {
                Object.defineProperty(CredentialManagerFactory, "initialized", {
                    get: jest.fn().mockReturnValueOnce(true)
                });
            });
            let caughtError;

            try {
                await profCreds.loadManager();
                // load a 2nd time to ensure nothing happens
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            console.log(caughtError);
            expect(caughtError).toBeUndefined();
            expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        });

        it("should fail to initialize CredentialManagerFactory with bad credential manager", async () => {
            const profCreds = new ProfileCredentials({
                usingTeamConfig: false
            } as any);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(true);
            jest.spyOn(CredentialManagerFactory, "initialize").mockImplementation(async () => {
                throw new Error("bad credential manager");
            });
            let caughtError;

            try {
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toBe("Failed to load CredentialManager class");
            expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        });
    });
});
