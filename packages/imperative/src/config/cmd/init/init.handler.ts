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
        if (this.arguments.url) {
            await this.initFromURL(config);
        } else if (this.arguments.profile) {
            // TODO Should we remove old profile init code that prompts for values
            this.initProfile(config);
        } else {
            await this.initWithSchema(config);
        }

        // Write the active created/updated config layer
        config.api.layers.write();

        params.response.console.log(`Saved config template to ${layer.path}`);
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
     * Initialize the profile using the type schema as a guide
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

            const value: any = await this.promptForProp(property, name);

            // if secure, remember for the config set
            if (property.secure)
                secure.push(name);

            if (value != null) {
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
        // TODO Do we want to use node-fetch here?
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

    /**
     * Creates JSON template for config. Also creates a schema file in the same
     * folder alongside the config.
     * @param config Config object to be populated
     */
    private async initWithSchema(config: Config): Promise<void> {
        // Build the schema and write it to disk
        const schema = ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles);
        config.setSchema("./schema.json", schema);

        const baseProfileType: string = ImperativeConfig.instance.loadedConfig.baseProfile?.type;
        const rootProfileName: string = ImperativeConfig.instance.loadedConfig.templateProfileName ?? InitHandler.DEFAULT_ROOT_PROFILE_NAME;
        const secureProps: { [key: string]: any } = {};
        for (const profile of ImperativeConfig.instance.loadedConfig.profiles) {
            // Construct profile path
            let profilePath = `my_${profile.type}`;
            if (baseProfileType && profile.type !== baseProfileType) {
                // Path should have two levels for non-base profiles
                profilePath = `${rootProfileName}.${profile.type}`;
            }

            // Don't overwrite existing profile with same path
            if (config.api.profiles.exists(profilePath)) {
                continue;
            }

            const properties: { [key: string]: any } = {};
            for (const [k, v] of Object.entries(profile.schema.properties)) {
                if (v.includeInTemplate) {
                    if (v.secure) {
                        const propertyPath = `profiles.${profilePath}.properties.${k}`;
                        const propertyValue = await this.promptForProp(v, k);
                        if (propertyValue) {
                            // Save this value to be stored securely after profile is built
                            secureProps[propertyPath] = propertyValue;
                        } else {
                            // Add property to secure array without defining a value for it
                            config.addSecure(propertyPath);
                        }
                    } else {
                        if ((v as any).optionDefinition != null) {
                            // Use default value of ICommandOptionDefinition if present
                            properties[k] = (v as any).optionDefinition.defaultValue;
                        }
                        if (properties[k] === undefined) {
                            // Fall back to an empty value
                            properties[k] = this.getDefaultValue(v.type);
                        }
                    }
                }
            }
            // Add the profile to config and set it as default
            config.api.profiles.set(profilePath, {
                type: profile.type,
                properties
            });
            config.api.profiles.defaultSet(profile.type, profilePath);
        }
        for (const [propPath, propValue] of Object.entries(secureProps)) {
            config.set(propPath, propValue, { secure: true });
        }
        // Hoist duplicate default properties
        config.api.profiles.set(rootProfileName, this.hoistTemplateProperties(config.properties.profiles[rootProfileName]));
    }

    /**
     * Returns empty value that is appropriate for the property type.
     * @param propType The type of profile property
     * @returns Null or empty object
     */
    private getDefaultValue(propType: string | string[]): any {
        // TODO How to handle profile property with multiple types
        if (Array.isArray(propType)) {
            propType = propType[0];
        }
        switch (propType) {
            case "string":  return "";
            case "number":  return 0;
            case "object":  return {};
            case "array":   return [];
            case "boolean": return false;
            default:        return null;
        }
    }

    /**
     * Moves duplicate default properties across child profiles up to root
     * profile.
     * @param rootProfile The root profile object of the config JSON
     * @returns The root profile with duplicate properties hoisted
     */
    private hoistTemplateProperties(rootProfile: IConfigProfile): IConfigProfile {
        // Flatten properties into object that maps property name to list of values
        const flattenedProps: { [key: string]: any[] } = {};
        for (const childProfile of Object.values(rootProfile.profiles)) {
            for (const [k, v] of Object.entries(childProfile.properties)) {
                flattenedProps[k] = [...(flattenedProps[k] || []), v];
            }
        }
        // List property names defined multiple times with the same value
        const duplicateProps: string[] = [];
        for (const [k, v] of Object.entries(flattenedProps)) {
            if (v.length > 1 && (new Set(v)).size === 1) {
                duplicateProps.push(k);
            }
        }
        // Remove duplicate properties from child profiles and store them in root profile
        for (const propName of duplicateProps) {
            rootProfile.properties[propName] = flattenedProps[propName][0];
            for (const childProfile of Object.values(rootProfile.profiles)) {
                delete childProfile.properties[propName];
            }
        }
        return rootProfile;
    }

    /**
     * Prompts for the value of a property on the CLI. Returns null if `--ci`
     * argument is passed, or prompt times out, or a blank value is entered.
     * @param property The profile property definition
     * @param propName The name of the property
     */
    private async promptForProp(property: IProfileProperty, propName: string): Promise<any> {
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
                propValue = true;
            if (propValue === "false")
                propValue = false;
            if (!isNaN(propValue) && !isNaN(parseFloat(propValue)))
                propValue = parseInt(propValue, 10);
        }

        return propValue || null;
    }
}
