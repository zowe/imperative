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

import * as JSONC from "comment-json";
import { ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ImperativeError } from "../../../../../error";
import { CredentialManagerFactory } from "../../../../../security";
import { ImperativeConfig } from "../../../../../utilities";

export default class SetHandler implements ICommandHandler {

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {

        // Create the config, load the secure values, and activate the desired layer
        const config = ImperativeConfig.instance.config;
        config.api.layers.activate(params.arguments.user, params.arguments.global);

        // Store the value securely if --secure was passed or the property name is in secure array
        let secure = params.arguments.secure;
        if (secure == null) {
            secure = config.api.layers.get().properties.secure.includes(params.arguments.property);
        }

        // Setup the credential vault API for the config
        if (secure && !CredentialManagerFactory.initialized) {
            throw new ImperativeError({msg: `secure vault not enabled`});
        }

        // Get the value to set
        let value = params.arguments.value;
        if (params.arguments.json) {
            try {
                value = JSONC.parse(value, null, true);
            } catch (e) {
                throw new ImperativeError({ msg: `could not parse JSON value: ${e.message}` });
            }
        }

        // Set the value in the config, save the secure values, write the config layer
        config.set(params.arguments.property, value, { secure });

        await config.api.layers.write();
    }
}