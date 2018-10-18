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

import Module = require("module");

import { ImperativeConfig } from "../ImperativeConfig";

/**
 * This class will allow imperative to intercept calls by plugins so that it can
 * provide them with the runtime instance of imperative / base cli when necessary.
 */
export class PluginRequireProvider {
    /**
     * Create hooks for the specified modules to be injected at runtime.
     *
     * @param modules An array of modules to inject from the host application.
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
     */
    public static destroyPluginHooks() {
        if (PluginRequireProvider.mInstance == null) {
            const {PluginRequireNotCreatedError} = require("./errors/PluginRequireNotCreatedError");
            throw new PluginRequireNotCreatedError();
        }

        // Set everything back to normal
        Module.prototype.require = PluginRequireProvider.mInstance.origRequire;
    }

    /**
     * Reference to the static singleton instance.
     */
    private static mInstance: PluginRequireProvider;

    /**
     * Reference to the original require function.
     */
    private origRequire: typeof Module.prototype.require;

    /**
     * Reference to the new require function.
     */
    private require: typeof Module.prototype.require;

    /**
     * Construct the class and create hooks into require.
     * @param modules The modules that should be injected from the runtime instance
     */
    private constructor(private readonly modules: string[]) {
        const origRequire = this.origRequire = Module.prototype.require;

        this.require = Module.prototype.require = function(request: string) {
            // Check for the module in the import path
            const doesUseOverrides = !!modules.find((element) => {
                /*
                 * Check that the element (or module that we inject) is present at position 0.
                 * It was designed this way to support submodule imports
                 *
                 * Example:
                 * If modules = ["@brightside/imperative"]
                 *    request = "@brightside/imperative/lib/errors"
                 *
                 * This function will match @brightside/imperative
                 *
                 */
                return request.startsWith(element);
            });

            if (doesUseOverrides) {
                // Next we need to check if this is the root module. If so, then
                // we need to remap the import.
                if (request.startsWith(ImperativeConfig.instance.hostPackageName)) {
                    arguments[0] = "./";
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
