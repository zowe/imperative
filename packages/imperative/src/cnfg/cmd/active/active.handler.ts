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
import * as deepmerge from "deepmerge";

/**
 * Init config
 */
export default class InitHandler implements ICommandHandler {
    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        let a = ImperativeConfig.instance.config.api.profiles.active();
        if (params.arguments.profile) {
            const p = ImperativeConfig.instance.config.api.profiles.get(params.arguments.profile);
            a = deepmerge(a, p);
        }
        params.response.format.output({
            format: "object",
            output: a
        });
    }
}
