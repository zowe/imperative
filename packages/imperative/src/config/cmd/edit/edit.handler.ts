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
import { IO } from "../../../../../io";

/**
 * Edit config
 */
export default class EditHandler implements ICommandHandler {
    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        // Load the config and set the active layer according to user options
        const config = ImperativeConfig.instance.config;
        const configDir = params.arguments.globalConfig ? null : process.cwd();
        config.api.layers.activate(params.arguments.userConfig, params.arguments.globalConfig, configDir);

        const editor = IO.getDefaultTextEditor(ImperativeConfig.instance.loadedConfig.envVariablePrefix);
        await require("child_process").spawn(editor, [config.api.layers.get().path], { stdio: "inherit" });
    }
}
