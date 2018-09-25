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

import { UnitTestUtils } from "../../../__tests__/src/UnitTestUtils";
import { resolve } from "path";
import { generateRandomAlphaNumericString } from "../../../__tests__/src/TestUtil";

describe("CredentialManagerFactory", () => {
    const testClassDir = "CredentialManagerFactory-testClasses";

    jest.doMock("../src/DefaultCredentialManager");
    jest.doMock("../../settings/src/AppSettings");
    let {CredentialManagerFactory, DefaultCredentialManager, BadCredentialManagerError} = require("..");
    let {InvalidCredentialManager} = require("../src/InvalidCredentialManager");
    let {AppSettings} = require("../../settings");

    beforeEach(() => {
        AppSettings.initialize("We are mocked");
    });

    afterEach(async () => {
        // Because initialize can only be called once, we need to reset the module cache everytime and
        // reload our modules. So we will clear the module registry and import again
        jest.resetModuleRegistry();
        jest.doMock("../src/DefaultCredentialManager");
        jest.doMock("../../settings/src/AppSettings");
        ({CredentialManagerFactory, DefaultCredentialManager, BadCredentialManagerError} = await import(".."));
        ({InvalidCredentialManager} = await import("../src/InvalidCredentialManager"));
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

    describe("Credential manager provided by base cli", () => {
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

    describe("Emulating a loaded plugin", () => {
        const nameMaxLength = 32;
        const emulated: { pluginName: string; cliName: string } = {
            pluginName: "",
            cliName: ""
        };

        beforeEach(async () => {
            // Generate a random name so we can verify that different names work
            emulated.pluginName = generateRandomAlphaNumericString(Math.floor((Math.random() * nameMaxLength) + 1));
            emulated.cliName = generateRandomAlphaNumericString(Math.floor((Math.random() * nameMaxLength) + 1));
            await AppSettings.instance.setNewOverride("CredentialManager", emulated.pluginName);
        });

        it("should throw an error when the class doesn't extend the AbstractCredentialManager", async () => {
            const classFile = require(resolve(__dirname, testClassDir, "FailToExtend.ts"));
            await CredentialManagerFactory.initialize(classFile, emulated.cliName);

            expect(CredentialManagerFactory.manager).toBeInstanceOf(InvalidCredentialManager);

            // Call a function to see if the error gets thrown up properly
            const actualError = await UnitTestUtils.catchError(
                CredentialManagerFactory.manager.save("test", "test")
            );

            expect(actualError).toBeInstanceOf(BadCredentialManagerError);
            expect(actualError.message).toEqual("An invalid credential manager was passed in to the factory function!");
            expect((actualError as typeof BadCredentialManagerError).additionalDetails).toEqual(
                "A bad object was provided to the CredentialManagerFactory.initialize() method. This could be " +
                "due to a bad plugin."
            );
        });

        it("should handle being passed an object that isn't a class or string", async () => {
            await CredentialManagerFactory.initialize([] as any, emulated.cliName);

            expect(CredentialManagerFactory.manager).toBeInstanceOf(InvalidCredentialManager);

            // Call a function to see if the error gets thrown up properly
            const actualError = await UnitTestUtils.catchError(
                CredentialManagerFactory.manager.save("test", "test")
            );

            expect(actualError).toBeInstanceOf(BadCredentialManagerError);
            expect(actualError.message).toEqual("An invalid credential manager was passed in to the factory function!");
            expect((actualError as typeof BadCredentialManagerError).additionalDetails).toEqual(
                "Manager is not a constructor"
            );
        });
    });
});
