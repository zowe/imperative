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

import { Constants } from "../../../constants/src/Constants";
import { GuiResult, ProcessUtils } from "../../../utilities";
import { IWebHelpManager } from "./doc/IWebHelpManager";
import { WebHelpGenerator } from "./WebHelpGenerator";
import { IHandlerResponseApi } from "../doc/response/api/handler/IHandlerResponseApi";
import { ICommandDefinition } from "../doc/ICommandDefinition";
import { IWebHelpParms } from "./doc/IWebHelpParms";
import { Logger } from "../../../logger";

const opener = require("opener");

interface IPackageMetadata {
    name: string;
    version: string;
}

type MaybePackageMetadata = null | IPackageMetadata[];

export class WebHelpManager implements IWebHelpManager {
    private static mInstance: WebHelpManager = null;
    private mWebHelpParms: IWebHelpParms = null;
    private mImpLogger: Logger = Logger.getImperativeLogger();

    public static get instance(): WebHelpManager {
        if (this.mInstance == null) {
            this.mInstance = new WebHelpManager();
        }

        return this.mInstance;
    }

    /**
     * Record the parameters used by WebHelpManager.
     * Our caller must call this function before any other public function.
     *
     * @param webHelpParms - The parameters to record.
     */
    public recordParms(webHelpParms: IWebHelpParms) {
        this.mWebHelpParms = webHelpParms;
    }

    public openRootHelp(cmdResponse: IHandlerResponseApi) {
        if (!this.areParmsSet("openRootHelp", cmdResponse)) {
            return;
        }
        this.openHelp(null, cmdResponse);
    }

    public openHelp(inContext: string, cmdResponse: IHandlerResponseApi) {
        if (!this.areParmsSet("openHelp", cmdResponse)) {
            return;
        }

        const doWeHaveGui = ProcessUtils.isGuiAvailable();
        if (doWeHaveGui !== GuiResult.GUI_AVAILABLE) {
            let errMsg = "You are running in an environment with no graphical interface." +
                         "\nAlternatively, you can run '" + this.mWebHelpParms.rootCommandName +
                         " --help' for text-based help.";
            if (doWeHaveGui === GuiResult.NO_GUI_NO_DISPLAY) {
                errMsg += "\n\nIf you are running in an X Window environment," +
                          "\nensure that your DISPLAY environment variable is set." +
                          "\nFor example, type the following:" +
                          "\n    echo $DISPLAY" +
                          "\nIf it is not set, assign a valid value. For example:" +
                          "\n    export DISPLAY=:0.0" +
                          "\nThen try the --help-web option again.";
            }
            cmdResponse.console.log(errMsg);
            return;
        }

        const newMetadata: MaybePackageMetadata = this.checkIfMetadataChanged();
        if (newMetadata !== null) {
            (new WebHelpGenerator(this.mWebHelpParms, this.webHelpDir)).
                 buildHelp(cmdResponse);
            this.writePackageMetadata(newMetadata);
        }

        cmdResponse.console.log("Launching web help in browser...");

        // Update cmdToLoad value in tree-data.js to jump to desired command.
        // This is kind of a hack, necessitated by the fact that unfortunately
        // Windows does not natively support passing URL search params to
        // file:/// links. Therefore the `p` parameter supported by the docs
        // site to load a page in-context cannot be used here.
        const treeDataPath = path.join(this.webHelpDir, "tree-data.js");
        const treeDataContent = fs.readFileSync(treeDataPath).toString();
        const cmdToLoad = (inContext !== null) ? `"${inContext}"` : "null";
        fs.writeFileSync(treeDataPath,
            treeDataContent.replace(/(const cmdToLoad)[^;]*;/, `$1 = ${cmdToLoad};`));

        try {
            const openerProc = opener("file:///" + this.webHelpDir + "/index.html");

            if (process.platform !== "win32") {
                /* On linux, without the following statements, the zowe
                * command does not return until the browser is closed.
                * Mac is untested, but for now we treat it like linux.
                */
                openerProc.unref();
                openerProc.stdin.unref();
                openerProc.stdout.unref();
                openerProc.stderr.unref();
            }
        } catch {
            cmdResponse.console.error("Failed to launch web help, try running -h for console help instead");
        }
    }

    /**
     * Record a reference to our CLI's full command tree.
     * @param fullCommandTree - The command tree.
     */
    /* todo: remove this function
    public set fullCommandTree(fullCommandTree: ICommandDefinition) {
        this.mFullCommandTree = fullCommandTree;
    }
    */

    /**
     * Get a reference to our CLI's full command tree.
     * @returns The command tree.
     */
    /* todo: remove this function
    public get fullCommandTree(): ICommandDefinition {
        return this.mFullCommandTree;
    }
    */

    /**
     * A utility function called at the beginning of every public function
     * in this class to guarantee that recordParms() is called first.
     *
     * @param funNmToDisplay
     *  The function name to display as the prematurely called function.
     *
     * @param cmdResponse
     *  The repsons object used to issue an error message to the user..
     */
    private areParmsSet(funNmToDisplay: string, cmdResponse: IHandlerResponseApi): boolean {
        if ( this.mWebHelpParms === null ) {
            this.mImpLogger.error(
                `areParmsSet: mWebHelpParms is null. It is likely that recordParms was not called before "${funNmToDisplay}".`
            );
            cmdResponse.console.error(
                "Unable to launch help due to an implementation error.\n" +
                "See the imperative log for details."
            );
            return false;
        }
        return true;
    }

    private get webHelpDir(): string {
        return path.join(this.mWebHelpParms.cliHome, Constants.WEB_HELP_DIR);
    }

    /**
     * Computes current package metadata based on version of core and installed plug-ins
     * @param packageJson - CLI package JSON
     * @param pluginsJson - Imperative plug-ins JSON
     * @returns {IPackageMetadata[]} Names and versions of all components
     */
    private calcPackageMetadata(packageJson: any, pluginsJson: any): IPackageMetadata[] {
        return [
            { name: packageJson.name, version: packageJson.version },
            ...Object.keys(pluginsJson).map((name: any) => {
                return { name, version: pluginsJson[name].version };
            })
        ];
    }

    /**
     * Compares two package metadata objects to see if they are equal
     * @param {IPackageMetadata[]} cached - Old cached package metadata
     * @param {IPackageMetadata[]} current - Freshly computed package metadata
     * @returns {boolean} True if the package metadata objects are equal
     */
    private eqPackageMetadata(cached: IPackageMetadata[], current: IPackageMetadata[]): boolean {
        return JSON.stringify(cached.sort((a, b) => a.name.localeCompare(b.name))) ===
            JSON.stringify(current.sort((a, b) => a.name.localeCompare(b.name)));
    }

    /**
     * Checks if cached package metadata is non-existent or out of date
     * @returns {MaybePackageMetadata} Updated metadata, or `null` if cached metadata is already up to date
     */
    private checkIfMetadataChanged(): MaybePackageMetadata {
        // Load cached metadata from file if it exists
        const metadataFile = path.join(this.webHelpDir, "metadata.json");
        let cachedMetadata: IPackageMetadata[] = [];
        if (fs.existsSync(metadataFile)) {
            cachedMetadata = require(metadataFile);
        }

        // Compute current metadata and compare it to cached
        const currentMetadata: IPackageMetadata[] = this.calcPackageMetadata(this.mWebHelpParms.callerPackageJson,
            require(path.join(this.mWebHelpParms.cliHome, "plugins", "plugins.json")));

        const metadataChanged: boolean = !this.eqPackageMetadata(cachedMetadata, currentMetadata);
        return metadataChanged ? currentMetadata : null;
    }

    /**
     * Updates cached package metadata
     * @param {IPackageMetadata[]} metadata - New metadata to save to disk
     */
    private writePackageMetadata(metadata: IPackageMetadata[]) {
        const metadataFile = path.join(this.webHelpDir, "metadata.json");
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    }
}
