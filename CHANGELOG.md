# Changelog

## [2018-02-20] US429254-SecureCredentialManagement 

-  __[MAJOR]__ Added the ability for profiles to securly store credentials using a credential manager.
-  __[MAJOR]__ AbstractProfileManager now calls the Credential Manager to save, load and delete credentials of a profile.
-  __[MINOR]__ ICommandOptionDefinition now contains types for `username` and `password`

### Credential Management

Part of this effort involved creating a way to securly store and load credentials in Imperative. This involved creating a credential manager.

#### Changes
-  __[MAJOR]__ Created a new `security` package
-  __[MAJOR]__ Created a DefaultCredentialManager which utilizes [keytar] to perform the storing and loading of credentials.
-  __[MAJOR]__ [keytar] is an optional dependency that needs special setup on Linux. If keytar was not installed, a command will only fail if the __DefaultCredentialManager__ tries to save/load/delete credentials. Otherwise everything will just work fine.
-  __[MAJOR]__ Created an OverridesLoader underneath the [imperative package](./packages/imperative) and defined a property 
-  __[MAJOR]__ Provided the ability for a CLI to override the default credential manager. See section below.
-  __[MINOR]__ Exposed a CredentialManagerFactory to abstract how Imperative accesses the underlying manager securly.

#### Overriding a Manager

It is possible for a CLI to override the DefaultCredentialManager by specifying the overrides.CredentialManager property on the config. The class specified must properly extend [AbstractCredentialManager](./packages/security/abstract/AbstractCredentialManager.ts).

##### Example
```TypeScript
// Using a string path
{
  //...
  overrides: {
    CredentialManager: "path/to/CredentialManager.ts" // requires module.exports to be the manager.
  }
  //...
}

// Or using the actual class
{
  //...
  overrides: {
    CredentialManager: require("path/to/CredentialManager.ts")
  }
  //...
}

// In path/to/CredentialManager.ts
export = class CredentialManager extends AbstractCredentialManager {
  /**
   * Create a constructor that satisfies ICredentialManagerConstructor
   *
   * @param service Passed by Imperative
   */
  constructor(service: string) {
    super(service);
  }

  /**
   * In the example, we always will return a hardcoded string.
   *
   * @param {string} account Passed to this function by Imperative
   */
  protected async loadCredentials(account: string): Promise<SecureCredential> {
    return Buffer.from("username-goes-here:password-goes-here").toString("base64");
  }

  /**
   * In the example, we do nothing.
   *
   * @param {string} account Passed to this function by Imperative
   * @param {SecureCredential} credentials Passed to this function by Imperative
   */
  protected async saveCredentials(account: string, credentials: SecureCredential): Promise<void> {
    return;
  }

  /**
   * In the example, we do nothing.
   *
   * @param account Passed to this function by Imperative
   */
  protected async deleteCredentials(account: string): Promise<void> {
    return;
  }
};
```

[keytar]: https://www.npmjs.com/package/keytar