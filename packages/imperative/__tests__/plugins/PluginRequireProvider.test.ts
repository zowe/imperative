/*
 * This program and the accompanying materials are made available under the terms of the *
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at  *
 * https://www.eclipse.org/legal/epl-v20.html                                            *
 *                                                                                       *
 * SPDX-License-Identifier: EPL-2.0                                                      *
 *                                                                                       *
 * Copyright Contributors to the Zowe Project.                                           *
 *                                                                                       *
 */

import { getMockWrapper } from "../../../../__tests__/__src__/types/MockWrapper";

jest.mock("../../src/ImperativeConfig");
jest.mock("find-up");

import Module = require("module");

import * as findUp from "find-up";
import {ImperativeConfig} from "../../src/ImperativeConfig";
import {PluginRequireProvider} from "../../src/plugins/PluginRequireProvider";
import { PluginRequireAlreadyCreatedError } from "../../src/plugins/errors/PluginRequireAlreadyCreatedError";


describe("PluginRequireProvider", () => {
    /**
     * Object that allows access to internals of the PluginRequireProvider.
     */
    const mPluginRequireProvider: {
        mInstance: {
            origRequire: typeof Module.prototype.require,
            modules: string[]
        }
    } = PluginRequireProvider as any;

    const mocks = getMockWrapper({
        findUpSync: findUp.sync
    });

    /**
     * Stores the original require passed at the beginning of testing.
     */
    let originalRequire: typeof Module.prototype.require;

    /**
     * Checks that the environment is clean both before and after a test.
     *
     * @throws An error when the environment is not in a clean state.
     */
    const checkForCleanEnvironment = (isAfterEach = false) => {
        try {
            expect(mPluginRequireProvider.mInstance).toBeUndefined();
        } catch (e) {
            throw new Error(
                (isAfterEach ? "Bad environment state detected after running this test!\n\n" : "") +
                "The PluginRequireInstance was not properly cleaned up in a previous test. Please check that the failing " +
                "test is running PluginRequireProvider.destroyPluginHooks() or cleans up PluginRequireProvider.mInstance " +
                "before exiting."
            );
        }
    };

    // Gets a reference to the original require before each test
    beforeEach(() => {
        originalRequire = Module.prototype.require;
        checkForCleanEnvironment();
    });

    // Restores the original require
    afterEach(() => {
        Module.prototype.require = originalRequire;
        checkForCleanEnvironment(true);
    });

    it("should override and cleanup the module require", () => {
        // Inject a dummy require so we can check it.
        const newRequire = Module.prototype.require = jest.fn(function() {
            // console.log(arguments);

            return originalRequire.apply(this, arguments);
        });

        mocks.findUpSync.mockReturnValueOnce("does-not-matter");

        PluginRequireProvider.createPluginHooks(["test"]);

        // Checks that we have indeed overridden the module require
        expect(mPluginRequireProvider.mInstance.origRequire).toBe(newRequire);
        expect(Module.prototype.require).not.toBe(newRequire);
        expect(mPluginRequireProvider.mInstance.modules).toEqual(["test"]);

        expect(mocks.findUpSync).toHaveBeenLastCalledWith(
            "package.json",
            {cwd: ImperativeConfig.instance.callerLocation}
        );

        // Perform the cleanup
        PluginRequireProvider.destroyPluginHooks();

        expect(Module.prototype.require).toBe(newRequire);
        expect(mPluginRequireProvider.mInstance).toBeUndefined();
    });

    describe("environment stability", () => {
        it("should guard against adding multiple hooks", () => {
            mocks.findUpSync.mockReturnValue("does-not-matter");

            expect(() => {
                PluginRequireProvider.createPluginHooks(["test"]);
                PluginRequireProvider.createPluginHooks(["test"]);
            }).toThrow(PluginRequireAlreadyCreatedError);

            PluginRequireProvider.destroyPluginHooks();
        });
    });
});
