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

import { IHandlerParameters, IHandlerResponseApi } from "../../../../cmd";
import { AbstractSession, ConnectionPropsForSessCfg, IOptionsForAddConnProps, ISession, SessConstants, Session } from "../../../../rest";
import { Imperative } from "../../Imperative";
import { ImperativeExpect } from "../../../../expect";
import { ImperativeError } from "../../../../error";
import { ISaveProfileFromCliArgs } from "../../../../profiles";
import { ImperativeConfig } from "../../../../utilities";
import { getActiveProfileName, secureSaveError } from "../../../../config/src/ConfigUtils";
import { AbstractAuthHandler } from "./AbstractAuthHandler";
import { IAuthHandlerApi } from "../doc/IAuthHandlerApi";

/**
 * This class is used by the auth command handlers as the base class for their implementation.
 */
export abstract class BaseAuthHandler extends AbstractAuthHandler {
    /**
     * The session being created from the command line arguments / profile
     */
    protected mSession: AbstractSession;

    /**
     * This is called by the "auth login" command after it creates a session, to
     * obtain a token that can be stored in a profile.
     * @abstract
     * @param {AbstractSession} session The session object to use to connect to the auth service
     * @returns {Promise<string>} The response from the auth service containing a token
     */
    protected abstract doLogin(session: AbstractSession): Promise<string>;

    /**
     * This is called by the "auth logout" command after it creates a session, to
     * revoke a token before removing it from a profile.
     * @abstract
     * @param {AbstractSession} session The session object to use to connect to the auth service
     */
    protected abstract doLogout(session: AbstractSession): Promise<void>;

    /**
     * This is called by the "config secure" handler when it needs to prompt
     * for connection info to obtain an auth token.
     * @deprecated Use `getAuthHandlerApi` instead
     * @returns A tuple containing:
     *  - Options for adding connection properties
     *  - The login handler
     */
    public getPromptParams(): [IOptionsForAddConnProps, (session: AbstractSession) => Promise<string>] {
        return [{
            defaultTokenType: this.mDefaultTokenType,
            serviceDescription: this.mServiceDescription
        }, this.doLogin];
    }

    /**
     * Returns auth handler API that provides convenient functions to create a
     * session from args, and use it to login or logout of an auth service.
     */
    public getAuthHandlerApi(): IAuthHandlerApi {
        return {
            promptParams: {
                defaultTokenType: this.mDefaultTokenType,
                serviceDescription: this.mServiceDescription
            },
            createSessCfg: this.createSessCfgFromArgs,
            sessionLogin: this.doLogin,
            sessionLogout: this.doLogout
        };
    }

    /**
     * Performs the login operation. Builds a session to connect to the auth
     * service, sends a login request to it to obtain a token, and stores the
     * resulting token in the profile of type `mProfileType`.
     * @param {IHandlerParameters} params Command parameters sent by imperative.
     */
    protected async processLogin(params: IHandlerParameters) {
        const sessCfg: ISession = this.createSessCfgFromArgs(
            params.arguments
        );
        const sessCfgWithCreds = await ConnectionPropsForSessCfg.addPropsOrPrompt<ISession>(
            sessCfg, params.arguments,
            { requestToken: true, defaultTokenType: this.mDefaultTokenType, parms: params, autoStore: false }
        );

        this.mSession = new Session(sessCfgWithCreds);
        this.mSession.ISession.storeCookie = true;

        // login to obtain a token.
        const tokenValue = await this.doLogin(this.mSession);
        this.mSession.ISession.storeCookie = false;

        // validate a token was returned
        if (tokenValue == null) {
            throw new ImperativeError({msg: "A token value was not returned from the login handler."});
        }

        if (params.arguments.showToken) {
            // show token instead of updating profile
            this.showToken(params.response, tokenValue);
        } else if (!ImperativeConfig.instance.config.exists) {
            // process login for old school profiles
            await this.processLoginOld(params, tokenValue);
        } else if (ImperativeConfig.instance.config.api.secure.loadFailed) {
            throw secureSaveError(`Instead of secure storage, rerun this command with the "--show-token" flag to print the token to console. ` +
                `Store the token in an environment variable ${ImperativeConfig.instance.loadedConfig.envVariablePrefix}_OPT_TOKEN_VALUE to use it ` +
                `in future commands.`);
        } else {
            // update the profile given
            // TODO Should config be added to IHandlerParameters?
            const config = ImperativeConfig.instance.config;
            let profileName = this.getBaseProfileName(params);
            const profileProps = Object.keys(config.api.profiles.get(profileName, false));
            let profileExists = config.api.profiles.exists(profileName) && profileProps.length > 0;
            profileProps.push(...config.api.secure.securePropsForProfile(profileName));
            const beforeLayer = config.api.layers.get();

            // Check if existing base profile is reusable (does it include user/password?)
            if (profileExists && (profileProps.includes("user") || profileProps.includes("password"))) {
                profileName = `${profileName}_${params.positionals[2]}`;
                profileExists = false;
            }

            // If base profile is null or empty, prompt user before saving token to disk
            if (!profileExists) {
                const ok = await this.promptForBaseProfile(params, profileName);
                if (!ok) {
                    this.showToken(params.response, tokenValue);
                    return;
                }

                config.api.profiles.set(profileName, {
                    type: this.mProfileType,
                    properties: {
                        host: this.mSession.ISession.hostname,
                        port: this.mSession.ISession.port
                    }
                });
                config.api.profiles.defaultSet(this.mProfileType, profileName);
            } else {
                const layer = config.api.layers.find(profileName);
                if (layer != null) {
                    const { user, global } = layer;
                    config.api.layers.activate(user, global);
                }
            }

            const profilePath = config.api.profiles.expandPath(profileName);
            config.set(`${profilePath}.properties.tokenType`, this.mSession.ISession.tokenType);
            config.set(`${profilePath}.properties.tokenValue`, tokenValue, { secure: true });

            await config.save();
            // Restore original active layer
            config.api.layers.activate(beforeLayer.user, beforeLayer.global);

            params.response.console.log(`\n` +
                `Login successful. The authentication token is stored in the '${profileName}' ` +
                `${this.mProfileType} profile for future use. To revoke this token and remove it from your profile, review the ` +
                `'zowe auth logout' command.`);
        }
    }

    private getBaseProfileName(params: IHandlerParameters): string {
        return getActiveProfileName(this.mProfileType, params.arguments, `${this.mProfileType}_${params.positionals[2]}`);
    }

    private async promptForBaseProfile(params: IHandlerParameters, profileName: string): Promise<boolean> {
        const answer: string = await params.response.console.prompt(
            `Do you want to store the host, port, and token on disk for use with future commands? If you answer Yes, the credentials will ` +
            `be saved to a ${this.mProfileType} profile named '${profileName}'. If you answer No, the token will be printed to the ` +
            `terminal and will not be stored on disk. [y/N]: `);
        return (answer != null && (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"));
    }

    private showToken(response: IHandlerResponseApi, tokenValue: string) {
        response.console.log(`\n` +
            `Received a token of type = ${this.mSession.ISession.tokenType}.\n` +
            `The following token was retrieved and will not be stored in your profile:\n` +
            `${tokenValue}\n\n` +
            `Login successful. To revoke this token, review the 'zowe auth logout' command.`
        );
        response.data.setObj({ tokenType: this.mSession.ISession.tokenType, tokenValue });
    }

    /**
     * Performs the logout operation. Deletes the token and token type from the profile,
     * and rebuilds the session.
     * @param {IHandlerParameters} params Command parameters sent by imperative.
     */
    protected async processLogout(params: IHandlerParameters) {
        if (params.arguments.tokenValue != null) {
            // Force to use of token value, in case user and/or password also on base profile, make user undefined.
            if (params.arguments.user != null) {
                params.arguments.user = undefined;
            }

            if (params.arguments.tokenType == null) {
                params.arguments.tokenType = this.mDefaultTokenType;
            }

            const sessCfg: ISession = this.createSessCfgFromArgs(
                params.arguments
            );

            const sessCfgWithCreds = await ConnectionPropsForSessCfg.addPropsOrPrompt<ISession>(
                sessCfg, params.arguments,
                { requestToken: false, doPrompting: false, parms: params },
            );

            this.mSession = new Session(sessCfgWithCreds);

            await this.doLogout(this.mSession);
        }

        if (!ImperativeConfig.instance.config.exists) {
            await this.processLogoutOld(params);
        } else {
            const config = ImperativeConfig.instance.config;
            const profileName = this.getBaseProfileName(params);
            const profileProps = config.api.profiles.get(profileName, false);
            let profileWithToken: string = null;

            // If you specified a token on the command line, then don't delete the one in the profile if it doesn't match
            if (Object.keys(profileProps).length > 0 && (profileProps.tokenType != null || profileProps.tokenValue != null) &&
                (profileProps.tokenType === params.arguments.tokenType || profileProps.tokenValue === params.arguments.tokenValue)) {
                const profilePath = config.api.profiles.expandPath(profileName);
                config.delete(`${profilePath}.properties.tokenType`);
                config.delete(`${profilePath}.properties.tokenValue`);

                await config.save();
                profileWithToken = profileName;
            }

            params.response.console.log("Logout successful. The authentication token has been revoked" +
                (profileWithToken != null ? ` and removed from your '${profileWithToken}' ${this.mProfileType} profile` : "") +
                ".");
        }
    }

    /* Methods for old-school profiles below */
    private async processLoginOld(params: IHandlerParameters, tokenValue: string) {
        const loadedProfile = params.profiles.getMeta(this.mProfileType, false);
        let profileWithToken: string = null;

        if (loadedProfile != null && loadedProfile.name != null) {
            await Imperative.api.profileManager(this.mProfileType).update({
                name: loadedProfile.name,
                args: {
                    "token-type": this.mSession.ISession.tokenType,
                    "token-value": tokenValue
                },
                merge: true
            });
            profileWithToken = loadedProfile.name;
        } else {

            // Do not store non-profile arguments, user, or password. Set param arguments for prompted values from session.

            const copyArgs = {...params.arguments};
            copyArgs.createProfile = undefined;
            copyArgs.showToken = undefined;
            copyArgs.user = undefined;
            copyArgs.password = undefined;

            copyArgs.host = this.mSession.ISession.hostname;
            copyArgs.port = this.mSession.ISession.port;

            copyArgs.tokenType = this.mSession.ISession.tokenType;
            copyArgs["token-type"] = this.mSession.ISession.tokenType;

            copyArgs.tokenValue = tokenValue;
            copyArgs["token-value"] = tokenValue;

            const createParms: ISaveProfileFromCliArgs = {
                name: "default",
                type: this.mProfileType,
                args: copyArgs,
                overwrite: false,
                profile: {}
            };

            if (await this.promptForBaseProfile(params, createParms.name)) {
                await Imperative.api.profileManager(this.mProfileType).save(createParms);
                profileWithToken = createParms.name;
            } else {
                this.showToken(params.response, tokenValue);
            }
        }

        if (profileWithToken != null) {
            params.response.console.log(`\n` +
                `Login successful. The authentication token is stored in the '${profileWithToken}' ` +
                `${this.mProfileType} profile for future use. To revoke this token and remove it from your profile, review the ` +
                `'zowe auth logout' command.`);
        }
    }

    private async processLogoutOld(params: IHandlerParameters) {
        const loadedProfile = params.profiles.getMeta(this.mProfileType, false);

        // If you specified a token on the command line, then don't delete the one in the profile if it doesn't match
        let profileWithToken: string = null;
        if (loadedProfile != null &&
            loadedProfile.name != null &&
            loadedProfile.profile != null &&
            loadedProfile.profile.tokenValue != null &&
            params.arguments.tokenValue === loadedProfile.profile.tokenValue) {
            await Imperative.api.profileManager(this.mProfileType).save({
                name: loadedProfile.name,
                type: loadedProfile.type,
                overwrite: true,
                profile: {
                    ...loadedProfile.profile,
                    tokenType: undefined,
                    tokenValue: undefined
                }
            });
            profileWithToken = loadedProfile.name;
        }

        this.mSession.ISession.type = SessConstants.AUTH_TYPE_BASIC;
        this.mSession.ISession.tokenType = undefined;
        this.mSession.ISession.tokenValue = undefined;

        params.response.console.log("Logout successful. The authentication token has been revoked" +
            (profileWithToken != null ? ` and removed from your '${profileWithToken}' ${this.mProfileType} profile` : "") +
            ".");
    }
}
