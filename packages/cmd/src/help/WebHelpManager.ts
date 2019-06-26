import * as fs from "fs";
import * as path from "path";
import { Constants } from "../../../constants/src/Constants";
import { ImperativeConfig } from "../../../imperative/src/ImperativeConfig";
import { IWebHelpManager } from "./doc/IWebHelpManager";
import { WebHelpGenerator } from "./WebHelpGenerator";
import { IHandlerResponseApi } from "../doc/response/api/handler/IHandlerResponseApi";

const opener = require("opener");

interface IPackageMetadata {
    name: string;
    version: string;
}

type MaybePackageMetadata = null | IPackageMetadata[];

export class WebHelpManager implements IWebHelpManager {
    private static mInstance: WebHelpManager = null;

    public static get instance(): WebHelpManager {
        if (this.mInstance == null) {
            this.mInstance = new WebHelpManager();
        }

        return this.mInstance;
    }

    public openRootHelp(cmdResponse: IHandlerResponseApi) {
        this.openHelp(null, cmdResponse);
    }

    public openHelp(inContext: string, cmdResponse: IHandlerResponseApi) {
        const newMetadata: MaybePackageMetadata = this.checkIfMetadataChanged();
        if (newMetadata !== null) {
            (new WebHelpGenerator(ImperativeConfig.instance, this.webHelpDir)).buildHelp(cmdResponse);
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
            opener("file:///" + this.webHelpDir + "/index.html");
        } catch {
            cmdResponse.console.error("Failed to launch web help, try running -h for console help instead");
        }
    }

    private get webHelpDir(): string {
        return path.join(ImperativeConfig.instance.cliHome, Constants.WEB_HELP_DIR);
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
        const myConfig: ImperativeConfig = ImperativeConfig.instance;
        const currentMetadata: IPackageMetadata[] = this.calcPackageMetadata(myConfig.callerPackageJson,
            require(path.join(myConfig.cliHome, "plugins", "plugins.json")));

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
