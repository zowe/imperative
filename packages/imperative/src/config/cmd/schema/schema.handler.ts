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
import { ConfigSchema } from "../../../../../config";
import { ImperativeConfig } from "../../../../../utilities";

/**
 * The get command group handler for cli configuration settings.
 */
export default class SchemaHandler implements ICommandHandler {
    private static readonly INDENT: number = 4;

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const schema = ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles);
        params.response.console.log(JSON.stringify(schema, null, SchemaHandler.INDENT));
    }
}
