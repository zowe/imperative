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

import Module = require("module");

import { ImperativeConfig } from "../ImperativeConfig";
import * as path from "path";
import * as findUp from "find-up";

/**
 * This class will allow imperative to intercept calls by plugins so that it can
 * provide them with the runtime instance of imperative / base cli when necessary.
 */
export class PluginRequireProvider {
    /**
     * Create hooks for the specified modules to be injected at runtime.
     *
     * @param modules An array of modules to inject from the host application.
     *
     * @throws {PluginRequireAlreadyCreatedError} when hooks have already been added.
     */
    public static createPluginHooks(modules: string[]) {
        if (PluginRequireProvider.mInstance != null) {
            const {PluginRequireAlreadyCreatedError} = require("./errors/PluginRequireAlreadyCreatedError");
            throw new PluginRequireAlreadyCreatedError();
        }

        this.mInstance = new PluginRequireProvider(modules);
    }

    /**
     * Restore the default node require hook.
     *
     * @throws {PluginRequireNotCreatedError} when hooks haven't been added.
     */
    public static destroyPluginHooks() {
        if (PluginRequireProvider.mInstance == null) {
            const {PluginRequireNotCreatedError} = require("./errors/PluginRequireNotCreatedError");
            throw new PluginRequireNotCreatedError();
        }

        // Set everything back to normal
        Module.prototype.require = PluginRequireProvider.mInstance.origRequire;
        PluginRequireProvider.mInstance = undefined;
    }

    /**
     * Reference to the static singleton instance.
     */
    private static mInstance: PluginRequireProvider;

    /**
     * This regular expression is used by the module loader to
     * escape any valid characters that might be present in provided
     * modules.
     */
    private static sanitizeExpression(module: string) {
        /*
         * This replaces special characters that might be present in a regular expression and an
         * npm package name.
         *
         * @see https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
         */
        return module.replace(/\./g, "\\$&");
    }

    /**
     * Reference to the original require function.
     */
    private origRequire: typeof Module.prototype.require;

    /**
     * Reference to the regular expression used to match modules.
     *
     * This property was added to make testing easier.
     */
    private readonly regex: RegExp;

    /**
     * Construct the class and create hooks into require.
     * @param modules The modules that should be injected from the runtime instance
     */
    private constructor(private readonly modules: string[]) {
        const hostPackageRoot = path.join(
            findUp.sync("package.json", {cwd: ImperativeConfig.instance.callerLocation}),
            ".."
        );

        const hostPackageNameLength = ImperativeConfig.instance.hostPackageName.length;

        // We must remember to escape periods from modules for regular expression
        // purposes.
        const internalModules: string[] = [];

        for (const module of modules) {
            internalModules.push(PluginRequireProvider.sanitizeExpression(module));
        }

        /*
         * Check that the element (or module that we inject) is present at position 0.
         * It was designed this way to support submodule imports.
         *
         * Example:
         * If modules = ["@brightside/imperative"]
         *    request = "@brightside/imperative/lib/errors"
         */
         // This regular expression will match /(@brightside\/imperative)/.*/
        /*
         * The ?: check after the group in the regular expression is to explicitly
         * require that a submodule import has to match. This is to account for the
         * case where one of the packages to be injected is some-test-module and
         * we are requiring some-test-module-from-npm. Without the slash, that
         * module is incorrectly matched and injected.
         */
        const regex = this.regex = new RegExp(`^(${internalModules.join("|")})(?:\\/.*)?$`, "gm");
        const origRequire = this.origRequire = Module.prototype.require;

        Module.prototype.require = function(request: string) {
            // Check to see if the module should be injected
            const doesUseOverrides = request.match(regex);

            if (doesUseOverrides) {
                // Next we need to check if this is the root module. If so, then
                // we need to remap the import.
                if (request.startsWith(ImperativeConfig.instance.hostPackageName)) {
                    if (request === ImperativeConfig.instance.hostPackageName) {
                        arguments[0] = "./";
                    } else {
                        arguments[0] = `${hostPackageRoot}${request.substr(hostPackageNameLength)}`;
                    }
                }

                // Inject it from the main module dependencies
                return origRequire.apply(process.mainModule, arguments);
            } else {
                // Otherwise use the package dependencies
                return origRequire.apply(this, arguments);
            }
        };
    }
}
