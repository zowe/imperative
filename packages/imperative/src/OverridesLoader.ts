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

import { IImperativeOverrides } from "./doc/IImperativeOverrides";
import { CredentialManagerFactory, DefaultCredentialManager } from "../../security";
import { IImperativeConfig } from "./doc/IImperativeConfig";
import { isAbsolute, resolve } from "path";
import { AppSettings } from "../../settings";
import { ImperativeConfig } from "../../utilities";
import { IConfigVault } from "../../config";
import { Logger } from "../../logger";

/**
 * Imperative-internal class to load overrides
 * You should not need to call this from your CLI.
 */
export class OverridesLoader {
    /**
   * Apply overrides to all applicable facilities and use our defaults where
   * an override is not provided.
   *
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   * @param {any} packageJson - the current package.json
   */
    public static async load(
        config: IImperativeConfig,
        packageJson: any
    ): Promise<void> {
    // Initialize the Credential Manager
        await (ImperativeConfig.instance.config?.exists ? this.loadCredentialManager : this.loadCredentialManagerOld)(config, packageJson);
    }

    /**
   * Load the baked-in zowe CredentialManager and initialize it.
   * If we need to reinstate 3rd party overrides, delete this function and
   * rename loadCredentialManagerOld.
   *
   * @internal
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   * @param {any} packageJson - the current package.json
   */
    public static async loadCredentialManager(
        config: IImperativeConfig,
        packageJson: any
    ): Promise<void> {
        if (packageJson.dependencies?.keytar != null || packageJson.optionalDependencies?.keytar != null) {
            // Load the CredentialManager built into Imperative for managing secure properties
            await CredentialManagerFactory.initialize({
                // The display name will be the plugin name that introduced the override OR it will default to the CLI name
                displayName: config.productDisplayName || config.name,
                // For overrides, the service could be the CLI name, but we do not override anymore.
                // Null will use the service name of the built-in credential manager.
                service: config.credentialServiceName || null,
                // If the default is to be used, we won't implant the invalid credential manager.
                // We do not use the invalid credential manager, since we no longer allow overrides.
                invalidOnFailure: false
            });
        }

        await OverridesLoader.loadSecureConfig();
    }

    /**
   * Initialize the Credential Manager using the supplied override when provided.
   *
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   * @param {any} packageJson - the current package.json
   */
    private static async loadCredentialManagerOld(
        config: IImperativeConfig,
        packageJson: any
    ): Promise<void> {
        const overrides: IImperativeOverrides = config.overrides;

        const ZOWE_CLI_PACKAGE_NAME = `@zowe/cli`;

        // The manager display name used to populate the "managed by" fields in profiles
        const displayName: string = (
            overrides.CredentialManager != null
        && AppSettings.initialized
        && AppSettings.instance.getNamespace("overrides") != null
        && AppSettings.instance.get("overrides", "CredentialManager") != null
        && AppSettings.instance.get("overrides", "CredentialManager") !== false
        ) ?
        // App settings is configured - use the plugin name for the manager name
            AppSettings.instance.get("overrides", "CredentialManager") as string
            :
        // App settings is not configured - use the CLI display name OR the package name as the manager name
            config.productDisplayName || config.name;

        // Initialize the credential manager if an override was supplied and/or keytar was supplied in package.json
        if (overrides.CredentialManager != null || packageJson.dependencies?.keytar != null) {
            let Manager = overrides.CredentialManager;
            if (typeof overrides.CredentialManager === "string" && !isAbsolute(overrides.CredentialManager)) {
                Manager = resolve(process.mainModule.filename, "../", overrides.CredentialManager);
            }

            await CredentialManagerFactory.initialize({
                // Init the manager with the override specified OR (if null) default to keytar
                Manager,
                // The display name will be the plugin name that introduced the override OR it will default to the CLI name
                displayName,

                // zowe cli will always add `Zowe` to it's list of service names
                service: config?.name === ZOWE_CLI_PACKAGE_NAME ? DefaultCredentialManager.SVC_NAME : config?.name,

                // If the default is to be used, we won't implant the invalid credential manager
                invalidOnFailure: !(Manager == null)
            });
        }

        await OverridesLoader.loadSecureConfig();
    }

    /**
   * After the plugins and secure credentials are loaded, rebuild the configuration with the
   * secure values
   */
    private static async loadSecureConfig() {
        if (!CredentialManagerFactory.initialized) return;

        const vault: IConfigVault = {
            load: ((key: string): Promise<string> => {
                return CredentialManagerFactory.manager.load(key, true);
            }),
            save: ((key: string, value: any): Promise<void> => {
                return CredentialManagerFactory.manager.save(key, value);
            })
        };

        try {
            await ImperativeConfig.instance.config.api.secure.load(vault);
        } catch (err) {
            // Secure vault is optional since we can prompt for values instead
            Logger.getImperativeLogger().warn(`Secure vault not enabled. Reason: ${err.message}`);
        }
    }
}
