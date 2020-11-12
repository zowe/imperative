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
import { ImperativeConfig } from "../../utilities";
import { isAbsolute, resolve } from "path";
import { PMFConstants } from "./plugins/utilities/PMFConstants";

/* todo:overrides - If we ever need to reinstate ConfigMgr overrides,
 * re-implement to use entries in zowe.config.json.
import { AppSettings } from "../../settings";
*/

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
   * Load the baked-in zowe CredentialManager and initialize it.
   * If we need to reinstate 3rd party overrides, delete this function and
   * rename loadCredentialManager_NotCurrentlyUsed.
   *
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   * @param {any} packageJson - the current package.json
   */
  private static async loadCredentialManager(
    config: IImperativeConfig,
    packageJson: any
  ): Promise<void> {
    const overrides: IImperativeOverrides = config.overrides;
    const displayName: string = "@zowe/secure-credential-store-for-zowe-cli";
    const pmfConst: PMFConstants = PMFConstants.instance;

    // todo:gene: This is the location of SCS plugin. Will need our new built-in location
    const Manager = resolve(pmfConst.PLUGIN_HOME_LOCATION,
        "@zowe/secure-credential-store-for-zowe-cli/lib/credentials/KeytarCredentialManager");

    await CredentialManagerFactory.initialize({
      // Init the manager with the override specified OR (if null) default to keytar
      Manager,
      // The display name will be the plugin name that introduced the override OR it will default o the CLI name
      displayName,
      // The service is always the CLI name (Keytar and other plugins can use this to uniquely dentify the service)
      service: config.name,
      // If the default is to be used, we won't implant the invalid credential manager
      invalidOnFailure: !(Manager == null)
    });
  }

  /**
   * Initialize the Credential Manager using the supplied override when provided.
   *
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   * @param {any} packageJson - the current package.json
   */

  /* todo:overrides - Restore if we ever need to reinstate ConfigMgr overrides

  private static async loadCredentialManager_NotCurrentlyUsed(
      config: IImperativeConfig,
      packageJson: any
  ): Promise<void> {
    const overrides: IImperativeOverrides = config.overrides;

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
    if (overrides.CredentialManager != null || (packageJson.dependencies != null && packageJson.dependencies.keytar != null)) {
      let Manager = overrides.CredentialManager;
      if (typeof overrides.CredentialManager === "string" && !isAbsolute(overrides.CredentialManager)) {
        Manager = resolve(process.mainModule.filename, "../", overrides.CredentialManager);
      }

      await CredentialManagerFactory.initialize({
        // Init the manager with the override specified OR (if null) default to keytar
        Manager,
        // The display name will be the plugin name that introduced the override OR it will default to the CLI name
        displayName,
        // The service is always the CLI name (Keytar and other plugins can use this to uniquely identify the service)
        service: config.name,
        // If the default is to be used, we won't implant the invalid credential manager
        invalidOnFailure: !(Manager == null)
      });
    }
  }

  * todo:overrides: commented-out until we need to reinstate 3rd party overrides
  */

}
