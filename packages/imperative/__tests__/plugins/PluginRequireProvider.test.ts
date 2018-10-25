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
jest.mock("path");

import Module = require("module");

import * as findUp from "find-up";
import {ImperativeConfig} from "../../src/ImperativeConfig";
import {PluginRequireProvider} from "../../src/plugins/PluginRequireProvider";
import { PluginRequireAlreadyCreatedError } from "../../src/plugins/errors/PluginRequireAlreadyCreatedError";
import { PluginRequireNotCreatedError } from "../../src/plugins/errors/PluginRequireNotCreatedError";
import * as path from "path";
import { generateRandomAlphaNumericString } from "../../../../__tests__/src/TestUtil";

describe("PluginRequireProvider", () => {
    /**
     * This is an indicator that helps our require method to determine if a require
     * for testing purposes only.
     *
     * @example <caption>Passing to a mocked require</caption>
     *
     * // Assume that all setup has been done
     * (require as any)(request, testRequireIndicator);
     */
    const testRequireIndicator = "__TEST_REQUIRE__";

    /**
     * Object that allows access to internals of the PluginRequireProvider.
     */
    const mPluginRequireProvider: {
        mInstance: {
            origRequire: typeof Module.prototype.require,
            modules: string[],
            regex: RegExp
        }
    } = PluginRequireProvider as any;

    const mocks = getMockWrapper({
        findUpSync: findUp.sync,
        join: path.join
    });

    /**
     * Stores the original require passed at the beginning of testing.
     */
    let originalRequire: typeof Module.prototype.require;

    /**
     * Stores the jest require object so that jest doesn't intercept us
     */
    let originalRequireJest: typeof require;

    /**
     * Checks that the environment is clean both before and after a test. This check is done
     * in both the beforeEach and afterEach sections of the tests. I decided to
     * do it this way so that once a test fails, all other tests from this suite
     * should fail. This should protect the real Module.prototype.require from
     * being obliterated because of something we've done to cause a test to fail.
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

    /**
     * This function is responsible for overriding the require interface with
     * our dummy require. It will ensure that normal requires still happen as usual
     * while test requires don't try to load anything.
     */
    const getMockedRequire = () => {


        /*
         * Override the real require method with a jest mock method. Our function
         * will accept a string with an optional second parameter of the indicator.
         *
         * If the indicator variable is not present, then the mock will treat it as
         * a normal require.
         *
         * If the indicator variable is present, then the mock will abort the require
         * attempt.
         *
         * This method protects the node module loader by allowing genuine requires
         * to still go through while preventing our test requires. This allows
         * the tests to still function correctly without us mucking up node with
         * bogus test requires.
         */
        return (require as any) = Module.prototype.require = jest.fn(function(request: string, testCheck?: typeof testRequireIndicator | any) {
            if (arguments[1] === testRequireIndicator) {
                return;
            } else {
                return originalRequire.apply(this, arguments);
            }
        });
    };

    // Gets a reference to the original require before each test
    beforeEach(() => {
        // Clean up the mocks present in the mock object
        for (const mock of Object.values(mocks)) {
            mock.mockClear();
        }

        originalRequire = Module.prototype.require;
        originalRequireJest = require;
        checkForCleanEnvironment();
    });

    // Restores the original require
    afterEach(() => {
        // Ensure that the proper module loader is set back as the prototype.
        Module.prototype.require = originalRequire;
        require = originalRequireJest;
        checkForCleanEnvironment(true);
    });

    it("should override and cleanup the module require", () => {
        // Inject a dummy require so we can check it.
        const mockedRequire = getMockedRequire();

        mocks.findUpSync.mockReturnValueOnce("will-be-tested");

        PluginRequireProvider.createPluginHooks(["test"]);

        // Checks that we have indeed overridden the module require
        expect(mPluginRequireProvider.mInstance.origRequire).toBe(mockedRequire);
        expect(Module.prototype.require).not.toBe(mockedRequire);
        expect(mPluginRequireProvider.mInstance.modules).toEqual(["test"]);

        expect(mocks.findUpSync).toHaveBeenLastCalledWith(
            "package.json",
            {cwd: ImperativeConfig.instance.callerLocation}
        );

        expect(mocks.join).toHaveBeenLastCalledWith("will-be-tested", "..");

        // Perform the cleanup
        PluginRequireProvider.destroyPluginHooks();

        expect(Module.prototype.require).toBe(mockedRequire);
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

        it("should guard against destroying hooks that haven't been created", () => {
           expect(() => {
               PluginRequireProvider.destroyPluginHooks();
           }).toThrow(PluginRequireNotCreatedError);
        });
    });

    describe("injection tests", () => {
        const MAX_NPM_PACKAGE_NAME_LENGTH = 214;

        describe("use proper regex format", () => {
            // We don't need to worry about checking anything with a special character
            // including the | since an npm package must be url safe :)
            const tests = {
                "1 module": ["this-is-a-test"],
                "3 modules": ["this-is-a-test", "@another/module", "and_another_one"],
                "3 modules of max length": [
                    generateRandomAlphaNumericString(MAX_NPM_PACKAGE_NAME_LENGTH).toLowerCase(),
                    generateRandomAlphaNumericString(MAX_NPM_PACKAGE_NAME_LENGTH).toLowerCase(),
                    generateRandomAlphaNumericString(MAX_NPM_PACKAGE_NAME_LENGTH).toLowerCase(),
                ],
                "1 module with periods": ["test.with.periods.for.package"]
            };

            // Loop through the tests object so we can quickly check that
            // the requires are correct
            Object.entries(tests).forEach( ([testName, injectedModules]) => {
                it(`should pass test: ${testName}`, () => {
                    // const nonMatchingModule = "some-non-matching-test-input";

                    // The first thing to check is that the
                    // nonMatchingModule isn't in the test array
                    // expect(injectedModules.indexOf(nonMatchingModule)).toEqual(-1);

                    // Inject a dummy require so we can check it.
                    getMockedRequire();

                    mocks.findUpSync.mockReturnValue("does-not-matter");
                    mocks.join.mockReturnValue("does-not-matter");

                    // Inject our test modules
                    PluginRequireProvider.createPluginHooks(injectedModules);

                    expect(mPluginRequireProvider.mInstance.regex).toEqual(
                        new RegExp(`(${injectedModules.join("|")}).*`)
                    );

                    PluginRequireProvider.destroyPluginHooks();

                    // Force the regex match to always return false so we don't enter the
                    // require area. That will be a different set of tests
                    // (nonMatchingModule.match as any).mockReturnValue(false);

                    // If all went well, this should be dispatched to the mockedRequire
                    // which should abort the require due to the input being an object.
                    // expect((require as any)(nonMatchingModule, testRequireIndicator)).toBeUndefined();
                });
            });
        });

        describe("module injection", () => {
            const tests = {
                "1 module": ["this-is-a-test"],
                "3 modules": ["this-is-a-test", "@another/module", "and_another_one"],
                "3 modules of max length": [
                    generateRandomAlphaNumericString(MAX_NPM_PACKAGE_NAME_LENGTH).toLowerCase(),
                    generateRandomAlphaNumericString(MAX_NPM_PACKAGE_NAME_LENGTH).toLowerCase(),
                    generateRandomAlphaNumericString(MAX_NPM_PACKAGE_NAME_LENGTH).toLowerCase(),
                ],
                "1 module with periods": ["test.with.periods.for.package"]
            };

            Object.entries(tests).forEach(([testName, someTestObjectToBeDefinedLater]) => {
                describe(`${testName}`, () => {
                    it("should redirect to the original require", () => {
                        pending();
                    });

                    it("should redirect to an injected module", () => {
                        pending();
                    });

                    it("should redirect to the proper host package", () => {
                        pending();
                    });

                    it("should redirect to the proper host package submodule import", () => {
                        pending();
                    });
                });
            });
        });
    });
});
