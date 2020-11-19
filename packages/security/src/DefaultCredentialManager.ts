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

import { AbstractCredentialManager, SecureCredential } from "./abstract/AbstractCredentialManager";
import { ImperativeError } from "../../error";
import { Logger } from "../../logger";


/* tslint rule for missing dependency has been added to this file because it is up to
 * the host package to specify keytar as a dependency in order for this credential
 * manager to be used.
 *
 * This import is used for typing purposes only
 */
// tslint:disable-next-line:no-implicit-dependencies
import * as keytar from "keytar";

/**
 * Default Credential Manager is our implementation of the Imperative Credential Manager. This manager invokes methods
 * created by the keytar utility (https://www.npmjs.com/package/keytar) to access the secure credential vault on the
 * user's machine.
 *
 * ### Keychains Used by Keytar
 *
 * | OS | Vault |
 * |----|----------|
 * | Windows | Credential Vault |
 * | macOS | Keychain |
 * | Linux | Secret Sevice API/libsecret |
 *
 * ### Keytar must be installed by the app using imperative (like zowe-cli).
 *
 * On Linux, Keytar will not work out of the box without some additional
 * configuration to install libsecret. Keytar provides the following
 * documentation for Linux users to install libsecret:
 *
 * ---
 *
 * Depending on your distribution, you will need to run the following command:
 *
 * - Debian/Ubuntu: `sudo apt-get install libsecret-1-dev`
 * - Red Hat-based: `sudo yum install libsecret-devel`
 * - Arch Linux: `sudo pacman -S libsecret`
 */
export class DefaultCredentialManager extends AbstractCredentialManager {

  /**
   * The service name for our built-in credential manager.
   */
  public static readonly SVC_NAME = "Zowe";

  /**
   * Alternative services under which we will look for credentials.
   * Do not change the order of the alternative services.
   * When adding, removing or modifying the alternative services,
   * double check the loadCredentials function.
   */
  private readonly ALTERNATIVE_SERVICES = ["@brightside/core", "@zowe/cli", "Zowe-Plugin"];

  /**
   * This variable indicates which service should be used when loading
   * secure properties in the case of a conflict
   * lts-incremental --> @brightside/core
   * latest -----------> @zowe/cli
   */
  private readonly SERVICE_VER_PREFERENCE: string = "latest";


  /**
   * Reference to the lazily loaded keytar module.
   */
  private keytar: typeof keytar;

  /**
   * Errors that occurred while loading keytar will be stored in here.
   *
   * Every method of this class should call the {@link checkForKeytar} method before proceeding. It
   * is this method that will check for keytar and throw this error if it was detected that keytar
   * wasn't loaded.
   *
   * @private
   */
  private loadError: ImperativeError;

  /**
   * Combined list of services that the plugin will go through
   */
  private allServices: string[];

  /**
   * Pass-through to the superclass constructor.
   *
   * @param {string} service The service string to send to the superclass constructor.
   * @param {string} displayName The display name for this credential manager to send to the superclass constructor
   */
  constructor(service: string, displayName: string = "Zowe Built-in Credential Manager") {
    // Always ensure that a manager instantiates the super class, even if the
    // constructor doesn't do anything. Who knows what things might happen in
    // the abstract class initialization in the future.
    super(service, displayName);

    // Gather all services
    this.allServices = JSON.parse(JSON.stringify(this.ALTERNATIVE_SERVICES));
    if (this.allServices.indexOf(this.service) === -1) {
      this.allServices.push(this.service);
    }
    this.allServices.push(DefaultCredentialManager.SVC_NAME);
  }

  /**
   * Called by {@link CredentialManagerFactory.initialize} before the freeze of the object. This
   * gives us a chance to load keytar into the class before we are locked down. If a load failure
   * occurs, we will store the error and throw it once a method of this class tries to execute. This
   * prevents a missing keytar module from stopping all operation of the cli.
   *
   * In the future, we could go even further to have keytar load into a sub-object of this class so
   * that the load doesn't hold up the main class execution.
   *
   * @returns {Promise<void>} A promise that the function has completed.
   */
  public async initialize(): Promise<void> {
      try {
        // tslint:disable-next-line:no-implicit-dependencies
        this.keytar = await import("keytar");
      } catch (error) {
          this.loadError = new ImperativeError({
              msg: "Keytar not Installed",
              causeErrors: error
          });
      }
  }

  /**
   * Calls the keytar deletePassword service with {@link DefaultCredentialManager#service} and the
   * account passed to the function by Imperative.
   *
   * @param {string} account The account for which to delete the password
   *
   * @returns {Promise<void>} A promise that the function has completed.
   *
   * @throws {@link ImperativeError} if keytar is not defined.
   */
  protected async deleteCredentials(account: string): Promise<void> {
    this.checkForKeytar();
    await this.deleteCredentialsHelper(account);
  }

  /**
   * Calls the keytar getPassword service with {@link DefaultCredentialManager#service} and the
   * account passed to the function by Imperative.
   *
   * @param {string} account The account for which to get credentials
   * @param {boolean} optional Set to true if failure to find credentials should be ignored
   *
   * @returns {Promise<SecureCredential>} A promise containing the credentials stored in keytar.
   *
   * @throws {@link ImperativeError} if keytar is not defined.
   * @throws {@link ImperativeError} when keytar.getPassword returns null or undefined.
   */
  protected async loadCredentials(account: string, optional?: boolean): Promise<SecureCredential> {
    this.checkForKeytar();
    // Helper function to handle all breaking changes
    const loadHelper = async (service: string) => {
      let secureValue: string = await this.keytar.getPassword(service, account);
      // Handle user vs username case // Zowe v1 -> v2 (i.e. @brightside/core@2.x -> @zowe/cli@6+ )
      if (secureValue == null && account.endsWith("_username")) {
        secureValue = await this.keytar.getPassword(service, account.replace("_username", "_user"));
      }
      // Handle pass vs password case // Zowe v0 -> v1 (i.e. @brightside/core@1.x -> @brightside/core@2.x)
      if (secureValue == null && account.endsWith("_pass")) {
        secureValue = await this.keytar.getPassword(service, account.replace("_pass", "_password"));
      }
      return secureValue;
    };

    // First, check for service that we (the built-in imperative CredMgr) is responsible for.
    let secValue = await loadHelper(DefaultCredentialManager.SVC_NAME);
    if (secValue == null) {
      // We didn't find the account under our built-in service
      // Let's check if the service name provided is in our list
      if (this.ALTERNATIVE_SERVICES.indexOf(this.service) === -1) {
        // Specified service not in our list
        // Look for the account in this new service that we don't know about
        secValue = await loadHelper(this.service);
      }
    }
    if (secValue == null) {
      // The secure value was not found
      // Let us look for the account in our version-specific services
      const brightValue = await loadHelper(this.ALTERNATIVE_SERVICES[0]); // @brightside/core
      const zoweValue = await loadHelper(this.ALTERNATIVE_SERVICES[1]);   // @zowe/cli

      if (brightValue != null && zoweValue == null) {
        secValue = brightValue; // Only found the account in the brightside service
      } else if (brightValue == null && zoweValue != null) {
        secValue = zoweValue; // Only found the account in the zowe service
      } else if (brightValue != null && zoweValue != null) {
        // Found the account in both services :'{ We got a conflict }':
        // Check which credentials should we use based on the constant variable
        secValue = this.SERVICE_VER_PREFERENCE === "lts-incremental" ? brightValue : zoweValue;
      }
    }
    if (secValue == null) {
      // We got no value from our version-specific services. Try the remaining known services.
      for (let svcInx = 2; svcInx < this.ALTERNATIVE_SERVICES.length; svcInx++) {
        secValue = await loadHelper(this.ALTERNATIVE_SERVICES[svcInx]);
        if (secValue != null)
          break;
      }
    }

    if (secValue == null && !optional) {
      throw new ImperativeError({
        msg: "Unable to load credentials.",
        additionalDetails: this.getMissingEntryMessage(account)
      });
    }

    const impLogger = Logger.getImperativeLogger();
    impLogger.info("Successfully loaded secure value for service = '" + this.service +
        "' account = '" + account + "'");
    return secValue;
  }

  /**
   * Calls the keytar setPassword service with {@link DefaultCredentialManager#service} and the
   * account and credentials passed to the function by Imperative.
   *
   * @param {string} account The account to set credentials
   * @param {SecureCredential} credentials The credentials to store
   *
   * @returns {Promise<void>} A promise that the function has completed.
   *
   * @throws {@link ImperativeError} if keytar is not defined.
   */
  protected async saveCredentials(account: string, credentials: SecureCredential): Promise<void> {
    this.checkForKeytar();
    await this.deleteCredentialsHelper(account, true);
    await this.keytar.setPassword(this.service, account, credentials);
  }

  /**
   * This function is called before the {@link deletePassword}, {@link getPassword}, and
   * {@link setPassword} functions. It will check if keytar is not null and will throw an error
   * if it is.
   *
   * The error thrown will be the contents of {@link loadError} or a new {@link ImperativeError}.
   * The former error will be the most common one as we expect failures during the load since keytar
   * is optional. The latter error will indicate that some unknown condition has happened so we will
   * create a new ImperativeError with the report suppressed. The report is suppressed because it
   * may be possible that a detailed report could capture a username and password, which would
   * probably be a bad thing.
   *
   * @private
   *
   * @throws {@link ImperativeError} when keytar is null or undefined.
   */
  private checkForKeytar(): void {
      if (this.keytar == null) {
          if (this.loadError == null) {
              throw new ImperativeError({
                  msg: "Keytar was not properly loaded due to an unknown cause."
              }, {
                  suppressReport: true
              });
          } else {
              throw this.loadError;
          }
      }
  }

  private async deleteCredentialsHelper(account: string, keepRequestedSvc?: boolean): Promise<boolean> {
    let wasDeleted = false;
    for (const service of this.allServices) {
      if (keepRequestedSvc && service === DefaultCredentialManager.SVC_NAME) {
        continue;
      }
      if (await this.keytar.deletePassword(service, account)) {
        wasDeleted = true;
      }
    }
    return wasDeleted;
  }

  private getMissingEntryMessage(account: string) {
    let listOfServices = `  Service = `;
    for (const service of this.allServices) {
      listOfServices += `${service}, `;
    }
    const commaAndSpace = 2;
    listOfServices = listOfServices.slice(0, -1 * commaAndSpace) + `\n  Account = ${account}\n\n`;

    return "Could not find an entry in the credential vault for the following:\n" +
        listOfServices +
        "Possible Causes:\n" +
        "  This could have been caused by any manual removal of credentials from your vault.\n\n" +
        "Resolutions: \n" +
        "  Recreate the credentials in the vault for the particular service in the vault.\n";
  }
};
