# Change Log

All notable changes to the Imperative package will be documented in this file.

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
