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

import { ICommandHandler, ICommandOptionDefinition, IHandlerParameters } from "../../../../../cmd";
import { Config } from "../../../../../config/src/Config";
import { ImperativeConfig } from "../../../../../utilities";

export default abstract class ListBaseHandler implements ICommandHandler {
    protected abstract property(): string;

    public static readonly OPTIONS: ICommandOptionDefinition[] = [
        {
            name: "locations",
            description: "Separate the config properties into their respective config file locations. Helpful to determine where configuration value is specified.",
            type: "boolean"
        },
        {
            name: "root",
            description: "List only the root level property names. For example, specify in addition to '--locations' to get a list of config file paths only.",
            type: "boolean"
        }
    ];

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const config = Config.load(ImperativeConfig.instance.rootCommandName);

        // Populate the print object
        let obj: any = {};
        if (config.exists) {
            if (this.property() === "paths") {
                obj = [];
                for (const layer of config.layers)
                    if (layer.exists) obj.push(layer.path);
            } else {
                if (params.arguments.locations) {
                    obj = {};
                    for (const layer of config.layers) {
                        if (layer.exists) {
                            if (this.property() === "all")
                                obj[layer.path] = layer.properties;
                            else
                                obj[layer.path] = (layer.properties as any)[this.property()];
                        }
                    }
                } else {
                    if (this.property() === "all")
                        obj = config.properties;
                    else
                        obj = (config.properties as any)[this.property()];
                }
            }
        }

        // If requested, only include the root property
        if (params.arguments.root && !Array.isArray(obj)) {
            const root = [];
            for (const [property, _] of Object.entries(obj))
                root.push(property);
            obj = root;
        }

        // output to terminal
        params.response.data.setObj(obj);
        params.response.format.output({
            output: obj,
            format: (Array.isArray(obj)) ? "list" : "object"
        });
    }
}
