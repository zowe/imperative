"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const imperative_1 = require("@zowe/imperative");

const knownCredMgr = imperative_1.CredentialManagerOverride.getKnownCredMgrs()[1];
const credMgrDisplayName = knownCredMgr.credMgrDisplayName;

class PluginLifeCycle extends imperative_1.AbstractPluginLifeCycle {
    postInstall() {
        imperative_1.CredentialManagerOverride.overrideCredMgr(credMgrDisplayName);
        imperative_1.Logger.getImperativeLogger().debug("The plugin did a post-install action");
    }
    preUninstall() {
        imperative_1.CredentialManagerOverride.replaceCredMgrWithDefault(credMgrDisplayName);
        imperative_1.Logger.getImperativeLogger().debug("The plugin did a pre-uninstall action");
    }
}

module.exports = PluginLifeCycle;