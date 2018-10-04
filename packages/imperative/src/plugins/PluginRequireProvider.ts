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

/**
 * This class will allow imperative to intercept calls by plugins so that it can
 * provide them with the runtime instance of imperative / base cli when necessary.
 */
export class PluginRequireProvider {
    public static createPluginHooks(modules: string[]) {
        if (PluginRequireProvider.mInstance != null) {
            const {PluginRequireAlreadyCreatedError} = require("./errors/PluginRequireAlreadyCreatedError");
            throw new PluginRequireAlreadyCreatedError();
        }

        this.mInstance = new PluginRequireProvider(modules);
    }

    // public static destroyPluginHooks() {
    //
    // }

    private static mInstance: PluginRequireProvider;

    /**
     * Reference to the original require function.
     */
    private origRequire: typeof Module.prototype.require;

    private require: typeof Module.prototype.require;

    /**
     * Construct the class and create hooks into require.
     * @param modules The modules that should be injected from the runtime instance
     */
    private constructor(private modules: string[]) {
        this.origRequire = Module.prototype.require;

        const that = this;

        this.require = Module.prototype.require = function(request: string) {
            // Check that the import doesn't contain any of the modules
            if (modules.indexOf(request) !== -1) {
                return that.origRequire.apply(process.mainModule, arguments);
            } else {
                return that.origRequire.apply(this, arguments);
            }
        };
    }

    /**
     * Require hook request
     * @param request The request coming into `require()`
     */
    // private require(request: string) {
    //
    // }
}
