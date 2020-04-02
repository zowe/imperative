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
import { IImperativePackageMetadata } from "./doc/IImperativePackageMetadata";
import { PMFConstants } from "./plugins/utilities/PMFConstants";
import { PluginIssues } from "./plugins/utilities/PluginIssues";
import { Constants } from "./../../constants";
import { ICommandDefinition } from "../../cmd";
import { parse, stringify } from "flatted";
import { Logger } from "../../logger";
import { IImperativeConfig } from "./doc/IImperativeConfig";

export class CommandTreeCache {
    /**
     * Singleton instance of this class
     * @private
     * @static
     * @type {CommandTreeCache}
     * @memberof CommandTreeCache
     */
    private static mInstance: CommandTreeCache = null;

    /**
     * Specifies whether the command tree cache is out of date
     * @private
     * @type {boolean}
     * @memberof CommandTreeCache
     */
    private mOutdated: boolean;

    /**
     * Used for internal imperative logging.
     *
     * @private
     * @type {Logger}
     */
    private impLogger: Logger = Logger.getImperativeLogger();

    /**
     * Current package metadata computed by calcPackageMetadata
     * @private
     * @type {IImperativePackageMetadata[]}
     * @memberof CommandTreeCache
     */
    private currentMetadata: IImperativePackageMetadata[];

    /**
     * Return a singleton instance of this class
     * @static
     * @readonly
     */
    public static get instance(): CommandTreeCache {
        if (this.mInstance == null) {
            this.mInstance = new CommandTreeCache();
        }

        return this.mInstance;
    }

    /**
     * Checks if command tree caching is enabled in ImperativeConfig
     * @static
     * @returns {boolean}
     */
    public static get enabled(): boolean {
        return !ImperativeConfig.instance.loadedConfig.disableCmdTreeCache;
    }

    /**
     * Checks if command tree cache is out of date
     * @readonly
     * @returns {boolean}
     */
    public get outdated(): boolean {
        if (this.mOutdated == null) {
            try {
                this.checkIfOutdated();
            } catch (err) {
                this.mOutdated = true;
                this.impLogger.error("Failed to check if command tree cache is outdated: " + err);
            }
        }

        return this.mOutdated;
    }

    /**
     * Gets the directory where command tree cache is stored
     * @private
     * @readonly
     * @returns {string} Absolute path of directory
     */
    private get cacheDir(): string {
        return path.join(ImperativeConfig.instance.cliHome, Constants.CACHE_DIR);
    }

    /**
     * Gets the filename of command tree cache
     * @private
     * @readonly
     * @returns {string} Absolute path of file
     */
    private get cmdTreeCache(): string {
        return path.join(this.cacheDir, "cmdTreeCache.json");
    }

    /**
     * Gets the filename of package metadata associated with cache
     * @private
     * @readonly
     * @returns {string} Absolute path of file
     */
    private get metadataFile(): string {
        return path.join(this.cacheDir, "metadata.json");
    }

    /**
     * Tries to load command tree from cache. If it fails, the outdated flag
     * will be set to true.
     * @returns {ICommandDefinition} Cached command tree
     */
    public tryLoadCmdTree(): ICommandDefinition {
        if (this.currentMetadata == null) {
            return null;
        }

        let cmdTree: ICommandDefinition;

        try {
            cmdTree = parse(fs.readFileSync(this.cmdTreeCache, "utf8"));
            this.impLogger.info(`Loaded command tree from cache file: ${this.cmdTreeCache}`);
        } catch (err) {
            this.mOutdated = true;
            this.impLogger.error("Failed to load command tree from cache file: " + err);
        }

        return cmdTree;
    }

    /**
     * Saves loaded command tree to cache
     * @param cmdTree
     */
    public saveCmdTree(cmdTree: ICommandDefinition) {
        if (this.currentMetadata == null) {
            return;
        }

        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir);
            }

            fs.writeFileSync(this.cmdTreeCache, stringify(cmdTree));
            this.impLogger.info(`Saved command tree to cache file: ${this.cmdTreeCache}`);
        } catch (err) {
            this.impLogger.error("Failed to save command tree to cache file: " + err);
        }
    }

    /**
     * Saves package metadata associated for current command tree
     */
    public savePackageMetadata() {
        if (this.currentMetadata == null) {
            return;
        }

        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir);
            }

            fs.writeFileSync(this.metadataFile, JSON.stringify(this.currentMetadata, null, 2));
            this.impLogger.info(`Saved package metadata to file: ${this.metadataFile}`);
        } catch (err) {
            this.impLogger.error("Failed to save package metadata to file: " + err);
        }
    }

    /**
     * Checks if cached package metadata is non-existent or out of date
     * @private
     * @static
     */
    private checkIfOutdated() {
        // Load cached package metadata from file if it exists
        let cachedMetadata: IImperativePackageMetadata[] = [];
        if (fs.existsSync(this.metadataFile)) {
            cachedMetadata = JSON.parse(fs.readFileSync(this.metadataFile, "utf8"));
        }

        // Load info about installed plugins if there are any
        let installedPlugins = {};
        if (fs.existsSync(PMFConstants.instance.PLUGIN_JSON)) {
            installedPlugins = PluginIssues.instance.getInstalledPlugins();
        }

        // Compute current package metadata and compare it to cached
        const myConfig: ImperativeConfig = ImperativeConfig.instance;
        this.currentMetadata = this.calcPackageMetadata(myConfig.callerPackageJson, installedPlugins);

        this.mOutdated = !this.eqPackageMetadata(cachedMetadata, this.currentMetadata);
    }

    /**
     * Get current package metadata based on version of core and installed plug-ins
     * @private
     * @param packageJson - CLI package JSON
     * @param pluginsJson - Imperative plug-ins JSON
     * @returns {IImperativePackageMetadata[]} Names and versions of all components
     */
    private calcPackageMetadata(packageJson: any, pluginsJson: any): IImperativePackageMetadata[] {
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
     * Compares two package metadata objects to see if they are equal
     * @private
     * @param {IImperativePackageMetadata[]} cached - Old cached package metadata
     * @param {IImperativePackageMetadata[]} current - Freshly computed package metadata
     * @returns {boolean} True if the package metadata objects are equal
     */
    private eqPackageMetadata(cached: IImperativePackageMetadata[], current: IImperativePackageMetadata[]): boolean {
        return JSON.stringify(cached.sort((a, b) => a.name.localeCompare(b.name))) ===
            JSON.stringify(current.sort((a, b) => a.name.localeCompare(b.name)));
    }
}
