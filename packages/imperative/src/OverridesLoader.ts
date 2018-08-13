/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import {IImperativeOverrides} from "./doc/IImperativeOverrides";
import { CredentialManagerFactory, DefaultCredentialManager } from "../../security";
import {IImperativeConfig} from "./doc/IImperativeConfig";
import { isAbsolute, resolve } from "path";

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
   */
  public static async load(
    config: IImperativeConfig
  ): Promise<void> {
    // Initialize the Credential Manager
    await this.loadCredentialManager(config);
  }

  /**
   * Initialize the Credential Manager using the supplied override when provided.
   *
   * @param {IImperativeConfig} config - the current {@link Imperative#loadedConfig}
   */
  private static async loadCredentialManager(
    config: IImperativeConfig
  ): Promise<void> {
    const overrides: IImperativeOverrides = config.overrides;

    // If the credential manager wasn't set, then we use the DefaultCredentialManager
    if (overrides.CredentialManager == null) {
      overrides.CredentialManager = DefaultCredentialManager;
    }
    // If the credential manager is type string and not absolute, we will convert it to an absolute path
    // relative to the process entry file location.
    else if (typeof overrides.CredentialManager === "string" && !isAbsolute(overrides.CredentialManager)) {
      overrides.CredentialManager = resolve(process.mainModule.filename, "../", overrides.CredentialManager);
    }

    await CredentialManagerFactory.initialize(overrides.CredentialManager, config.name);
  }
}
