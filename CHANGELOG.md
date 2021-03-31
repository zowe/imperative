# Change Log

All notable changes to the Imperative package will be documented in this file.

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
