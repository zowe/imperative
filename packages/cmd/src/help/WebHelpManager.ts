import * as fs from "fs";
import * as path from "path";
import * as open from "open";
import { CommandResponse } from "../response/CommandResponse";
import { Constants } from "../../../constants/src/Constants";
import { ImperativeConfig } from "../../../imperative/src/ImperativeConfig";
import { IWebHelpManager } from "./doc/IWebHelpManager";
import { WebHelpGenerator } from "./WebHelpGenerator";
import { Imperative } from "../../../imperative/src/Imperative";

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

    public async openRootHelp() {
        const newMetadata: MaybePackageMetadata = this.checkIfMetadataChanged();
        if (newMetadata !== null) {
            (new WebHelpGenerator(ImperativeConfig.instance, this.docsDir)).buildHelp();
            this.writePackageMetadata(newMetadata);
        }

        try {
            await open("file://" + this.docsDir + "/index.html");
        } catch {
            // TODO Handle error here
        }
    }

    public async openHelp(inContext: string) {
        const newMetadata: MaybePackageMetadata = this.checkIfMetadataChanged();
        if (newMetadata !== null) {
            (new WebHelpGenerator(ImperativeConfig.instance, this.docsDir)).buildHelp();
            this.writePackageMetadata(newMetadata);
        }

        try {
            await open("file://" + this.docsDir + "/index.html?p=" + inContext);
        } catch {
            // TODO Handle error here
        }
    }

    private get docsDir(): string {
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
     * @returns {MaybePackageMetadata} - `null` if cached metadata is up to date, otherwise updated metadata
     */
    private checkIfMetadataChanged(): MaybePackageMetadata {
        const metadataFile = path.join(this.docsDir, "metadata.json");
        let cachedMetadata: IPackageMetadata[] = [];
        if (fs.existsSync(metadataFile)) {
            cachedMetadata = JSON.parse(fs.readFileSync(metadataFile).toString());
        }

        const myConfig: ImperativeConfig = ImperativeConfig.instance;
        const currentMetadata: IPackageMetadata[] = this.calcPackageMetadata(myConfig.callerPackageJson,
            JSON.parse(fs.readFileSync(path.join(myConfig.cliHome, "plugins", "plugins.json")).toString())
        );

        const metadataChanged: boolean = !this.eqPackageMetadata(cachedMetadata, currentMetadata);
        return metadataChanged ? currentMetadata : null;
    }

    /**
     * Updates cached package metadata
     * @param {IPackageMetadata[]} metadata - New metadata to save to disk
     */
    private writePackageMetadata(metadata: IPackageMetadata[]) {
        const metadataFile = path.join(this.docsDir, "metadata.json");
        fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    }
}
