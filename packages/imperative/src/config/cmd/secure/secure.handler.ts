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
        if (CredentialManagerFactory.initialized) {
            opts = {
                vault: {
                    load: ((k: string): Promise<string> => {
                        return CredentialManagerFactory.manager.load(k, true)
                    }),
                    save: ((k: string, v: any): Promise<void> => {
                        return CredentialManagerFactory.manager.save(k, v);
                    }),
                    name: CredentialManagerFactory.manager.name
                }
            };
        } else {
            throw new ImperativeError({msg: `secure vault not enabled`});
        }

        // Create the config, load the secure values, and activate the desired layer
        const config = ImperativeConfig.instance.config;
        config.api.layers.activate(params.arguments.user, params.arguments.global);
        const secureProps: string[] = config.layers.flatMap((layer: IConfigLayer) => layer.properties.secure);

        if (secureProps.length === 0) {
            params.response.console.log("No secure properties found in your config");
            return;
        }

        // Prompt for values designated as secure
        for (const propName of secureProps) {
            const propValue = CliUtils.promptForInput(`Please enter ${propName}: `);
            // Save the value in the config securely
            if (propValue) {
                config.set(propName, propValue, { secure: true });
            }
        }

        // Write the config layer
        config.api.layers.write();
    }
}
