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
import { IO } from "../../../../../io";
import { Logger } from "../../../../../logger";
import { GuiResult, ImperativeConfig, ProcessUtils } from "../../../../../utilities";

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
        config.api.layers.activate(params.arguments.userConfig, params.arguments.globalConfig);
        const configLayer = config.api.layers.get();

        if (!configLayer.exists) {
            const initCmd = ImperativeConfig.instance.commandLine.replace("edit", "init");
            params.response.console.log(`File does not exist: ${configLayer.path}\n` +
                `To create it, run "${ImperativeConfig.instance.rootCommandName} ${initCmd}".`);
        } else if (ProcessUtils.isGuiAvailable() === GuiResult.GUI_AVAILABLE) {
            Logger.getAppLogger().info(`Opening ${configLayer.path} in graphical text editor`);
            this.openFileInGui(configLayer.path);
        } else {
            Logger.getAppLogger().info(`Opening ${configLayer.path} in command-line text editor`);
            await this.openFileInCli(configLayer.path);
        }
    }

    private openFileInGui(filePath: string) {
        const openerProc = require("opener")(filePath);

        if (process.platform !== "win32") {
            /* On linux, without the following statements, the zowe
            * command does not return until the browser is closed.
            * Mac is untested, but for now we treat it like linux.
            */
            openerProc.unref();
            openerProc.stdin.unref();
            openerProc.stdout.unref();
            openerProc.stderr.unref();
        }
    }

    private async openFileInCli(filePath: string) {
        const editor = IO.getDefaultTextEditor(ImperativeConfig.instance.loadedConfig.envVariablePrefix);
        await require("child_process").spawn(editor, [filePath], { stdio: "inherit" });
    }
}
