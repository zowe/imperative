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

import { TextUtils } from "../../../../..";
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ConfigSchema } from "../../../../../config/src/ConfigSchema";

export default class UpdateSchemasHandler implements ICommandHandler {
    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const updatedPaths = ConfigSchema.updateSchema({ layer: "all", depth: params.arguments.depth });

        // output to terminal
        params.response.data.setObj(updatedPaths);
        params.response.console.log("Configuration files found: " + Object.keys(updatedPaths).length.toString());
        if (Object.keys(updatedPaths).length > 0) {
            const outputObj: any = {};
            for (const schema in updatedPaths) {
                if (Object.prototype.hasOwnProperty.call(updatedPaths, schema)) {
                    const schemaInfo = updatedPaths[schema];
                    outputObj[TextUtils.chalk.yellow(schema)] = {
                        [`${schemaInfo.updated ? TextUtils.chalk.green("updated") : TextUtils.chalk.red("skipped")}`]: schemaInfo.schema
                    };
                }
            }
            params.response.format.output({
                output: outputObj,
                format: "object"
            });
        }
    }
}
