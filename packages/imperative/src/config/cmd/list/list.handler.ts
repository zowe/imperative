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

export default abstract class ListHandler implements ICommandHandler {
    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const config = ImperativeConfig.instance.config;
        const property = params.arguments.property;

        // Populate the print object
        let obj: any = {};
        if (config.exists) {
            if (params.arguments.locations) {
                for (const layer of config.layers) {
                    if (layer.exists) {
                        obj[layer.path] = layer.properties;
                        if (property != null)
                            obj[layer.path] = (layer.properties as any)[property];
                    }
                }
            } else {
                obj = config.properties;
                if (property != null)
                    obj = (config.properties as any)[property];
            }
        }

        // If requested, only include the root property
        if (params.arguments.root && !Array.isArray(obj)) {
            const root = [];
            for (const [p, _] of Object.entries(obj))
                root.push(p);
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
