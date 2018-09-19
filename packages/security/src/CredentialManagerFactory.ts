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

import { AbstractCredentialManager } from "./abstract/AbstractCredentialManager";
import { ImperativeError } from "../../error";
import { IImperativeOverrides } from "../../imperative/src/doc/IImperativeOverrides";

/**
 * This is a wrapper class that controls access to the credential manager used within
 * the Imperative framework. All calls to the credential manager done by Imperative
 * must go through this class for security reasons.
 */
export class CredentialManagerFactory {
    /**
     * Initialize the credential manager, then lock the door and throw away the
     * key. This method can only be called once and should be called by {@link Imperative.init}
     * immediately after the CLI configuration has been loaded.
     *
     * This is where any Credential Manager your cli provides will be initialized. First
     * Imperative will instantiate your manager (or the {@link DefaultCredentialManager} if none was provided to
     * {@link Imperative.init}) and will then call your class's initialize method.
     *
     * ### Dynamic Import of Module
     *
     * This method will perform a dynamic import of your {@link IImperativeOverrides.CredentialManager} module when the
     * Manager parameter is passed as a string. If anything goes wrong during this import or if the module that was exported
     * doesn't extend the {@link AbstractCredentialManager}, this method will throw an error.
     *
     * @see {@link IImperativeOverrides.CredentialManager}
     *
     *
     * ### Immutable Class Creation
     *
     * After this method is complete, the instantiated credential manager will no longer allow changes
     * to it's direct variable assignments. This means that even your class can only change the values of it's direct
     * properties in the constructor and the initialize method. However, this does not prevent you from changing values
     * of properties of one of your classes objects.
     *
     * For example, after initialization, your class can not do something like this: `this.someProp = 5`. This will result
     * in a JavaScript "Cannot assign to read only property" exception because your class is immutable.
     * You still will be able to do stuff like this if someProp was already an object: `this.someProp.someValue = 5`. This
     * occurs because while Imperative marks your class as immutable (using Object.freeze) the underlying `this.someProp`
     * object is still mutable.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
     *
     * @param {IImperativeOverrides.CredentialManager} Manager - A class that extends {@link AbstractCredentialManager} that will
     *                                                  be instantiated and used as the actual credential manager. If a string is
     *                                                  passed, we will attempt to load the module specified in the string as a
     *                                                  class that extends the __AbstractCredentialManager__. If the class imported
     *                                                  doesn't extend the abstract class, we will throw an error.
     *
     * @param {string} cliName - The cli name to be used in the security manager. This really is only required for the
     *                           default manager so that the service name for keytar can be the cli name. It may be useful
     *                           for a custom implementation, so it will be passed every time and it is up to the
     *                           implementer to choose to use it.
     *
     * @throws {@link ImperativeError} When it has been detected that this method has been called before.
     *         It is important that this method only executes once.
     *
     * @throws {@link ImperativeError} When the file specified by the Manager string references a module that
     *         does not extend {@link AbstractCredentialManager}.
     *
     * @throws {@link ImperativeError} When the file specified by the Manager string does not exist or does not
     *         export a class as part of the module.exports clause.
     */
    public static async initialize(Manager: IImperativeOverrides["CredentialManager"], cliName: string): Promise<void> {
        if (this.mManager != null) {
            // Something tried to change the already existing credential manager, we should stop this.
            throw new ImperativeError({
                msg: "A call to CredentialManagerFactory.initialize has already been made! This method can only be called once",
            });
        }

        // @TODO TEST LOGIC
        try {
            let manager: any;

            // Dynamically determine which manager to load.
            if (typeof Manager === "string") {
                // In the case of a string, we make the assumption that it is pointing to the absolute file path of something
                // that exports a manager class. So we'll load that class and initialize it with the same constructor parameters
                // that we would do with an actual constructor parameter.
                const LoadedManager = await import(Manager);
                manager = new LoadedManager(cliName);
            } else {
                manager = new Manager(cliName);
            }

            // After constructing the object, we will ensure that the thing loaded is indeed an
            // instance of an abstract credential manager. Since we cannot assume that our internal
            // load of a plugin provided a correct object to the function :/
            if (manager instanceof AbstractCredentialManager) {
                this.mManager = manager;
            } else {
                const message = (typeof Manager === "string") ?
                    `The manager provided at ${Manager} does not extend AbstractCredentialManager properly!` :
                    "A bad object was provided to the CredentialManagerFactory.initialize() method. This could be " +
                    "due to a bad plugin.";

                throw new ImperativeError({
                    msg: message
                });
            }

            if (this.mManager.initialize) {
                await this.mManager.initialize();
            }
        } catch (error) {
            // Perform dynamic requires when an error happens
            const { InvalidCredentialManager } = await import("./InvalidCredentialManager");
            const { Logger } = await import("../../logger");
            const appSettings  = (await import("../../settings")).AppSettings.instance;

            // A value not equal to false indicates that the setting was overridden by a plugin
            // so we should not have a hard crash.
            if (appSettings.settings.overrides.CredentialManager !== false) {
                const logError = "Failed to override the credential manager with one provided by \"" +
                    appSettings.settings.overrides.CredentialManager +
                    "\"";

                // Be sure to log the messages both to the console and to a file
                // so that support can also see these messages.
                Logger.getImperativeLogger().error(logError);
                Logger.getConsoleLogger().error(logError);

                Logger.getImperativeLogger().error(error.toString());
                Logger.getConsoleLogger().error(error.toString());

                this.mManager = new InvalidCredentialManager(cliName, error);
            } else {
                this.mManager = undefined;

                // The crash was caused by a bad override provided by a base cli
                // so this should be thrown up as a hard crash
                throw error;
            }
        }

        // Freeze both the wrapper class and the credential manager we just created
        // to prevent anyone from making changes to this class after the first
        // initialization. This plugs up a security hole so that a plugin can never
        // trash the security manager created on init.
        Object.freeze(this);
        Object.freeze(this.mManager);
    }

    /**
     * Static singleton instance of an instantiated {@link AbstractCredentialManager}
     *
     * @private
     */
    private static mManager: AbstractCredentialManager;

    /**
     * @returns {AbstractCredentialManager} - The credential manager that Imperative should use to
     *   retrieve user credentials.
     *
     * @throws {ImperativeError} - When the Credential Manager has not been initialized yet.
     */
    public static get manager(): AbstractCredentialManager {
        if (this.mManager == null) {
            throw new ImperativeError({
                msg: "Credential Manager not yet initialized! CredentialManagerFactory.initialize must " +
                    "be called prior to CredentialManagerFactory.mananger"
            });
        }

        return this.mManager;
    }
}

// This also prevents someone being able to hijack the exported object. Essentially all of these Object.freeze
// calls make this class the programming equivalent of Fort Knox. Hard to get in but if you do get in, then
// there are lots of valuables
Object.freeze(exports);
