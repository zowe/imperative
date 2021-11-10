# Change Log

All notable changes to the Imperative package will be documented in this file.

## Recent Changes

- Enhancement: Added `dry-run` option for `zowe config init` command to preview changes instead of saving them to disk. [#1037](https://github.com/zowe/zowe-cli/issues/1037)
- Bugfix: Fix crashing issue related to reloading the config when `--dcd` option is specified [#943](https://github.com/zowe/zowe-cli/issues/943) [#1190](https://github.com/zowe/zowe-cli/issues/1190)

## `5.0.0-next.202111032034`

- Enhancement: Added `autoStore` property to config JSON files which defaults to true. When this property is enabled and the CLI prompts you to enter connection info, the values you enter will be saved to disk (or credential vault if they are secure) for future use. [zowe/zowe-cli#923](https://github.com/zowe/zowe-cli/issues/923)
- **Next Breaking**
    - Changed the default behavior of `Config.set` so that it no longer coerces string values to other types unless the `parseString` option is true.

## `5.0.0-next.202110201735`

- **LTS Breaking**
    - Changed the return value of the public `PluginManagementFacility.requirePluginModuleCallback` function
- BugFix: Updated the profiles list as soon as the plugin is installed.

## `5.0.0-next.202110191937`

- **Breaking**: Added the new, required, abstract method 'displayAutoInitChanges' to the 'BaseAutoInitHandler' class.

## `5.0.0-next.202110071645`

- Enhancement: Added `config update-schemas [--depth <value>]` command. [zowe/zowe-cli#1059](https://github.com/zowe/zowe-cli/issues/1059)
- Enhancement: Added the ability to update the global schema file when installing a new plugin. [zowe/zowe-cli#1059](https://github.com/zowe/zowe-cli/issues/1059)
- **Next Breaking**
    - Renamed public static function ConfigSchemas.loadProfileSchemas to ConfigSchemas.loadSchema

## `5.0.0-next.202110011948`

- Breaking: Changed default log level from DEBUG to WARN for Imperative logger and app logger to reduce the volume of logs written to disk. [#634](https://github.com/zowe/imperative/issues/634)

## `5.0.0-next.202109281439`

- Enhancement: Added `config import` command that imports team config files from a local path or web URL. [#1083](https://github.com/zowe/zowe-cli/issues/1083)
- Enhancement: Added Help Doc examples for the `zowe config` group of commands. [#1061](https://github.com/zowe/zowe-cli/issues/1061)

## `5.0.0-next.202109031503`

- Enhancement: Log in to authentication service to obtain token value instead of prompting for it in `config secure` command.

## `5.0.0-next.202108181618`

- Breaking: Make `fail-on-error` option true by default on `zowe plugins validate` command.

## `5.0.0-next.202108121732`

- Enhancement: Flattened the default profiles structure created by the `config init` command.
- Breaking: Split up authToken property in team config into tokenType and tokenValue properties to be consistent with Zowe v1 profiles.

## `5.0.0-next.202108062025`

- BugFix: Export all Config related interfaces.

## `5.0.0-next.202107122104`

- BugFix: Fixed secure credentials not being stored by the `config auto-init` command.

## `5.0.0-next.202107092101`

- Enhancement: Adds the `config auto-init` base handler and command builder, allowing a CLI to build a configuration auto-initialization command and handler
- Enhancement: Adds the optional `configAutoInitCommandConfig` interface to the IImperativeConfig interface, allowing for an auto-init command to be generated if a CLI supports it
- Enhancement: Better support for comments in JSON
- Bugfix: Revert schema changes related to additionalProperties. Re-enable IntelliSense when editing zowe.config.json files
- **Next Breaking**
    - Changed the schema paths and updated schema version

## `5.0.0-next.202106221817`

- **Next Breaking**
    - Replaced --user with --user-config on all config command groups due to conflict with --user option during config auto-initialization
    - Replaced --global with --global-config on all config command groups for consistency

## `5.0.0-next.202106212048`

- Enhancement: A new interface (IApimlSvcAttrs) was added. A property (apimlConnLookup) of that interface type was added to IImperativeConfig to enable plugins to tie themselves to an APIML service. Zowe-CLI can then ask APIML for the configuration data for the plugin to connect to that service.

## `5.0.0-next.202106041929`

- **Breaking**: Removed the following previously deprecated items:
    - ICliLoadProfile.ICliILoadProfile -- use ICliLoadProfile.ICliLoadProfile
    - IImperativeErrorParms.suppressReport -- has not been used since 10/17/2018
    - IImperativeConfig.pluginBaseCliVersion -- has not been used since version 1.0.1
    - AbstractRestClient.performRest -- use AbstractRestClient.request
    - AbstractSession.HTTP_PROTOCOL -- use SessConstants.HTTP_PROTOCOL
    - AbstractSession.HTTPS_PROTOCOL -- use SessConstants.HTTPS_PROTOCOL
    - AbstractSession.TYPE_NONE -- use SessConstants.AUTH_TYPE_NONE
    - AbstractSession.TYPE_BASIC -- use SessConstants.AUTH_TYPE_BASIC
    - AbstractSession.TYPE_BEARER -- use SessConstants.AUTH_TYPE_BEARER
    - AbstractSession.TYPE_TOKEN -- use SessConstants.AUTH_TYPE_TOKEN

## `5.0.0-next.202104262004`

- Enhancement: Remove message about NPM peer dep warnings that no longer applies to npm@7.
- **Breaking:** Imperative no longer requires plug-ins to include CLI package as a peer dependency. It is recommended that CLI plug-ins remove their peer dependency on @zowe/cli for improved compatibility with npm@7. This is a breaking change for plug-ins, as older versions of Imperative will fail to install a plug-in that lacks the CLI peer dependency.

## `5.0.0-next.202104140156`

- BugFix: Allow SCS to load new securely stored credentials. [#984](https://github.com/zowe/zowe-cli/issues/984)

## `5.0.0-next.202104071400`

- Enhancement: Add the ProfileInfo API to provide the following functionality:
    - Read configuration from disk.
    - Transparently read either a new team configuration or old style profiles.
    - Resolve order of precedence for profile argument values.
    - Provide information to enable callers to prompt for missing profile arguments.
    - Retain the location in which a profile or argument was found.
    - Automatically initialize CredentialManager, including an option to specify a custom keytar module.
    - Provide a means to postpone the loading of secure arguments until specifically requested by the calling app to delay loading sensitive data until it is needed.
    - Provide access to the lower-level Config API to fully manipulate the team configuration file.

## `5.0.0-next.202103111923`

- Enhancement: Allow custom directory to be specified for project config in `Config.load` method. [#544](https://github.com/zowe/imperative/issues/544)
- BugFix: Fixed Config object not exported at top level. [#543](https://github.com/zowe/imperative/issues/543)

## `5.0.0-next.202101292016`

- BugFix: Fixed error when Imperative APIs are called and "config" property of ImperativeConfig is not initialized. [#533](https://github.com/zowe/imperative/issues/533)

## `5.0.0-next.202101281717`

- Enhancement: Added new config API intended to replace the profiles API, and new "config" command group to manage config JSON files. The new API makes it easier for users to create, share, and switch between profile configurations.
- Deprecated: The "profiles" command group for managing global profiles in "{cliHome}/profiles". Use the new "config" command group instead.
- **Breaking**: Removed "config" command group for managing app settings in "{cliHome}/imperative/settings.json". If app settings already exist they are still loaded for backwards compatibility. For storing app settings use the new config API instead.
- Enhancement: Added support for secure credential storage without any plug-ins required. Include the "keytar" package as a dependency in your CLI to make use of it.
- Enhancement: Added `deprecatedReplacement` property to `ICommandDefinition` to deprecate a command.

## `5.0.0-next.202010301408`

- Enhancement: Allow hidden options.

## `5.0.0-next.202010161240`

- Enhancement:  Allow process exit code to be passed to daemon clients.

## `5.0.0-next.202009251501`

- Enhancement: add support for CLIs that want to run as a persistent process (daemon mode).

## `4.17.1`

- BugFix: Fixed an issue where plugin install and uninstall did not work with NPM version 8. [#683](https://github.com/zowe/imperative/issues/683)

## `4.17.0`

- Enhancement: Export the Imperative Command Tree on the data object of the `zowe --ac` command when `--rfj` is specified.

## `4.16.2`

- BugFix: Reverts hiding the cert-key-file path so users can see what path was specified and check if the file exists

## `4.16.1`

- BugFix: Updated dependencies to resolve problems with the ansi-regex package

## `4.16.0`

- Enhancement: Implemented the ability to authenticate using client certificates in PEM format.

## `4.15.1`

- Bugfix: Updated js-yaml to resolve a potential security issue

## `4.15.0`

- Enhancement: Improved command suggestions for mistyped commands, add aliases to command suggestions

## `4.14.0`

- Enhancement: The `plugins validate` command returns an error code when plugins have errors if the new `--fail-on-error` option is specified. Also added `--fail-on-warning` option to return with an error code when plugins have warnings. [#463](https://github.com/zowe/imperative/issues/463)
- BugFix: Fixed regression where characters are not correctly escaped in web help causing extra slashes ("\") to appear. [#644](https://github.com/zowe/imperative/issues/644)

## `4.13.4`

- BugFix: Added missing periods at the end of command group descriptions for consistency. [#55](https://github.com/zowe/imperative/issues/55)

## `4.13.3`

- Performance: Improved the way that HTTP response chunks are saved, reducing time complexity from O(n<sup>2</sup>) to O(n). This dramatically improves performance for larger requests. [#618](https://github.com/zowe/imperative/pull/618)

## `4.13.2`

- BugFix: Fixed web help examples description typo at line 440 in `packages/cmd/src/CommandPreparer.ts`. [#612](https://github.com/zowe/imperative/issues/612)
- BugFix: Fixed Markdown special characters not being escaped in web help for descriptions of positional options and examples. [#620](https://github.com/zowe/imperative/issues/620)
- BugFix: Fixed subgroups not being displayed under their own heading in web help. [#323](https://github.com/zowe/imperative/issues/323)

## `4.13.1`

- BugFix: Fixed active command tree item not updating in web help when scrolling. [#425](https://github.com/zowe/imperative/issues/425)
- BugFix: Fixed main page of web help not staying scrolled to top of page when loaded. [#525](https://github.com/zowe/imperative/issues/525)

## `4.13.0`

- Enhancement: Added headers[] option to TextUtils.getTable(). [#369](https://github.com/zowe/imperative/issues/369)
- BugFix: Print a subset of the `stdout` and `stderr` buffers when calling `mProgressApi`'s `endBar()` to prevent duplication of output.
- Bugfix: Replaced `this` with `ImperativeConfig.instance` in `ImperativeConfig.getCallerFile()`. [#5](https://github.com/zowe/imperative/issues/5)

## `4.12.0`

- Enhancement: Added decompression support for REST responses with Content-Encoding `gzip`, `deflate`, or `br`. [#318](https://github.com/zowe/imperative/issues/318)

## `4.11.2`

- BugFix: Added `Protocol` to the Error Details coming from the `AbstractRestClient`. [#539](https://github.com/zowe/imperative/issues/539)

## `4.11.1`

- BugFix: Fixed vulnerabilities by replacing marked with markdown-it and sanitize-html.
- BugFix: Fixed plugin install failing to install package from private registry.

## `4.11.0`

- Enhancement: Fixed plugin install commands which were broken in npm@7. [#457](https://github.com/zowe/imperative/issues/457)
- BugFix: Fixed incorrect formatting of code blocks in web help. [#535](https://github.com/zowe/imperative/issues/535)

## `4.10.2`

- BugFix: Fixed vulnerabilities by updating marked

## `4.10.1`

- BugFix: Fixed an issue when `TypeError` has been raised by `Logger.getCallerFileAndLineTag()` when there was not filename for a stack frame. [#449](https://github.com/zowe/imperative/issues/449)

## `4.10.0`

- Enhancement: Added an `arrayAllowDuplicate` option to the `ICommandOptionDefinition` interface. By default, the option value is set to `true` and duplicate values are allowed in an array. Specify `false` if you want Imperative to throw an error for duplicate array values. [#437](https://github.com/zowe/imperative/issues/437)

## `4.9.0`

- BugFix: Updated `opener` dependency due to command injection vulnerability on Windows - [GHSL-2020-145](https://securitylab.github.com/advisories/GHSL-2020-145-domenic-opener)
- Enhancement: Expose `trim` parameter from `wrap-ansi` within `TextUtils.wordWrap()`

## `4.8.1`

- BugFix: Fixed an issue with `ConnectionPropsForSessCfg` where the user would be prompted for user/password even if a token was present. [#436](https://github.com/zowe/imperative/pull/436)

## `4.8.0`

- Enhancement: Added the SSO Callback function, which allows applications to call their own functions while validating session properties (i.e. host, port, user, password, token, etc...). The callback option is named `getValuesBack`. [#422](https://github.com/zowe/imperative/issues/422)

## `4.7.6`

- Enhancement: Added support for dynamically generated cookie names. Updated `AbstractSession.storeCookie()` to process cookie names that are not fully known at build-time. [#431](https://github.com/zowe/imperative/pull/431)

## `4.7.5`

- BugFix: Added support for creating an array with `allowableValues`. Previously, array type options could fail in the Syntax Validator. [#428](https://github.com/zowe/imperative/issues/428)

## `4.7.4`

- Fix update profile API storing secure fields incorrectly when called without CLI args

## `4.7.3`

- Fix web help failing to load in Internet Explorer 11
- Fix `--help-web` not working on macOS when DISPLAY environment variable is undefined
- Change type of `ISession.tokenType` to "string" (for compatiblity with versions older than 4.7.0).

## `4.7.2`

- Hide sensitive session properties (user, password, and token value) in log file. Since 4.7.0, only password was hidden.

## `4.7.1`

- Don't load token value into Session object if user or password are supplied

## `4.7.0`

- Add the --dd flag to profile creation to allow the profile to be created without the default values specified for that profile.
- Use a token for authentication if a token is present in the underlying REST session object.
- Added a new ConnectionPropsForSessCfg.addPropsOrPrompt function that places credentials (including a possible token) into a session configuration object.
    - Plugins must use this function to create their sessions to gain the features of automatic token-handling and prompting for missing connection options.
    - Connection information is obtained from the command line, environment variables, a service profile, a base profile, or from an option's default value in a service profile's definition, in that order.
    - If key connection information is not supplied to any cor Zowe command, the command will prompt for:
        -  host
        -  port
        -  user
        -  and password
    - Any prompt will timeout after 30 seconds so that it will not hang an automated script.
- Add base profiles, a new type of profile which can store values shared between profiles of other types.
    - The properties that are currently recognized in a base profile are:
        - host
        - port
        - user
        - password
        - rejectUnauthorized
        - tokenType
        - tokenValue
    - To use base profiles in an Imperative-based CLI, define a `baseProfile` schema on your Imperative configuration object.
    - If the `baseProfile` schema is defined, base profile support will be added to any command that uses profiles.
- Due to new options (like tokenValue) help text will change. Plugin developers may have to update any mismatched snapshots in their automated tests.
- Updated the version of TypeScript from 3.7.4 to 3.8.0.
- Updated the version of TSLint from 5.x to 6.1.2.
- Add login and logout commands to get and delete/invalidate tokens
  - Add showToken flag to display token only, and not save it to the user profile
  - Add ability to create a user profile on login if no profile of that type existed previously

## `4.6.4`

- Fix optional secure fields not deleted when overwriting a profile

## `4.6.3`

- Update log4js to improve Webpack compatibility for extenders

## `4.6.2`

- Fix vulnerabilities by updating yargs

## `4.6.1`

- Update perf-timing version

## `4.6.0`

- Add Bearer token in rest Session

## `4.5.6`

- Fix allowable values not exactly matching input

## `4.5.5`

- Fix absence of default value text when falsy values are used.

## `4.5.4`

- Patched vulnerabilities.

## `4.5.3`

- Fixed alignment of output from `zowe plugins list` command.

## `4.5.2`

- Fix failure to load secure profile fields that are optional when no value is found. Thanks @tjohnsonBCM
- Don't load secure profile fields when deleting profile. Thanks @tjohnsonBCM
- Deprecate the interface `ICliILoadProfile`. Use `ICliLoadProfile` instead.

## `4.5.1`

- Check that password is defined when `AbstractSession` uses auth. Thanks @apsychogirl
- Expose `IRestOptions` type in the API. Thanks @apsychogirl

## `4.5.0`

- Add `request` function to `AbstractRestClient` that returns REST client object in response. Thanks @Alexandru-Dimitru
- Deprecate the method `AbstractRestClient.performRest`. Use `AbstractRestClient.request` instead.

## `4.0.0`

- Support `prompt*` as a value for any CLI option to enable interactive prompting.

## `3.0.0`

- Rename package from "@brightside/imperative" to "@zowe/imperative".
- Change name of config option "credential-manager" to "CredentialManager".
