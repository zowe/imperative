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
import { IConfigLayer, IConfigOpts } from "../../../../../config";
import { ImperativeError } from "../../../../../error";
import { CredentialManagerFactory } from "../../../../../security";
import { CliUtils, ImperativeConfig } from "../../../../../utilities";

export default class SecureHandler implements ICommandHandler {
    // Prompt timeout......
    private static readonly TIMEOUT: number = 900;

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {

        // Setup the credential vault API for the config
        let opts: IConfigOpts = null;
        if (!CredentialManagerFactory.initialized) {
            throw new ImperativeError({msg: `secure vault not enabled`});
        }

        // Create the config, load the secure values, and activate the desired layer
        const config = ImperativeConfig.instance.config;
        config.api.layers.activate(params.arguments.user, params.arguments.global);
        const secureProps: string[] = config.api.layers.get().properties.secure;

        if (secureProps.length === 0) {
            params.response.console.log("No secure properties found in your config");
            return;
        }

        // Prompt for values designated as secure
        for (const propName of secureProps) {
            const propValue = await CliUtils.promptWithTimeout(`Please enter ${propName}: `, true,
                SecureHandler.TIMEOUT);
            // Save the value in the config securely
            if (propValue) {
                config.set(propName, propValue, { secure: true });
            }
        }

        // Write the config layer
        await config.api.layers.write();
    }
}
