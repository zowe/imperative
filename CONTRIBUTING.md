# How to Contribute

This document is intended for developers who would like to contribute code to imperative.

__NOTE:__ This guide is still a work in progress and may change quite often until finalized.

## Project Structure

This section will go over the structure of the project and how packages should interact.

## Maintainers

This section lists the maintainers of the project

## FAQ

This section will go over any frequently asked questions. This might not be in the final version of the contribution guide.

## Legal

Legal requirements and link to accept and sign the CLA should go here

---

Everything below this line could be part of a separate doc, but for the purposes of outlining, I've included a heading and a short description.

---

## Code of Conduct

Seen in many open source projects, the code of conduct describes what behaviors are acceptable in this project. The contents can be placed in a special `CODE_OF_CONDUCT.md` file at the root of the repository and GitHub will integrate the contents in various locations on the UI.

## Code Style Guides

This would be a separate document describing our code style and what rules need to be abided by in the Imperative project. We should also go and revisit the linter and change anything that we don't agree with. (We should also make it so that only files changed are linted as Google suggests to constantly review your style rules but not to retrofit them on things that already exist unless the file is changing)

## Pull Request Process

This could be a section of this document or it's own separate document. This section describes the processes to open, review and merge a pull request. A document, `PULL_REQUEST_TEMPLATE.md`, also needs to be created; the contents of this file will be auto-placed into any new PRs opened from the UI.

## Issue Process

This could be a section of this document or it's own seperate document. This section describes the processes to open, discuss and fix an issue found in Imperative. A document, `ISSUE_TEMPLATE.md`, also needs to be created; the contents of this file will be auto-placed into any new issues opened in GitHub.

## Testing Guidelines

This document should go over the frameworks we are using for testing and how we are using them. For unit tests, we should describe the expected code coverage to hit on a module and how to be smart about mocking objects. For integration tests, we should describe a recommended technique to integration test the code. We should suggest that to integration test, test cli's are created within the tests folder and run through ts-node (while this doesn't capture code coverage, we should really only care about code coverage on the unit tests)

Things that should be included in the final document:

- Do not duplicate top level describes in different test files
- Do not use a `.` character in a describe name string. This affects the formatting of the JUnit output on Jenkins
