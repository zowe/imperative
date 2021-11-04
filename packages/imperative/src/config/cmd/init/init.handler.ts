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
import { ImperativeConfig, TextUtils } from "../../../../../utilities";
import { Config, ConfigSchema, IConfig } from "../../../../../config";
import { IProfileProperty } from "../../../../../profiles";
import { ConfigBuilder } from "../../../../../config/src/ConfigBuilder";
import { IConfigBuilderOpts } from "../../../../../config/src/doc/IConfigBuilderOpts";
import { CredentialManagerFactory } from "../../../../../security";
import { secureSaveError } from "../../../../../config/src/ConfigUtils";
import { OverridesLoader } from "../../../OverridesLoader";

/**
 * Init config
 */
export default class InitHandler implements ICommandHandler {
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

        // Load the config and set the active layer according to user options
        await this.ensureCredentialManagerLoaded();
        const config = ImperativeConfig.instance.config;
        const configDir = params.arguments.globalConfig ? null : process.cwd();
        config.api.layers.activate(params.arguments.userConfig, params.arguments.globalConfig, configDir);
        const layer = config.api.layers.get();

        await this.initWithSchema(config, params.arguments.userConfig, params.arguments.overwrite);

        if (params.arguments.prompt !== false && !CredentialManagerFactory.initialized && config.api.secure.secureFields().length > 0) {
            const warning = secureSaveError();
            params.response.console.log(TextUtils.chalk.yellow("Warning:\n") +
                `${warning.message} Skipped prompting for credentials.\n\n${warning.additionalDetails}\n`);
        }

        // Write the active created/updated config layer
        await config.save(false);

        params.response.console.log(`Saved config template to ${layer.path}`);
    }

    /**
     * If CredentialManager was not already loaded by Imperative.init, load it
     * now before performing config operations in the init handler.
     */
    private async ensureCredentialManagerLoaded() {
        if (!CredentialManagerFactory.initialized) {
            await OverridesLoader.loadCredentialManager(ImperativeConfig.instance.loadedConfig,
                ImperativeConfig.instance.callerPackageJson);
        }
    }

    /**
     * Creates JSON template for config. Also creates a schema file in the same
     * folder alongside the config.
     * @param config Config object to be populated
     * @param user If true, properties will be left empty for user config
     */
    private async initWithSchema(config: Config, user: boolean, overwrite: boolean): Promise<void> {
        const opts: IConfigBuilderOpts = {};
        if (!user) {
            opts.populateProperties = true;
            opts.getSecureValue = this.promptForProp.bind(this);
        }

        // Build new config and merge with existing layer or overwrite it if overwrite option is present
        const newConfig: IConfig = await ConfigBuilder.build(ImperativeConfig.instance.loadedConfig, opts);
        if (!overwrite) {
            config.api.layers.merge(newConfig);
        } else {
            config.api.layers.set(newConfig);
        }

        // Build the schema and write it to disk
        ConfigSchema.updateSchema();
    }

    /**
     * Prompts for the value of a property on the CLI. Returns null if `--prompt false`
     * argument is passed, or prompt times out, or a blank value is entered.
     * @param propName The name of the property
     * @param property The profile property definition
     */
    private async promptForProp(propName: string, property: IProfileProperty): Promise<any> {
        // skip prompting in CI environment
        if (this.params.arguments.prompt === false || !CredentialManagerFactory.initialized) {
            return null;
        }

        // get the summary and value
        if ((property as any).optionDefinition?.description != null) {
            propName = `${propName} (${(property as any).optionDefinition.description})`;
        }

        const propValue: any = await this.params.response.console.prompt(`${propName} - blank to skip: `, {hideText: property.secure});

        // coerce to correct type
        if (propValue && propValue.trim().length > 0) {
            if (propValue === "true")
                return true;
            if (propValue === "false")
                return false;
            if (!isNaN(propValue) && !isNaN(parseFloat(propValue)))
                return parseInt(propValue, 10);
        }

        return propValue || null;
    }
}
