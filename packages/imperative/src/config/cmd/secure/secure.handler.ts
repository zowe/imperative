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

import { ICommandArguments, ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { Config, ConfigAutoStore } from "../../../../../config";
import { secureSaveError } from "../../../../../config/src/ConfigUtils";
import { ImperativeError } from "../../../../../error";
import { Logger } from "../../../../../logger";
import { ConnectionPropsForSessCfg, ISession, Session } from "../../../../../rest";
import { CredentialManagerFactory } from "../../../../../security";
import { ImperativeConfig } from "../../../../../utilities";

export default class SecureHandler implements ICommandHandler {
    /**
     * The parameters object passed to the command handler.
     */
    private params: IHandlerParameters;

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        this.params = params;

        // Setup the credential vault API for the config
        if (!CredentialManagerFactory.initialized) {
            throw secureSaveError();
        }

        // Create the config, load the secure values, and activate the desired layer
        const config = ImperativeConfig.instance.config;
        config.api.layers.activate(params.arguments.userConfig, params.arguments.globalConfig);
        const secureProps: string[] = config.api.secure.secureFields();

        if (secureProps.length === 0) {
            params.response.console.log("No secure properties found in your config");
            return;
        }

        // Prompt for values designated as secure
        let authTokenProp: string;
        for (const propName of secureProps) {
            if (authTokenProp == null && propName.endsWith(".tokenValue")) {
                authTokenProp = propName;
                continue;
            }

            const propValue = await params.response.console.prompt(`Please enter ${propName}: `, {hideText: true});

            // Save the value in the config securely
            if (propValue) {
                config.set(propName, propValue, { parseString: true, secure: true });
            }
        }

        if (authTokenProp != null) {
            const propValue = await this.handlePromptForAuthToken(config, authTokenProp) ||
                await params.response.console.prompt(`Please enter ${authTokenProp}: `, {hideText: true});

            // Save the value in the config securely
            if (propValue) {
                config.set(authTokenProp, propValue, { secure: true });
            }
        }

        // Write the config layer
        await config.save(false);
    }

    /**
     * Checks if authentication service is associated with an auth token
     * property. If an auth service is found, we log in to it obtain the token
     * instead of prompting for the value.
     * @param config Team config class from which the property was loaded
     * @param propPath JSON property path of the auth token
     * @returns Token value, or undefined if none was obtained
     */
    private async handlePromptForAuthToken(config: Config, propPath: string): Promise<string | undefined> {
        const profilePath = propPath.slice(0, propPath.indexOf(".properties"));
        const authHandlerClass = ConfigAutoStore.findAuthHandlerForProfile(profilePath, this.params.arguments);

        if (authHandlerClass != null) {
            const [promptParams, loginHandler] = authHandlerClass.getPromptParams();

            if (promptParams.serviceDescription != null) {
                this.params.response.console.log(`Logging in to ${promptParams.serviceDescription}`);
            }

            const profile = config.api.profiles.get(profilePath.replace(/profiles\./g, ""));
            const sessCfg: ISession = await ConnectionPropsForSessCfg.addPropsOrPrompt({}, profile as ICommandArguments,
                { parms: this.params, doPrompting: true, requestToken: true, ...promptParams });
            Logger.getAppLogger().info(`Fetching ${profile.tokenType} for ${propPath}`);

            try {
                return await loginHandler(new Session(sessCfg));
            } catch (error) {
                throw new ImperativeError({
                    msg: `Failed to fetch ${profile.tokenType} for ${propPath}`,
                    causeErrors: error
                });
            }
        }
    }
}
