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

import { ICommandHandler, IHandlerParameters, ICommandArguments, CommandResponse } from "../../../../../../cmd";
import { ISession, ConnectionPropsForSessCfg, Session, AbstractSession } from "../../../../../../rest";
import { ConfigConstants, ConfigSchema, IConfig } from "../../../../../../config";
import { diff } from "jest-diff";
import stripAnsi from "strip-ansi";
import * as open from "open";
import * as JSONC from "comment-json";
import * as lodash from "lodash";
import { ImperativeConfig, TextUtils } from "../../../../../../utilities";
import { CredentialManagerFactory } from "../../../../../../security";
import { OverridesLoader } from "../../../../OverridesLoader";

/**
 * This class is used by the auto init command handler as the base class for its implementation.
 */
export abstract class BaseAutoInitHandler implements ICommandHandler {

    /**
     * The profile type where connection information should be stored
     */
    protected abstract mProfileType: string;

    /**
     * The description of your service to be used in CLI prompt messages
     */
    protected abstract mServiceDescription: string;

    /**
     * The session being created from the command line arguments / profile
     */
    protected mSession: AbstractSession;

    /**
     * This is called by the {@link BaseAuthHandler#process} when it needs a
     * session. Should be used to create a session to connect to the auto-init
     * service.
     * @abstract
     * @param {ICommandArguments} args The command line arguments to use for building the session
     * @returns {ISession} The session object built from the command line arguments.
     */
    protected abstract createSessCfgFromArgs(args: ICommandArguments): ISession;

    /**
     * This handler is used for the "auto-init" command, and calls processAutoInit
     *
     * @param {IHandlerParameters} commandParameters Command parameters sent by imperative.
     *
     * @returns {Promise<void>}
     */
    public async process(commandParameters: IHandlerParameters) {
        await this.processAutoInit(commandParameters);
    }

    /**
     * This is called by the "auto-init" command after it creates a session, to
     * obtain information that can be used to automatically create a config
     * @abstract
     * @param {AbstractSession} session The session object to use to connect to the auth service
     * @returns {Promise<string>} The response from the auth service containing a token
     */
    protected abstract doAutoInit(session: AbstractSession, params: IHandlerParameters): Promise<IConfig>;

    /**
     * Processes the auto init command to the auto init service.
     * Applies the changes to whichever config layer is specified by IHandlerParameters.
     * Can also perform a dry run and display the changes, or open the config for editing.
     * @param {IHandlerParameters} params Command parameters sent by imperative.
     */
    private async processAutoInit(params: IHandlerParameters) {
        const sessCfg = this.createSessCfgFromArgs(params.arguments);
        const sessCfgWithCreds = await ConnectionPropsForSessCfg.addPropsOrPrompt<ISession>(
            sessCfg, params.arguments, { parms: params, doPrompting: true, serviceDescription: this.mServiceDescription },
        );
        this.mSession = new Session(sessCfgWithCreds);
        const profileConfig = await this.doAutoInit(this.mSession, params);
        ConnectionPropsForSessCfg.saveSessionToCache(this.mSession.ISession, params.response as CommandResponse);
        let global = false;
        let user = false;

        // Use params to set which config layer to apply to
        await this.ensureCredentialManagerLoaded();
        if (params.arguments.globalConfig && params.arguments.globalConfig === true) {
            global = true;
        }
        if (params.arguments.userConfig && params.arguments.userConfig === true) {
            user = true
        }
        ImperativeConfig.instance.config.api.layers.activate(user, global);

        if (params.arguments.dryRun && params.arguments.dryRun === true) {
            // Merge and display, do not save
            // TODO preserve comments

            // Handle if the file doesn't actually exist
            let original: any = ImperativeConfig.instance.config.api.layers.get();
            let originalProperties: any;
            if (original.exists === false) {
                originalProperties = {};
            } else {
                originalProperties = JSONC.parse(JSONC.stringify(original.properties, null, ConfigConstants.INDENT));

                // Hide secure stuff
                for (const secureProp of ImperativeConfig.instance.config.api.secure.secureFields(original)) {
                    if (lodash.has(originalProperties, secureProp)) {
                        lodash.unset(originalProperties, secureProp);
                    }
                }
            }

            let dryRun: any = ImperativeConfig.instance.config.api.layers.merge(profileConfig, true);
            const dryRunProperties = JSONC.parse(JSONC.stringify(dryRun.properties, null, ConfigConstants.INDENT));

            // Hide secure stuff
            for (const secureProp of ImperativeConfig.instance.config.api.secure.findSecure(dryRun.properties.profiles, "profiles")) {
                if (lodash.has(dryRunProperties, secureProp)) {
                    lodash.unset(dryRunProperties, secureProp);
                }
            }

            original = JSONC.stringify(originalProperties,
                                      null,
                                      ConfigConstants.INDENT);
            dryRun = JSONC.stringify(dryRunProperties,
                                     null,
                                     ConfigConstants.INDENT);

            let jsonDiff = diff(original, dryRun, {aAnnotation: "Removed",
                                                   bAnnotation: "Added",
                                                   aColor: TextUtils.chalk.red,
                                                   bColor: TextUtils.chalk.green});

            if (stripAnsi(jsonDiff) === "Compared values have no visual difference.") {
                jsonDiff = dryRun;
            }

            params.response.console.log(jsonDiff);
            params.response.data.setObj(jsonDiff);
        } else if (params.arguments.edit && params.arguments.edit === true) {
            // Open in the default editor
            // TODO make this work in an environment without a GUI
            await open(ImperativeConfig.instance.config.api.layers.get().path, {wait: true});
        } else if (params.arguments.overwrite && params.arguments.overwrite === true) {
            if (params.arguments.forSure && params.arguments.forSure === true) {
                // Clear layer, merge, generate schema, and save
                ImperativeConfig.instance.config.api.layers.set(profileConfig);
                const schema = ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles);
                ImperativeConfig.instance.config.setSchema(schema);
                await ImperativeConfig.instance.config.save(false);
            }
        } else {
            // Merge, generate schema, and save
            ImperativeConfig.instance.config.api.layers.merge(profileConfig);
            if (ImperativeConfig.instance.config.api.layers.get().properties.$schema == null) {
                // TODO What condition should we use to decide whether to (re)generate schema?
                const schema = ConfigSchema.buildSchema(ImperativeConfig.instance.loadedConfig.profiles);
                ImperativeConfig.instance.config.setSchema(schema);
            }
            await ImperativeConfig.instance.config.save(false);
        }
    }

    /**
     * If CredentialManager was not already loaded by Imperative.init, load it
     * now before performing config operations in the auto-init handler.
     */
    private async ensureCredentialManagerLoaded() {
        if (!CredentialManagerFactory.initialized) {
            await OverridesLoader.loadCredentialManager(ImperativeConfig.instance.loadedConfig,
                ImperativeConfig.instance.callerPackageJson);
        }
    }
}
