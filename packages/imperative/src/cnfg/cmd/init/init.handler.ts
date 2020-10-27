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

import { ICommandArguments, ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ImperativeError } from "../../../../../error";
import { CliUtils, ImperativeConfig } from "../../../../../utilities";
import * as https from "https";
import { Config, IConfig, IConfigProfile } from "../../../../../config";

/**
 * Init config
 */
export default class InitHandler implements ICommandHandler {

    // Prompt timeout......
    private static readonly TIMEOUT: number = 900;

    private arguments: ICommandArguments;

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        this.arguments = params.arguments;

        // Load the config and set the active layer according to user options
        const config = ImperativeConfig.instance.config;
        config.api.layers.activate(params.arguments.user, params.arguments.global);
        const layer = config.api.layers.get();

        // Protect against overwrite of the config
        if (layer.exists && !params.arguments.update)
            throw new ImperativeError({ msg: `config "${layer.path}" already exists` });

        // Init as requested
        if (this.arguments.url) {
            await this.initFromURL(config);
        } else if (this.arguments.profile) {
            this.initProfile(config);
        }

        // Write the active created/updated config layer
        config.api.layers.write();
    }

    /**
     * Initialize a profile in the config
     * @param config The config
     */
    private initProfile(config: Config) {
        const profile: IConfigProfile = { properties: {} };
        if (this.arguments.type != null) this.initProfileType(profile);
        config.api.profiles.set(this.arguments.profile, profile);
    }

    /**
     * Initialize the profile using teh type schema as a guide
     * @param config The config
     * @param profile The profile object to populate
     */
    private async initProfileType(profile: IConfigProfile): Promise<void> {
        const schema = ImperativeConfig.instance.profileSchemas[this.arguments.type];
        if (schema == null)
            throw new ImperativeError({ msg: `profile type ${this.arguments.type} does not exist.` });

        // Use the schema to prompt for values
        profile.type = this.arguments.type;
        const secure: string[] = [];
        for (const [name, property] of Object.entries(schema.properties)) {

            // get the summary and value
            const summary = property.optionDefinition.description;
            let value: any = await CliUtils.promptWithTimeout(`${name} (${summary}) - blank to skip: `, property.secure, InitHandler.TIMEOUT);

            // if secure, remember for the config set
            if (property.secure)
                secure.push(name);

            // coerce to correct type
            if (value.trim().length > 0) {
                if (value === "true")
                    value = true;
                if (value === "false")
                    value = false;
                if (!isNaN(value) && !isNaN(parseFloat(value)))
                    value = parseInt(value, 10);
                profile.properties[name] = value;
            } else if (this.arguments.default && property.optionDefinition.defaultValue != null) {
                profile.properties[name] = property.optionDefinition.defaultValue;
            }
        }
    }

    /**
     * Download/create the config from a URL
     * @param config The config
     */
    private async initFromURL(config: Config): Promise<void> {
        const cnfg: IConfig = await this.download(this.arguments.url);
        config.api.layers.set(cnfg);
    }

    /**
     * Download the config from a URL
     * @param url
     */
    private download(url: string): Promise<IConfig> {
        return new Promise<IConfig>((resolve, reject) => {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', (chunk) => { data += chunk; });
                resp.on('end', () => {
                    let cnfg;
                    let ok = false;
                    try {
                        cnfg = JSON.parse(data);
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
