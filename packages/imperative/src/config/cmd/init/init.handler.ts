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
import { Config, ConfigSchema, IConfig, IConfigProfile } from "../../../../../config";
import { IProfileProperty } from "../../../../../profiles";
import { ConfigBuilder } from "../../../../../config/src/ConfigBuilder";
import { IConfigBuilderOpts } from "../../../../../config/src/doc/IConfigBuilderOpts";

/**
 * Init config
 */
export default class InitHandler implements ICommandHandler {
    private static readonly DEFAULT_ROOT_PROFILE_NAME = "my_profiles";

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

        // // Protect against overwrite of the config
        // if (layer.exists && !params.arguments.update)
        //     throw new ImperativeError({ msg: `config "${layer.path}" already exists` });

        // Init as requested
        // if (this.arguments.url) {
        //     await this.initFromURL(config);
        // } else if (this.arguments.profile) {
        //     // TODO Should we remove old profile init code that prompts for values
        //     this.initProfile(config);
        // } else {
        //     await this.initWithSchema(config);
        // }

        await this.initWithSchema(config, params.arguments.user);

        // Write the active created/updated config layer
        await config.api.layers.write();

        params.response.console.log(`Saved config template to ${layer.path}`);
    }

    /**
     * Initialize a profile in the config
     * @param config The config
     */
    // private initProfile(config: Config) {
    //     const profile: IConfigProfile = { properties: {} };
    //     if (this.arguments.type != null) this.initProfileType(profile);
    //     config.api.profiles.set(this.arguments.profile, profile);
    // }

    /**
     * Initialize the profile using the type schema as a guide
     * @param config The config
     * @param profile The profile object to populate
     */
    // private async initProfileType(profile: IConfigProfile): Promise<void> {
    //     const schema = ImperativeConfig.instance.profileSchemas[this.arguments.type];
    //     if (schema == null)
    //         throw new ImperativeError({ msg: `profile type ${this.arguments.type} does not exist.` });

    //     // Use the schema to prompt for values
    //     profile.type = this.arguments.type;
    //     const secure: string[] = [];
    //     for (const [name, property] of Object.entries(schema.properties)) {

    //         const value: any = await this.promptForProp(property, name);

    //         // if secure, remember for the config set
    //         if (property.secure)
    //             secure.push(name);

    //         if (value != null) {
    //             profile.properties[name] = value;
    //         } else if (this.arguments.default && property.optionDefinition.defaultValue != null) {
    //             profile.properties[name] = property.optionDefinition.defaultValue;
    //         }
    //     }
    // }

    /**
     * Download/create the config from a URL
     * @param config The config
     */
    // private async initFromURL(config: Config): Promise<void> {
    //     const cnfg: IConfig = await this.download(this.arguments.url);
    //     config.api.layers.set(cnfg);
    // }

    /**
     * Download the config from a URL
     * @param url
     */
    // private download(url: string): Promise<IConfig> {
    //     // TODO Do we want to use node-fetch here?
    //     return new Promise<IConfig>((resolve, reject) => {
    //         https.get(url, (resp) => {
    //             let data = '';
    //             resp.on('data', (chunk) => { data += chunk; });
    //             resp.on('end', () => {
    //                 let cnfg;
    //                 let ok = false;
    //                 try {
    //                     cnfg = JSON.parse(data);
    //                     // TODO: additional validation?
    //                     ok = true;
    //                 } catch (e) {
    //                     reject(new ImperativeError({ msg: `unable to parse config: ${e.message}` }));
    //                 }
    //                 if (ok)
    //                     resolve(cnfg);
    //             });
    //         }).on("error", (err) => { reject(err); });
    //     });
    // }

    /**
     * Creates JSON template for config. Also creates a schema file in the same
     * folder alongside the config.
     * @param config Config object to be populated
     * @param user If true, properties will be left empty for user config
     */
    private async initWithSchema(config: Config, user: boolean): Promise<void> {
        // Build the schema and write it to disk
        const schema = ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles);
        config.setSchema(schema);

        const opts: IConfigBuilderOpts = {};
        if (!user) {
            opts.populateProperties = true;
            opts.getSecureValue = this.promptForProp.bind(this);
        }

        // Build new config and merge with existing layer
        const newConfig: IConfig = await ConfigBuilder.build(ImperativeConfig.instance.loadedConfig, opts);
        config.api.layers.merge(newConfig);
    }

    /**
     * Prompts for the value of a property on the CLI. Returns null if `--ci`
     * argument is passed, or prompt times out, or a blank value is entered.
     * @param propName The name of the property
     * @param property The profile property definition
     */
    private async promptForProp(propName: string, property: IProfileProperty): Promise<any> {
        // skip prompting in CI environment
        if (this.arguments.ci) {
            return null;
        }

        // get the summary and value
        if ((property as any).optionDefinition?.description != null) {
            propName = `${propName} (${(property as any).optionDefinition.description})`;
        }
        let propValue: any = await CliUtils.promptWithTimeout(`${propName} - blank to skip: `, property.secure,
            InitHandler.TIMEOUT);

        // coerce to correct type
        if (propValue && propValue.trim().length > 0) {
            if (propValue === "true")
                return true;
            if (propValue === "false")
                return false;
            if (!isNaN(propValue) && !isNaN(parseFloat(propValue)))
                propValue = parseInt(propValue, 10);
        }

        return propValue || null;
    }
}
