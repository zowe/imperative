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
import { fileURLToPath, pathToFileURL, URL } from "url";
import * as JSONC from "comment-json";
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ImperativeConfig } from "../../../../../utilities";
import { IConfig } from "../../../../../config";
import { RestClient, Session } from "../../../../../rest";

/**
 * Import config
 */
export default class ImportHandler implements ICommandHandler {
    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        // Load the config and set the active layer according to user options
        const config = ImperativeConfig.instance.config;
        const configDir = params.arguments.globalConfig ? null : process.cwd();
        config.api.layers.activate(params.arguments.userConfig, params.arguments.globalConfig, configDir);
        const layer = config.api.layers.get();

        if (layer.exists && !params.arguments.overwrite) {
            params.response.console.log(`Skipping import because ${layer.path} already exists.\n` +
                `Rerun the command with the --overwrite flag to import anyway.`);
            return;
        }

        const configFilePath = path.resolve(params.arguments.location);
        const isConfigLocal = fs.existsSync(configFilePath) || path.isAbsolute(params.arguments.location);
        const configJson: IConfig = isConfigLocal ?
            JSONC.parse(fs.readFileSync(configFilePath, "utf-8")) :
            await this.fetchConfig(new URL(params.arguments.location));
        config.api.layers.set(configJson);

        let schemaImported = false;
        if (configJson.$schema?.startsWith("./")) {  // Only import schema if relative path
            const schemaUri = new URL(configJson.$schema,
                isConfigLocal ? pathToFileURL(configFilePath) : params.arguments.location);
            const schemaFilePath = path.resolve(path.dirname(layer.path), configJson.$schema);
            try {
                await this.downloadSchema(schemaUri, schemaFilePath);
                schemaImported = true;
            } catch (error) {
                params.response.console.error(`Failed to download schema from ${schemaUri}`);
            }
        }

        // Write the active created/updated config layer
        await config.api.layers.write();

        params.response.console.log(`Imported config${schemaImported ? " and schema" : ""} to ${layer.path}`);
    }

    /**
     * Download the config from a URL
     * @param url Web URL of the config JSON file
     * @returns Parsed config object
     */
    private async fetchConfig(url: URL): Promise<IConfig> {
        const session = Session.createFromUrl(url, false);
        const response = await RestClient.getExpectString(session, url.pathname);
        return JSONC.parse(response);
    }

    /**
     * Download the config schema from a URL to disk
     * @param url Web URL of the schema JSON file
     * @param filePath Local path to download to
     */
    private async downloadSchema(url: URL, filePath: string): Promise<void> {
        if (url.protocol === "file:") {
            fs.copyFileSync(fileURLToPath(url), filePath);
        } else {
            const session = Session.createFromUrl(url, false);
            const response = await RestClient.getExpectString(session, url.pathname);
            fs.writeFileSync(filePath, response);
        }
    }
}
