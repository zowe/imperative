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
import { ImperativeConfig } from "../../../../../utilities";

/**
 * The get command group handler for cli configuration settings.
 */
export default class SchemaHandler implements ICommandHandler {
    private static readonly IDENT: number = 4;

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const entries: { type: string, schema: any }[] = [];
        ImperativeConfig.instance.loadedConfig.profiles.forEach((profile) => {
            entries.push({
                type: profile.type,
                schema: profile.schema
            });
        });
        params.response.console.log(JSON.stringify(this.schema(entries), null, SchemaHandler.IDENT));
    }

    /**
     * Dynamically build the config schema
     * @param schemas The schemas specified for this CLI
     */
    private schema(schemas?: { type: string, schema: any }[]): any {
        schemas = schemas || [];
        const entries: any[] = [];
        schemas.forEach((schema: { type: string, schema: any }) => {
            // Remove any non-JSON-schema properties and translate anything useful
            for (const [_, v] of Object.entries(schema.schema.properties)) {
                if ((v as any).optionDefinition != null) {
                    if ((v as any).optionDefinition.description)
                        (v as any).description = (v as any).optionDefinition.description;
                }
                delete (v as any).secure
                delete (v as any).optionDefinition;
            }

            entries.push({
                if: { properties: { type: { const: schema.type } } },
                then: { properties: { properties: schema.schema } },
            });
        });
        return {
            $schema: "https://json-schema.org/draft/2019-09/schema#",
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
}
