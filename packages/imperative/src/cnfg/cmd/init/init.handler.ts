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

import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { Config } from "../../../../../config/Config";
import { ImperativeError } from "../../../../../error";
import { CliUtils, ImperativeConfig } from "../../../../../utilities";
import * as https from "https";
import { IConfig } from "../../../../../config/IConfig";
import { IConfigProfile } from "../../../../../config/IConfigProfile";

/**
 * The get command group handler for cli configuration settings.
 */
export default class InitHandler implements ICommandHandler {

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const config = Config.load(ImperativeConfig.instance.rootCommandName);
        config.api.layers.activate(params.arguments.user, params.arguments.global);
        const layer = config.api.layers.get();
        if (layer.exists && !params.arguments.update)
            throw new ImperativeError({ msg: `config "${layer.path}" already exists` });

        if (params.arguments.url) {
            const cnfg = await this.getConfig(params.arguments.url);
            config.api.layers.set(cnfg);
        } else {

            // If schemas are specified, use them as a guide
            if (params.arguments.profile) {
                const profile: IConfigProfile = { properties: {} };
                const path = params.arguments.profile;
                if (path.trim().length === 0) throw new ImperativeError({ msg: `name is required` });

                // if the profile type is requested - walk them thru it
                if (params.arguments.addType) {
                    const type = params.arguments.addType;
                    if (ImperativeConfig.instance.configSchemas[type] != null) {

                        const tname = await CliUtils.promptWithTimeout(`profile name: `, false, 900);
                        if (tname.trim().length === 0) throw new ImperativeError({ msg: `name is required` });

                        // Get the schema - prompt for the name
                        const s = ImperativeConfig.instance.configSchemas[type];

                        // prompt for the values
                        const secureProps: string[] = [];
                        for (const [property, schemaProperty] of Object.entries((s as any).properties)) {
                            if (params.arguments.secure === false || params.arguments.secure && (schemaProperty as any).secure) {

                                // get the summary and value
                                const summary = (schemaProperty as any).optionDefinition.summary ||
                                    (schemaProperty as any).optionDefinition.description;
                                let value: any = await CliUtils.promptWithTimeout(`${property} (${summary}) - blank to skip: `,
                                    (schemaProperty as any).secure, 900);

                                // if secure, remember for the config set
                                if ((schemaProperty as any).secure)
                                    secureProps.push(property);

                                // coerce to correct type
                                if (value.trim().length > 0) {
                                    if (value === "true")
                                        value = true;
                                    if (value === "false")
                                        value = false;
                                    if (!isNaN(value) && !isNaN(parseFloat(value)))
                                        value = parseInt(value, 10);
                                    profile.properties[property] = value;
                                } else if (params.arguments.default && (schemaProperty as any).optionDefinition.defaultValue != null) {
                                    profile.properties[property] = (schemaProperty as any).optionDefinition.defaultValue;
                                }
                            }
                        }
                    } else {
                        params.response.console.error(`type ${type} does not exist`);
                    }
                }

                // Add the profile
                config.api.profiles.set(path, profile);
            }
        }

        // Write the config
        config.write();
    }

    private getConfig(url: string): Promise<IConfig> {
        return new Promise<IConfig>((resolve, reject) => {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => { resolve(JSON.parse(data)); });
            }).on("error", (err) => { reject(err); });
        });
    }
}
