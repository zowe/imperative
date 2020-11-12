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
import { IConfigOpts } from "../../../../../config";
import { ImperativeError } from "../../../../../error";
import { CredentialManagerFactory } from "../../../../../security";
import { ImperativeConfig } from "../../../../../utilities";

export default class SetSecureHandler implements ICommandHandler {

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

        // Get the value to set
        let value = params.arguments.value;
        if (params.arguments.json) {
            try {
                value = JSON.parse(value);
            } catch (e) {
                throw new ImperativeError({ msg: `could not parse JSON value: ${e.message}` });
            }
        }

        // Set the value in the config, save the secure values, write the config layer
        config.set(params.arguments.property, params.arguments.value, {
            secure: true,
        });
        config.api.layers.write();
    }
}
