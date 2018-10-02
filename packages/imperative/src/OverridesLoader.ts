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
import { CredentialManagerFactory, DefaultCredentialManager, ICredentialManagerConstructor } from "../../security";
import { IImperativeConfig } from "./doc/IImperativeConfig";
import { isAbsolute, resolve } from "path";
import { AppSettings } from "../../settings";

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
    await this.loadCredentialManager(config, packageJson);
  }

  /**
   * Initialize the Credential Manager using the supplied override when provided.
   *
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   * @param {any} packageJson - the current package.json
   */
  private static async loadCredentialManager(
    config: IImperativeConfig,
    packageJson: any
  ): Promise<void> {
    const overrides: IImperativeOverrides = config.overrides;

    // The manager display name used to populate the "managed by" fields in profiles
    const managerDisplayName: string = (
      overrides.CredentialManager != null
      && AppSettings.initialized
      && AppSettings.instance.settings.overrides != null
      && AppSettings.instance.settings.overrides.CredentialManager != null
    ) ?
      // App settings is configured - use the plugin name for the manager name
      AppSettings.instance.settings.overrides.CredentialManager as string
      :
      // App settings is not configured - use the CLI name as the manager
      config.productDisplayName || config.name;

    // If the credential manager wasn't set, then we use the DefaultCredentialManager
    // The default credential manger uses keytar - and we will use it if a keytar dependency
    // is in package.json
    if (overrides.CredentialManager == null && packageJson.dependencies != null && packageJson.dependencies.keytar != null) {
      overrides.CredentialManager = DefaultCredentialManager;
    }

    // If the credential manager is type string and not absolute, we will convert it to an absolute path
    // relative to the process entry file location.
    else if (typeof overrides.CredentialManager === "string" && !isAbsolute(overrides.CredentialManager)) {
      overrides.CredentialManager = resolve(process.mainModule.filename, "../", overrides.CredentialManager);
    }

    // If the credential manager is present, initialize with the credential manager, the cli package name as
    // the service/cli name and the display name chosen.
    if (overrides.CredentialManager != null) {
      await CredentialManagerFactory.initialize(overrides.CredentialManager, config.name, managerDisplayName);
    }
  }
}
