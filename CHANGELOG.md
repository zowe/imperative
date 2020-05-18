# Change Log

All notable changes to the Imperative package will be documented in this file.

## Recent Changes

- Add the --dd flag to profile creation to allow the profile to be created without the default values specified for that profile.
- Use a token for authentication if a token is present in the underlying REST session object.
- Add a new CredsForSessCfg.addCredsOrPrompt function that places credentials (including a possible token) into a session configuration object.
    - Credentials are obtained from the command line, environment variables, or a profile.
    - If no credentials are available, it will prompt for a user name and password.
    - Any prompt will timeout after 30 seconds so that it will not hang an automated script.
- Add base profiles, a new type of profile which can store values shared between profiles of other types.
    - To use base profiles in an Imperative-based CLI, define a `baseProfile` schema on your Imperative configuration object.
    - If the `baseProfile` schema is defined, base profile support will be added to any command that uses profiles.

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
