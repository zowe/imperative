# Contribution Guidelines
This document is intended to be a living summary of conventions & best practices for development within Imperative.

## Changelog Update Guidelines

The changelog should be updated for any PR that updates code that will be distributed to the end user. Changes to certain files, such as the Jenkinsfile, do not require an update to the changelog.

The following code block should be inserted into the Changelog above the last released version:

```
## Recent Changes

- <Your changes should>
- <be documented here>
```

## Primary Contribution Guidelines

The following information is critical to working with the code, running/writing/maintaining automated tests, developing consistent syntax, and ensuring that Imperative integrates with Zowe CLI properly:

| For more information about ... | See: |
| ------------------------------ | ----- |
| General guidelines that apply to contributing to Zowe CLI and Plug-ins | [Contribution Guidelines](https://github.com/Zowe/zowe-cli/blob/master/CONTRIBUTING.md) |
| Conventions and best practices for creating packages and plug-ins for Zowe CLI | [Package and Plug-in Guidelines](https://github.com/zowe/zowe-cli/blob/master/docs/PackagesAndPluginGuidelines.md)|
| Guidelines for running tests on Zowe CLI | [Testing Guidelines](https://github.com/zowe/zowe-cli/blob/master/docs/TESTING.md) |
| Guidelines for running tests on the plug-ins that you build for Zowe CLI | [Plug-in Testing Guidelines](https://github.com/zowe/zowe-cli/blob/master/docs/PluginTESTINGGuidelines.md) |
| Documentation that describes the features of the Imperative CLI Framework | [About Imperative CLI Framework](https://github.com/zowe/imperative/wiki) |
Versioning conventions for Zowe CLI and Plug-ins| [Versioning Guidelines](https://github.com/zowe/zowe-cli/blob/master/docs/MaintainerVersioning.md) |

## Contribution Guidelines Specific to Imperative

The following guidelines apply specifically to the Imperative project:

- Do not duplicate top level describes in different test files.
- Do not use a `.` character in a describe name string. This affects the formatting of the JUnit output on Jenkins.
