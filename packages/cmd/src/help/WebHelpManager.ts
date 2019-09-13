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
import { IWebHelpPackageMetadata } from "./doc/IWebHelpPackageMetadata";
import { IWebHelpParms } from "./doc/IWebHelpParms";
import { Logger } from "../../../logger";
import { ImperativeError } from "../../../error";

/**
 * Type used when comparing package metadata. If it contains metadata, it is
 * new metadata that is different from the old. If it is `null`, then nothing
 * has changed.
 * @type {MaybePackageMetadata}
 */
type MaybePackageMetadata = null | IWebHelpPackageMetadata[];

/**
 * Imperative web help manager. Single instance class used to launch web help
 * in browser which handles (re)building web help files first if necessary.
 * @export
 * @class WebHelpManager
 */
export class WebHelpManager implements IWebHelpManager {
    /**
     * Singleton instance of this class
     * @private
     * @static
     * @type {WebHelpManager}
     * @memberof WebHelpManager
     */
    private static mInstance: WebHelpManager = null;

    /**
     * Web help parms containing Imperative command tree and config
     * @private
     * @memberof WebHelpManager
     */
    private mWebHelpParms: IWebHelpParms = null;

    /**
     * Logger for Imperative instance
     * @private
     * @memberof WebHelpManager
     */
    private mImpLogger: Logger = Logger.getImperativeLogger();

    /**
     * Return a singleton instance of this class
     * @static
     * @readonly
     */
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

    /**
     * Launch root help page in browser.
     * @param {IHandlerResponseApi} cmdResponse - Command response object to use for output
     * @memberof WebHelpManager
     */
    public openRootHelp(cmdResponse: IHandlerResponseApi) {
        if (!this.areParmsSet("openRootHelp", cmdResponse)) {
            return;
        }
        this.openHelp(null, cmdResponse);
    }

    /**
     * Launch help page for specific group/command in browser.
     * @param {string} inContext - Name of page for group/command to jump to
     * @param {IHandlerResponseApi} cmdResponse - Command response object to use for output
     * @memberof WebHelpManager
     */
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
            return false;
        }

        const newMetadata: MaybePackageMetadata = this.checkIfMetadataChanged();
        if (newMetadata !== null) {
            (new WebHelpGenerator(this.mWebHelpParms, this.webHelpDir)).
                 buildHelp(cmdResponse);
            this.writePackageMetadata(newMetadata);
        }

        cmdResponse.console.log("Launching web help in browser...");

        /* Update cmdToLoad value in tree-data.js to jump to desired command.
        * This is kind of a hack, necessitated by the fact that unfortunately
        * Windows does not natively support passing URL search params to
        * file:/// links. Therefore the `p` parameter supported by the docs
        * site to load a page in-context cannot be used here.
        */
        const treeDataPath = path.join(this.webHelpDir, "tree-data.js");
        const treeDataContent = fs.readFileSync(treeDataPath).toString();
        const cmdToLoad = inContext ? `"${inContext}"` : "null";
        fs.writeFileSync(treeDataPath,
            treeDataContent.replace(/(const cmdToLoad)[^;]*;/, `$1 = ${cmdToLoad};`));

        try {
            const openerProc = require("opener")("file:///" + this.webHelpDir + "/index.html");

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
        } catch (e) {
            throw new ImperativeError({
                msg: "Failed to launch web help, try running -h for console help instead",
                causeErrors: [e]
            });
        }

        return true;
    }

    /**
     * A utility function called at the beginning of every public function
     * in this class to guarantee that recordParms() is called first.
     *
     * @param funNmToDisplay
     *  The function name to display as the prematurely called function.
     *
     * @param cmdResponse
     *  The response object used to issue an error message to the user.
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

    /**
     * Gets the directory where built copy of web help is stored
     * @readonly
     * @private
     * @returns {string} Absolute path of directory
     */
    private get webHelpDir(): string {
        return path.join(this.mWebHelpParms.cliHome, Constants.WEB_HELP_DIR);
    }

    /**
     * Computes current package metadata based on version of core and installed plug-ins
     * @private
     * @param packageJson - CLI package JSON
     * @param pluginsJson - Imperative plug-ins JSON
     * @returns {IWebHelpPackageMetadata[]} Names and versions of all components
     */
    private calcPackageMetadata(packageJson: any, pluginsJson: any): IWebHelpPackageMetadata[] {
        return [
            { name: packageJson.name, version: packageJson.version },
            ...Object.keys(pluginsJson).map((name: any) => {
                return { name, version: pluginsJson[name].version };
            })
        ];
    }

    /**
     * Compares two package metadata objects to see if they are equal
     * @private
     * @param {IWebHelpPackageMetadata[]} cached - Old cached package metadata
     * @param {IWebHelpPackageMetadata[]} current - Freshly computed package metadata
     * @returns {boolean} True if the package metadata objects are equal
     */
    private eqPackageMetadata(cached: IWebHelpPackageMetadata[], current: IWebHelpPackageMetadata[]): boolean {
        return JSON.stringify(cached.sort((a, b) => a.name.localeCompare(b.name))) ===
            JSON.stringify(current.sort((a, b) => a.name.localeCompare(b.name)));
    }

    /**
     * Checks if cached package metadata is non-existent or out of date
     * @private
     * @returns {MaybePackageMetadata} Updated metadata, or `null` if cached metadata is already up to date
     */
    private checkIfMetadataChanged(): MaybePackageMetadata {
        // Load cached metadata from file if it exists
        const metadataFile = path.join(this.webHelpDir, "metadata.json");
        let cachedMetadata: IWebHelpPackageMetadata[] = [];
        if (fs.existsSync(metadataFile)) {
            cachedMetadata = require(metadataFile);
        }

        // Compute current metadata and compare it to cached
        const currentMetadata: IWebHelpPackageMetadata[] = this.calcPackageMetadata(this.mWebHelpParms.callerPackageJson,
            require(path.join(this.mWebHelpParms.cliHome, "plugins", "plugins.json")));

        const metadataChanged: boolean = !this.eqPackageMetadata(cachedMetadata, currentMetadata);
        return metadataChanged ? currentMetadata : null;
    }

    /**
     * Updates cached package metadata
     * @private
     * @param {IWebHelpPackageMetadata[]} metadata - New metadata to save to disk
     */
    private writePackageMetadata(metadata: IWebHelpPackageMetadata[]) {
        const metadataFile = path.join(this.webHelpDir, "metadata.json");
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    }
}
