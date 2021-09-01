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
import * as https from "https";
import * as path from "path";
import { fileURLToPath, URL } from "url";
import * as JSONC from "comment-json";
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ImperativeConfig } from "../../../../../utilities";
import { IConfig } from "../../../../../config";
import { ImperativeError } from "../../../../../error";

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

        const configJson: IConfig = fs.existsSync(params.arguments.location) ?
            JSONC.parse(fs.readFileSync(params.arguments.location, "utf-8")) :
            await this.download(params.arguments.location);
        config.api.layers.set(configJson);

        if (configJson.$schema?.startsWith("./")) {  // Only import schema if relative path
            const schemaUri = new URL(configJson.$schema, params.arguments.location);
            const schemaFilePath = path.resolve(path.dirname(layer.path), configJson.$schema);
            try {
                await this.downloadSchema(schemaUri, schemaFilePath);
            } catch (error) {
                params.response.console.error(`Failed to download schema from ${schemaUri}`);
            }
        }

        // Write the active created/updated config layer
        await config.api.layers.write();

        params.response.console.log(`Imported config to ${layer.path}`);
    }

    /**
     * Download the config from a URL
     * @param url
     */
    private download(url: string): Promise<IConfig> {
        // TODO Do we want to use node-fetch here?
        return new Promise<IConfig>((resolve, reject) => {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => {
                    let cnfg;
                    let ok = false;
                    try {
                        cnfg = JSONC.parse(data);
                        // TODO: additional validation?
                        ok = true;
                    } catch (e) {
                        reject(new ImperativeError({ msg: `unable to parse config: ${e.message}` }));
                    }
                    if (ok)
                        resolve(cnfg);
                });
            }).on("error", (err) => { reject(err); });
        });
    }

    /**
     * Download the config schema from a URL to disk
     * @param url
     * @param path
     */
    private downloadSchema(url: URL, path: string): Promise<void> {
        if (url.protocol === "file:") {
            fs.copyFileSync(fileURLToPath(url), path);
        } else {
            const fileStream = fs.createWriteStream(path);
            return new Promise((resolve, reject) => {
                https.get(url, (resp) => {
                    resp.pipe(fileStream);
                    fileStream.on("finish", resolve);
                }).on("error", reject);
            });
        }
    }
}
