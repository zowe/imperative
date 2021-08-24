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
import * as JSONC from "comment-json";
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ImperativeConfig } from "../../../../../utilities";
import { IConfig } from "../../../../../config";
import { CredentialManagerFactory } from "../../../../../security";
import { OverridesLoader } from "../../../OverridesLoader";
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
        // await this.ensureCredentialManagerLoaded();
        const config = ImperativeConfig.instance.config;
        const configDir = params.arguments.globalConfig ? null : process.cwd();
        config.api.layers.activate(params.arguments.userConfig, params.arguments.globalConfig, configDir);
        const layer = config.api.layers.get();

        if (fs.existsSync(params.arguments.location)) {
            const configJson: IConfig = JSONC.parse(fs.readFileSync(params.arguments.location, "utf-8"));
            config.api.layers.merge(configJson);
        } else {
            const configJson: IConfig = await this.download(params.arguments.location);
            config.api.layers.merge(configJson);
        }

        // Write the active created/updated config layer
        await config.api.layers.write();

        params.response.console.log(`Imported config to ${layer.path}`);
    }

    /**
     * If CredentialManager was not already loaded by Imperative.init, load it
     * now before performing config operations in the init handler.
     */
    private async ensureCredentialManagerLoaded() {
        if (!CredentialManagerFactory.initialized) {
            await OverridesLoader.loadCredentialManager(ImperativeConfig.instance.loadedConfig,
                ImperativeConfig.instance.callerPackageJson);
        }
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
}
