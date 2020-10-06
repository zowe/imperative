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
import { Config } from "../../../../../config/Config";
import { ImperativeConfig } from "../../../../../utilities";


/**
 * The get command group handler for cli configuration settings.
 *
 */
export default class SetHandler implements ICommandHandler {

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const config = Config.load(ImperativeConfig.instance.rootCommandName,
            { schemas: ImperativeConfig.instance.configSchemas });
        config.layerActivate(params.arguments.user, params.arguments.global);
        await config.api.profiles.loadSecure();
        config.set(params.arguments.property, params.arguments.value);
        await config.layerWrite();
    }
}
