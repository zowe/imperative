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

import * as path from "path";
import { IExplanationMap, TextUtils } from "../../utilities/src/TextUtils";
import { ICommandProfileProperty } from "../../cmd";
import { IProfileProperty, IProfileSchema, IProfileTypeConfiguration } from "../../profiles";
import { IConfigSchema, IConfigUpdateSchemaOptions } from "./doc/IConfigSchema";
import { ImperativeConfig } from "../../utilities/src/ImperativeConfig";
import { Logger } from "../../logger/src/Logger";
import { Config } from "./Config";
import { ImperativeError } from "../../error/src/ImperativeError";
export class ConfigSchema {
    /**
     * JSON schema URI stored in $schema property of the schema
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly JSON_SCHEMA = "https://json-schema.org/draft/2020-12/schema";

    /**
     * Version number stored in $version property of the schema
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly SCHEMA_VERSION = 3;

    /**
     * Pretty explanation of the schema objects
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly explainSchemaSummary: IExplanationMap = {
        $schema: "URL",
        $version: "Version",
        properties: {
            defaults: "Default Definitions",
            explainedParentKey: "Properties",
            ignoredKeys: null
        },
        explainedParentKey: "Schema",
        ignoredKeys: null
    };

    /**
     * Transform an Imperative profile schema to a JSON schema. Removes any
     * non-JSON-schema properties and translates anything useful.
     * @param schema The Imperative profile schema
     * @returns JSON schema for profile properties
     */
    private static generateSchema(schema: IProfileSchema): any {
        const properties: { [key: string]: any } = {};
        const secureProps: string[] = [];
        for (const [k, v] of Object.entries(schema.properties || {})) {
            properties[k] = { type: v.type };
            const cmdProp = v as ICommandProfileProperty;
            if (cmdProp.optionDefinition != null) {
                properties[k].description = cmdProp.optionDefinition.description;
                if (cmdProp.optionDefinition.defaultValue != null) {
                    properties[k].default = cmdProp.optionDefinition.defaultValue;
                }
                if (cmdProp.optionDefinition.allowableValues != null) {
                    properties[k].enum = cmdProp.optionDefinition.allowableValues.values;
                }
            }
            if (v.secure) {
                secureProps.push(k);
            }
        }

        const propertiesSchema: any = {
            type: schema.type,
            title: schema.title,
            description: schema.description,
            properties
        };
        if (schema.required) {
            propertiesSchema.required = schema.required;
        }

        const secureSchema: any = {
            prefixItems: {
                enum: secureProps
            }
        };

        if (secureProps.length > 0) {
            return { properties: propertiesSchema, secure: secureSchema };
        } else {
            return { properties: propertiesSchema };
        }
    }

    /**
     * Transform a JSON schema to an Imperative profile schema.
     * @param schema The JSON schema for profile properties
     * @returns Imperative profile schema
     */
    private static parseSchema(schema: any): IProfileSchema {
        const properties: { [key: string]: IProfileProperty } = {};
        for (const [k, v] of Object.entries((schema.properties.properties || {}) as { [key: string]: any })) {
            properties[k] = { type: v.type };
            if (schema.secure?.prefixItems.enum.includes(k)) {
                properties[k].secure = true;
            }
            if (v.description != null || v.default != null || v.enum != null) {
                (properties[k] as ICommandProfileProperty).optionDefinition = {
                    name: k,
                    type: v.type,
                    description: v.description,
                    defaultValue: v.default,
                    allowableValues: v.enum ? { values: v.enum } : undefined
                };
            }
        }

        return {
            title: schema.properties.title,
            description: schema.properties.description,
            type: schema.properties.type,
            properties,
            required: schema.properties.required
        };
    }

    /**
     * Dynamically builds the config schema for this CLI.
     * @param profiles The profiles supported by this CLI
     * @returns JSON schema for all supported profile types
     */
    public static buildSchema(profiles: IProfileTypeConfiguration[]): IConfigSchema {
        const entries: any[] = [];
        const defaultProperties: { [key: string]: any } = {};
        profiles.forEach((profile: { type: string, schema: IProfileSchema }) => {
            entries.push({
                if: { properties: { type: { const: profile.type } } },
                then: { properties: this.generateSchema(profile.schema) }
            });
            defaultProperties[profile.type] = { type: "string" };
        });
        return {
            $schema: ConfigSchema.JSON_SCHEMA,
            $version: ConfigSchema.SCHEMA_VERSION,
            type: "object",
            description: "config",
            properties: {
                profiles: {
                    type: "object",
                    description: "named profiles config",
                    patternProperties: {
                        "^\\S*$": {
                            type: "object",
                            description: "a profile",
                            properties: {
                                type: {
                                    description: "the profile type",
                                    type: "string"
                                },
                                properties: {
                                    description: "the profile properties",
                                    type: "object"
                                },
                                profiles: {
                                    description: "additional sub-profiles",
                                    type: "object",
                                    $ref: "#/properties/profiles"
                                },
                                secure: {
                                    description: "secure property names",
                                    type: "array",
                                    prefixItems: {
                                        type: "string"
                                    },
                                    uniqueItems: true
                                }
                            },
                            allOf: entries
                        }
                    }
                },
                defaults: {
                    type: "object",
                    description: "default profiles config",
                    properties: defaultProperties
                }
            }
        };
    }

    /**
     * Loads Imperative profile schema objects from a schema JSON file.
     * @param schema The schema JSON for config
     */
    public static loadSchema(schema: IConfigSchema): IProfileTypeConfiguration[] {
        const patternName = Object.keys(schema.properties.profiles.patternProperties)[0];
        const profileSchemas: IProfileTypeConfiguration[] = [];
        for (const obj of schema.properties.profiles.patternProperties[patternName].allOf) {
            profileSchemas.push({
                type: obj.if.properties.type.const,
                schema: this.parseSchema(obj.then.properties)
            });
        }
        return profileSchemas;
    }

    /**
     * Updates Imperative Config Schema objects from a schema JSON file.
     * @param options        The options object
     * @param options.layer  The layer in which we should update the schema file(s). Defaults to the active layer.
     * @param options.schema The optional schema object to use. If not provided, we build the schema object based on loadedConfig.profiles
     * @returns List of updated paths with the new/loaded or given schema
     */
    public static updateSchema(options?: IConfigUpdateSchemaOptions): { [key: string]: { schema: string, updated: boolean } } {
        const opts: IConfigUpdateSchemaOptions = { ...{ layer: "active", depth: 0 }, ...(options ?? {}) };
        const schema = opts.schema ?? ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles);
        const config = ImperativeConfig.instance.config;
        const initialLayer = config.api.layers.get();
        let updatedPaths: { [key: string]: { schema: string, updated: boolean } } = {};
        switch (opts.layer) {
            case "active": {
                Logger.getAppLogger().debug(`Updating "${initialLayer.path}" with: \n` +
                    TextUtils.prettyJson(TextUtils.explainObject(schema, ConfigSchema.explainSchemaSummary, false), null, false));
                config.setSchema(schema);
                const schemaInfo = config.getSchemaInfo();
                updatedPaths = { [initialLayer.path]: { schema: schemaInfo?.original, updated: schemaInfo?.local } };
                break;
            }
            case "global": {
                config.api.layers.activate(false, true);
                updatedPaths = { ...updatedPaths, ...ConfigSchema.updateSchema({ schema }) };

                if (config.api.layers.exists(true, true)) {
                    config.api.layers.activate(true, true);
                    updatedPaths = { ...updatedPaths, ...ConfigSchema.updateSchema({ schema }) };
                }

                config.api.layers.activate(initialLayer.user, initialLayer.global, initialLayer.path);
                break;
            }
            case "all": {
                let currentLayer = initialLayer;
                let nextSchemaLocation = initialLayer.path;
                while (nextSchemaLocation != null) {
                    updatedPaths = { ...updatedPaths, ...ConfigSchema.updateSchema({ schema }) };

                    // Check if we are in a user config
                    if (!currentLayer.user) {
                        // If we are not in a user config, we can move on to the next directory
                        nextSchemaLocation = Config.search(config.schemaName, { startDir: path.join(path.dirname(currentLayer.path), "..") });
                    }
                    if (nextSchemaLocation != null) {
                        config.api.layers.activate(false, false, nextSchemaLocation);
                    }
                    currentLayer = config.api.layers.get();
                }

                if (!initialLayer.global) {
                    // Do not update the global layer if that's where we started from
                    updatedPaths = { ...updatedPaths, ...ConfigSchema.updateSchema({ layer: "global", schema }) };
                }

                /**
                 * Method: `**`
                 * Result: DO NOT USE THIS
                 BIG NO-NO: Takes about 15 seconds from /root
                 Results from / ; time: 42.898s
                    const matches = glob.sync(`**\/${config.schemaName}`, {}).filter((match: string) => {
                        return match.split("/").length <= opts.depth + 1;
                    });
                */

                /**
                 * Method: `* /* /* /* ...`
                 * Result: DO NOT USE THIS
                 * Takes about a second from /root
                 * Similar to `**`: Takes about 50 seconds from /
                    let matches = glob.sync(`./${config.schemaName}`, {});
                    let str = "*\/"
                    for (let index = 0; index < opts.depth - 1; index++) {
                        str += "*\/"
                        matches = matches.concat(glob.sync(`${str}${config.schemaName}`, {}))
                    }
                 */

                /**
                 * Method: `fast-glob`
                 * Result: Best so far : )
                 * Takes about a second from /root
                 * And less than 20 seconds from /
                    const fg = require("fast-glob");
                    const matches = fg.sync(`**\/${config.schemaName}`, { onlyFiles: true, deep: opts.depth + 1 });
                 */

                if (opts.depth > 0) {
                    const fg = require("fast-glob");
                    // The `cwd` does not participate in Fast-glob's depth calculation, hence the + 1
                    const matches: string[] = fg.sync(`**/${config.schemaName}`, { dot: true, onlyFiles: true, deep: opts.depth + 1});
                    const globalProjConfig = config.findLayer(false, true);
                    const globalUserConfig = config.findLayer(true, true);
                    matches.forEach(schemaLoc => {
                        if (config.api.layers.exists(false, false, schemaLoc)) {
                            config.api.layers.activate(false, false, schemaLoc);
                            const layer = config.layerActive();
                            // NOTE: Configs are assumed to be always local (because of path.resolve(layer.path)),
                            //       if we want to support Config URLs here, we need to call the config import APIs
                            if (path.resolve(layer.path) !== globalProjConfig.path && path.resolve(layer.path) !== globalUserConfig.path) {
                                updatedPaths = { ...updatedPaths, ...ConfigSchema.updateSchema({ schema }) };
                            }
                        }
                    });
                }

                // Back to initial layer
                config.api.layers.activate(initialLayer.user, initialLayer.global, initialLayer.path);
                break;
            }
            default: {
                throw new ImperativeError({
                    msg: "Unrecognized layer parameter for ConfigSchema.updateSchemas"
                });
            }
        }
        return updatedPaths;
    }
}
