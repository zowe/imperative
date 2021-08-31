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

import * as lodash from "lodash";
import { ICommandArguments, ICommandHandler, IHandlerParameters } from "../../../../../cmd";
import { ICommandHandlerRequire } from "../../../../../cmd/src/doc/handler/ICommandHandlerRequire";
import { ICommandProfileAuthConfig } from "../../../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";
import { Config } from "../../../../../config";
import { secureSaveError } from "../../../../../config/src/ConfigUtils";
import { ImperativeError } from "../../../../../error";
import { Logger } from "../../../../../logger";
import { ConnectionPropsForSessCfg, ISession, Session } from "../../../../../rest";
import { CredentialManagerFactory } from "../../../../../security";
import { ImperativeConfig } from "../../../../../utilities";
import { BaseAuthHandler } from "../../../auth/handlers/BaseAuthHandler";

export default class SecureHandler implements ICommandHandler {
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
        let authTokenProp: string;  // TODO Handle multiple auth tokens in one config file?
        for (const propName of secureProps) {
            if (authTokenProp == null && propName.endsWith(".tokenValue")) {  // TODO Handle kebab case?
                authTokenProp = propName;
                continue;
            }

            const propValue = await params.response.console.prompt(`Please enter ${propName}: `, {hideText: true});

            // Save the value in the config securely
            if (propValue) {
                config.set(propName, propValue, { secure: true });
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

    private async handlePromptForAuthToken(config: Config, propPath: string): Promise<string | undefined> {
        const profilePath = propPath.slice(0, propPath.indexOf(".properties"));
        const profileType = lodash.get(config.properties, `${profilePath}.type`);
        const profile = config.api.profiles.get(profilePath.replace(/profiles\./g, ""));
        if (profileType == null || profile.tokenType == null) {
            return;
        }

        const authConfigs: ICommandProfileAuthConfig[] = [];
        ImperativeConfig.instance.loadedConfig.profiles.forEach((profCfg) => {
            if (profCfg.type === profileType && profCfg.authConfig != null) {
                authConfigs.push(...profCfg.authConfig);
            }
        });

        for (const authConfig of authConfigs) {
            const authHandler: ICommandHandlerRequire = require(authConfig.handler);
            const authHandlerClass = new authHandler.default();
            if (authHandlerClass instanceof BaseAuthHandler) {
                const [promptParams, loginHandler] = authHandlerClass.getPromptParams();

                if (profile.tokenType === promptParams.defaultTokenType) {
                    if (promptParams.serviceDescription != null) {
                        this.params.response.console.log(`Logging in to ${promptParams.serviceDescription}`);
                    }

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
    }
}
