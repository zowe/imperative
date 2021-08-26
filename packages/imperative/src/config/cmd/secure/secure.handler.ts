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
import { ICommandHandlerRequire } from "../../../../../cmd/src/doc/handler/ICommandHandlerRequire";
import { ICommandProfileAuthConfig } from "../../../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";
import { Config } from "../../../../../config";
import { secureSaveError } from "../../../../../config/src/ConfigUtils";
import { ConnectionPropsForSessCfg, ISession, Session } from "../../../../../rest";
import { CredentialManagerFactory } from "../../../../../security";
import { ImperativeConfig } from "../../../../../utilities";

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
        for (const propName of secureProps) {
            const propValue = await this.handlePromptForAuthToken(config, propName) ||
                await params.response.console.prompt(`Please enter ${propName}: `, {hideText: true});

            // Save the value in the config securely
            if (propValue) {
                config.set(propName, propValue, { secure: true });
            }
        }

        // Write the config layer
        await config.save(false);
    }

    private async handlePromptForAuthToken(config: Config, propPath: string): Promise<string | undefined> {
        // TODO Handle more scenarios - what if tokenValue is kebab case, or first in secure array?
        if (!propPath.endsWith(".tokenValue")) {
            return;
        }

        const profilePath = propPath.slice(0, propPath.indexOf(".properties"));
        const profile = config.api.profiles.get(profilePath.replace(/profiles\./g, ""));
        if (profile.tokenType == null) {
            return;
        }

        const authConfigs: ICommandProfileAuthConfig[] = [];
        ImperativeConfig.instance.loadedConfig.profiles.forEach((profile) => {
            if (profile.authConfig != null) {
                authConfigs.push(...profile.authConfig);
            }
        });
        const authConfig = authConfigs.find(({ tokenType }) => tokenType === profile.tokenType);
        if (authConfig == null) {
            return;
        }

        // TODO Pass parms and service description
        const sessCfg: ISession = await ConnectionPropsForSessCfg.addPropsOrPrompt({}, profile as any,
            { parms: this.params, doPrompting: true, requestToken: true });
        const authHandler: ICommandHandlerRequire = require(authConfig.handler);
        return (new authHandler.default() as any).doLogin(new Session(sessCfg));
    }
}
