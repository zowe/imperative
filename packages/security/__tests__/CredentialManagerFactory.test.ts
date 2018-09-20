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

import { UnitTestUtils } from "../../../__tests__/src/UnitTestUtils";
import { resolve } from "path";

describe("CredentialManagerFactory", () => {
    const testClassDir = "CredentialManagerFactory-testClasses";

    jest.doMock("../src/DefaultCredentialManager");
    jest.doMock("../../settings/src/AppSettings");
    let {CredentialManagerFactory, DefaultCredentialManager} = require("..");
    let { AppSettings } = require("../../settings");

    beforeEach(() => {
        AppSettings.initialize("We are mocked");
    });

    afterEach(async () => {
        // Because initialize can only be called once, we need to reset the module cache everytime and
        // reload our modules. So we will clear the module registry and import again
        jest.resetModuleRegistry();
        jest.doMock("../src/DefaultCredentialManager");
        jest.doMock("../../settings/src/AppSettings");
        ({CredentialManagerFactory, DefaultCredentialManager} = await import(".."));
        ({AppSettings} = await import("../../settings"));
    });

    it("should throw an error when getting the manager before init", () => {
        expect(() => {
            CredentialManagerFactory.manager.initialize();
        }).toThrowError("Credential Manager not yet initialized!");
    });

    it("should throw an error when initialize is called twice", async () => {
        const caughtError = await UnitTestUtils.catchError((async () => {
            await CredentialManagerFactory.initialize(DefaultCredentialManager, "test");
            await CredentialManagerFactory.initialize(DefaultCredentialManager, "test");
        })());

        expect(caughtError.message).toContain("A call to CredentialManagerFactory.initialize has already been made!");
    });

    describe("Credential manager provided by base cli", () => {
        it("should initialize with the default credential manager", async () => {
            const cliHome = "abcd";

            await CredentialManagerFactory.initialize(DefaultCredentialManager, cliHome);

            expect(DefaultCredentialManager).toHaveBeenCalledTimes(1);
            expect(DefaultCredentialManager).toHaveBeenCalledWith(cliHome);
            expect(CredentialManagerFactory.manager).toBeInstanceOf(DefaultCredentialManager);
            expect(CredentialManagerFactory.manager.initialize).toHaveBeenCalledTimes(1);

            // Check stuff is frozen
            expect(Object.isFrozen(CredentialManagerFactory)).toBe(true);
            expect(Object.isFrozen(CredentialManagerFactory.manager)).toBe(true);
        });

        it("should initialize a classpath that has no initialize method", async () => {
            const classFile = resolve(__dirname, testClassDir, "GoodCredentialManager.ts");

            const GoodCredentialManager = await import(classFile);

            await CredentialManagerFactory.initialize(classFile, "efgh");

            expect(CredentialManagerFactory.manager).toBeInstanceOf(GoodCredentialManager);
            expect((CredentialManagerFactory.manager as any).service).toEqual(GoodCredentialManager.hardcodeService);
        });

        it("should throw an error when the class doesn't extend the AbstractCredentialManager", async () => {
            const classFile = resolve(__dirname, testClassDir, "FailToExtend.ts");
            const actualError = await UnitTestUtils.catchError(CredentialManagerFactory.initialize(classFile, "ijkl"));

            expect(actualError.message).toContain(`${classFile} does not extend AbstractCredentialManager`);
            expect(() => {
                CredentialManagerFactory.manager.initialize();
            }).toThrowError("Credential Manager not yet initialized!");
        });

        it("should handle a load failure", async () => {
            const classFile = resolve(__dirname, testClassDir, "NotAValidFile.ts");
            const actualError = await UnitTestUtils.catchError(CredentialManagerFactory.initialize(classFile, "ijkl"));

            expect(actualError.message).toContain(`Cannot find module '${classFile}'`);
            expect(() => {
                CredentialManagerFactory.manager.initialize();
            }).toThrowError("Credential Manager not yet initialized!");
        });
    });
});
