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

import { ICommandProfileProperty } from "../../cmd";
import { IProfileProperty, IProfileSchema, IProfileTypeConfiguration } from "../../profiles";
import { IConfigSchema } from "./doc/IConfigSchema";

export class ConfigSchema {
    /**
     * JSON schema URI stored in $schema property of the schema
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly JSON_SCHEMA = "https://json-schema.org/draft/2019-09/schema#";

    /**
     * Version number stored in $version property of the schema
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly SCHEMA_VERSION = 1;

    /**
     * Transform an Imperative profile schema to a JSON schema. Removes any
     * non-JSON-schema properties and translates anything useful.
     * @param schema The Imperative profile schema
     * @returns JSON schema for profile properties
     */
    private static generateJsonSchema(schema: IProfileSchema): any {
        const properties: { [key: string]: any } = {};
        for (const [k, v] of Object.entries(schema.properties)) {
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
                properties[k].secure = true;
            }
        }

        const obj: any = {
            type: schema.type,
            title: schema.title,
            description: schema.description,
            properties
        }

        if (schema.required) obj.required = schema.required;
        return obj;
    }

    /**
     * Transform a JSON schema to an Imperative profile schema.
     * @param schema The JSON schema for profile properties
     * @returns Imperative profile schema
     */
    private static parseJsonSchema(schema: any): IProfileSchema {
        const properties: { [key: string]: IProfileProperty } = {};
        for (const [k, v] of Object.entries(schema.properties as { [key: string]: any })) {
            properties[k] = { type: v.type };
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
            title: schema.title,
            description: schema.description,
            type: schema.type,
            properties,
            required: schema.required
        };
    }

    /**
     * Dynamically builds the config schema for this CLI.
     * @param profiles The profiles supported by this CLI
     * @returns JSON schema for all supported profile types
     */
    public static buildSchema(profiles: IProfileTypeConfiguration[]): IConfigSchema {
        const entries: any[] = [];
        profiles.forEach((profile: { type: string, schema: IProfileSchema }) => {
            entries.push({
                if: { properties: { type: { const: profile.type } } },
                then: { properties: { properties: this.generateJsonSchema(profile.schema) } },
            });
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
                                }
                            },
                            allOf: entries
                        }
                    }

                },
                defaults: {
                    type: "object",
                    description: "default profiles config",
                    patternProperties: {
                        "^\\S*$": {
                            type: "string",
                            description: "the type"
                        }
                    }
                },
                secure: {
                    type: "array",
                    description: "secure properties",
                    items: {
                        type: "string",
                        description: "path to a property"
                    }
                }
            }
        };
    }

    /**
     * Loads Imperative profile schema objects from a schema JSON file.
     * @param schemaJson The schema JSON for config
     */
    public static loadProfileSchemas(schemaJson: IConfigSchema): IProfileSchema[] {
        const patternName = Object.keys(schemaJson.properties.profiles.patternProperties)[0];
        const profileSchemas: IProfileSchema[] = [];
        for (const obj of schemaJson.properties.profiles.patternProperties[patternName].allOf) {
            profileSchemas.push(this.parseJsonSchema(obj.then.properties.properties));
        }
        return profileSchemas;
    }
}
