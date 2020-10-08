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
        const config = Config.load(ImperativeConfig.instance.rootCommandName,
            { schemas: ImperativeConfig.instance.configSchemas });
        config.layerActivate(params.arguments.user, params.arguments.global);
        const layer = config.layerGet();
        if (layer.exists && !params.arguments.update)
            throw new ImperativeError({ msg: `config "${layer.path}" already exists` });

        if (params.arguments.url) {
            const cnfg = await this.getConfig(params.arguments.url);
            config.layerSet(cnfg);
        } else {

            // If schemas are specified, use them as a guide
            if (params.arguments.profiles) {
                for (const schema of params.arguments.profiles) {
                    if (ImperativeConfig.instance.configSchemas[schema] != null) {

                        // Get the schema - prompt for the name
                        const s = ImperativeConfig.instance.configSchemas[schema];
                        const name = await CliUtils.promptWithTimeout(`profile name: `, false, 900);
                        if (name.trim().length === 0) throw new ImperativeError({ msg: `name is required` });

                        // prompt for the values
                        const profile: any = {};
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
                                    profile[property] = value;
                                } else if (params.arguments.default && (schemaProperty as any).optionDefinition.defaultValue != null) {
                                    profile[property] = (schemaProperty as any).optionDefinition.defaultValue;
                                }
                            }
                        }

                        // Set the profile, set it as default if requested, and save
                        config.api.profiles.set(schema, name, profile, { secure: secureProps });
                        if (params.arguments.setDefault)
                            config.set(`defaults.${schema}`, name);
                    } else {
                        params.response.console.error(`schema ${schema} does not exist`);
                    }
                }
            }
        }

        // Write the config
        await config.layerWrite();
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
