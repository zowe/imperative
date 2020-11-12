This entire directory was associated with managing .zowe/settings/imperative.json.
It was designed to manage a variety of configuration settings.
The only setting that was ever managed was overrides.CredentialManager.

We included secure credential store functionality into core zowe CLI.
Thus, the functionality of this directory is no longer needed. If we default
to the now built-in CredentialManager, we do not have to provide a means to
override the CredentialManager (nobody seems to want an override).

We kept these files in the repo in case there is a future demand to override
CredentialManager. We renamed the directory to reflect its non-use,
and excluded the directory from compiles in our repo's root directory's
tsconfig.json file. At some point in the future, we could delete this
entire directory.

Snippets of code in other files that would have to be restored to reinstate
CredentialManager overrides are marked with todo:overrides.

