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
import { Config } from "../../../../../config/src/Config";
import { ImperativeConfig } from "../../../../../utilities";


/**
 * The get command group handler for cli configuration settings.
 *
 */
export default class ListHandler implements ICommandHandler {

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const config = Config.load(ImperativeConfig.instance.rootCommandName);

        // Do nothing if the property doesn't exist
        if (params.arguments.property &&
            (config.api as any)[params.arguments.property] == null &&
            params.arguments.property !== "schemas") {
            return;
        }

        // Populate the print object
        let obj: any = {};
        if (config.exists) {
            if (params.arguments.property === "schemas") {
                obj = ImperativeConfig.instance.configSchemas;
            } else if (params.arguments.locations) {
                for (const layer of config.layers) {
                    if (layer.exists) {
                        obj[layer.path] = (params.arguments.property && (layer as any)[params.arguments.property] != null)
                            ? (layer as any)[params.arguments.property] : layer.properties;
                    }
                }
            } else {
                obj = (params.arguments.property) ? (config.properties as any)[params.arguments.property] : config.properties;
            }
        }

        if (params.arguments.root) {
            const root = [];
            for (const [property, value] of Object.entries(obj))
                root.push(property);
            obj = root;
        }

        // output to terminal
        params.response.data.setObj(obj);
        params.response.format.output({
            output: obj,
            format: "object"
        });
    }
}
