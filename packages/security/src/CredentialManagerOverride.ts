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

import * as path from "path";
import { readJsonSync, writeJsonSync } from "fs-extra";

import { ICredentialManagerNameMap } from "./doc/ICredentialManagerNameMap";
import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";
import { ISettingsFile } from "../../settings/src/doc/ISettingsFile";

/**
 * This class provides access to the known set of credential manager overrides
 * and functions to manipulate which credential manager is in use.
 * Other credential managers can replace the default credential manager.
 * Both CLI plugins and Zowe Explorer extensions can override the default
 * credential manager. However, only one credential manager will be in effect
 * on a given computer. The last component to override the credential
 * manager wins.
 */
export class CredentialManagerOverride {
    public static readonly DEFAULT_CRED_MGR_NAME: string = "@zowe/cli";

    private static readonly KNOWN_CRED_MGRS: ICredentialManagerNameMap[] = [
        {
            "credMgrDisplayName": this.DEFAULT_CRED_MGR_NAME
        },
        {
            "credMgrDisplayName": "Secrets for Kubernetes",
            "credMgrPluginName": "@zowe/secrets-for-kubernetes-for-zowe-cli",
            "credMgrZEName": "Zowe.secrets-for-kubernetes"
        }
    ];

    //________________________________________________________________________
    /**
     * Get the known credential managers.
     *
     * @returns An array of credential managers.
     */
    public static getKnownCredMgrs() : ICredentialManagerNameMap[] {
        return this.KNOWN_CRED_MGRS;
    }

    /**
     * Override the current credential manager with the specified
     * credential manager. A plugin or ZE extension that provides a
     * credential manager would override the default credential manager
     * upon installation.
     *
     * @param newCredMgrName
     *        The display name of your credential manager.
     *
     * @throws An ImperativeError upon error.
     */
    public static overrideCredMgr(newCredMgrName: string) : void {
        let settings: any;
        try {
            settings = this.getSettingsFileJson();
        } catch (error) {
            throw new ImperativeError({
                msg: "Due to error in settings file, unable to override the credential manager with '" +
                newCredMgrName + "'" +
                "\nReason: " + error.message
            });
        }

        settings.json.overrides.CredentialManager = newCredMgrName;
        try {
            writeJsonSync(settings.fileName, settings.json, {spaces: 2});
        } catch (error) {
            throw new ImperativeError({
                msg: "Unable to write settings file = " + settings.fileName +
                "\nReason: " + error.message
            });
        }
    }

    //________________________________________________________________________
    /**
     * Replace the specified credential manager with the default Zowe CLI
     * credential manager. A plugin or ZE extension that provides a
     * credential manager would replace itself with the default credential
     * manager when it is being uninstalled.
     *
     * @param credMgrToReplace
     *        The display name of your credential manager. This name
     *        must be the current credential manager in effect.
     *        Otherwise, no replacement will be performed.
     *
     * @throws An ImperativeError upon error.
     */
    public static replaceCredMgrWithDefault(credMgrToReplace: string) : void {
        let settings: any;
        try {
            settings = this.getSettingsFileJson();
        } catch (error) {
            throw new ImperativeError({
                msg: "Due to error in settings file, unable to replace the credential manager named '" +
                credMgrToReplace + "'" +
                "\nReason: " + error.message
            });
        }

        if ( settings.json.overrides.CredentialManager != credMgrToReplace ) {
            throw new ImperativeError({
                msg: "The current Credential Manager = '" +
                settings.json.overrides.CredentialManager +
                "' does not equal the Credential Manager name to be replaced = '" +
                credMgrToReplace + "' in settings file = '" + settings.fileName +
                "'. The current Credential Manager has not been replaced."
            });
        }
        settings.json.overrides.CredentialManager = this.DEFAULT_CRED_MGR_NAME;
        try {
            writeJsonSync(settings.fileName, settings.json, {spaces: 2});
        } catch (error) {
            throw new ImperativeError({
                msg: "Unable to write settings file = " + settings.fileName +
                "\nReason: " + error.message
            });
        }
    }

    //________________________________________________________________________
    /**
     * Get the contents of the $ZOWE_CLI_HOME/settings/imperative.json file.
     * The resulting JSON is guaranteed to contain the key
     * 'overrides.CredentialManager'.
     *
     * @returns A 'settings' object with the properties: fileName and json.
     *          The json object contains the contents of the settings file.
     *
     * @throws An ImperativeError if the file does not exist or have the key.
     */
    private static getSettingsFileJson() {
        const settings = {
            fileName: "",
            json: {} as ISettingsFile
        };
        try {
            settings.fileName = path.join(ImperativeConfig.instance.cliHome, "settings", "imperative.json");
            settings.json = readJsonSync(settings.fileName);
        } catch (error) {
            throw new ImperativeError({
                msg: "Unable to read settings file = " + settings.fileName +
                "\nReason: " + error.message
            });
        }
        if ( typeof(settings.json?.overrides?.CredentialManager) === "undefined") {
            throw new ImperativeError({
                msg: "The property key 'overrides.CredentialManager' does not exist in settings file = " +
                settings.fileName
            });
        }
        return settings;
    }

}
