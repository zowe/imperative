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

import * as fs from "fs";
import * as path from "path";
import { ImperativeConfig } from "../../utilities";
import { IImperativeInstallState } from "./doc/IImperativeInstallState";
import { PMFConstants } from "./plugins/utilities/PMFConstants";
import { PluginIssues } from "./plugins/utilities/PluginIssues";

export class InstallStateManager {
    /**
     * Specifies whether the install state has changed
     * @public
     * @type {boolean}
     * @memberof InstallStateManager
     */
    public changed: boolean;

    /**
     * Filename where install state is stored
     * @private
     * @type {string}
     * @memberof InstallStateManager
     */
    private installStateFile: string;

    /**
     * Current install state computed by getInstallState
     * @private
     * @type {IImperativeInstallState[]}
     * @memberof InstallStateManager
     */
    private currentState: IImperativeInstallState[];

    constructor(installStateFile: string) {
        this.installStateFile = installStateFile;
        this.checkIfChanged();
    }

    /**
     * Updates cached install state
     * @param {IImperativeInstallState[]} state - New install state to save to disk
     */
    public writeInstallState() {
        fs.writeFileSync(this.installStateFile, JSON.stringify(this.currentState, null, 2));
    }

    /**
     * Get current install state based on version of core and installed plug-ins
     * @private
     * @param packageJson - CLI package JSON
     * @param pluginsJson - Imperative plug-ins JSON
     * @returns {IImperativeInstallState[]} Names and versions of all components
     */
    private getInstallState(packageJson: any, pluginsJson: any): IImperativeInstallState[] {
        return [{
            name: packageJson.name,
            version: packageJson.version,
            installPath: path.dirname(ImperativeConfig.instance.callerLocation),
            pluginsPath: PMFConstants.instance.PMF_ROOT
        },
            ...Object.keys(pluginsJson).map((name: string) => {
                return { name, version: pluginsJson[name].version };
            })
        ];
    }

    /**
     * Compares two install state objects to see if they are equal
     * @private
     * @param {IImperativeInstallState[]} cached - Old cached install state
     * @param {IImperativeInstallState[]} current - Freshly computed install state
     * @returns {boolean} True if the install state objects are equal
     */
    private eqInstallState(cached: IImperativeInstallState[], current: IImperativeInstallState[]): boolean {
        return JSON.stringify(cached.sort((a, b) => a.name.localeCompare(b.name))) ===
            JSON.stringify(current.sort((a, b) => a.name.localeCompare(b.name)));
    }

    /**
     * Checks if cached install state is non-existent or out of date
     * @private
     */
    private checkIfChanged() {
        // Load cached install state from file if it exists
        let cachedState: IImperativeInstallState[] = [];
        if (fs.existsSync(this.installStateFile)) {
            cachedState = JSON.parse(fs.readFileSync(this.installStateFile, "utf8"));
        }

        // Load info about installed plugins if there are any
        let installedPlugins = {};
        if (fs.existsSync(PMFConstants.instance.PLUGIN_JSON)) {
            installedPlugins = PluginIssues.instance.getInstalledPlugins();
        }

        // Compute current install state and compare it to cached
        const myConfig: ImperativeConfig = ImperativeConfig.instance;
        this.currentState = this.getInstallState(myConfig.callerPackageJson, installedPlugins);

        this.changed = !this.eqInstallState(cachedState, this.currentState);
    }
}
