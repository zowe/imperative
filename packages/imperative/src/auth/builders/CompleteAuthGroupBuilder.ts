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

import { ICommandDefinition } from "../../../../cmd";
import {
    loginAuthsCommandDesc, loginAuthsCommandSummary,
    logoutAuthsCommandDesc, logoutAuthsCommandSummary
} from "../../../../messages";
import { Constants } from "../../../../constants";
import { AuthLoginCommandBuilder } from "./AuthLoginCommandBuilder";
import { AuthLogoutCommandBuilder } from "./AuthLogoutCommandBuilder";
import { Logger } from "../../../../logger/index";
import { ICommandProfileAuthConfig } from "../../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";

/**
 * Generate a complete group of commands for logging in and out of services
 * based on provided auth definitions.
 */
export class CompleteAuthGroupBuilder {
    /**
     * Get the complete auth group of commands
     * @param {[key: string]: ICommandProfileAuthConfig} authConfigs - mapping of profile types to auth configs
     * @param {Logger} logger - logger to use in the builder classes
     * @returns {ICommandDefinition} - the complete profile group of commands
     */
    public static getAuthGroup(authConfigs: {[key: string]: ICommandProfileAuthConfig[]}, logger: Logger): ICommandDefinition {
        const authGroup: ICommandDefinition = {
            name: Constants.AUTH_GROUP,
            description: "Manage tokens for authentication services",
            type: "group",
            children: []
        };

        const loginGroup: ICommandDefinition = {
            name: Constants.LOGIN_ACTION,
            description: loginAuthsCommandDesc.message,
            summary: loginAuthsCommandSummary.message,
            aliases: ["li"],
            type: "group",
            children: [],
        };

        const logoutGroup: ICommandDefinition = {
            name: Constants.LOGOUT_ACTION,
            description: logoutAuthsCommandDesc.message,
            summary: logoutAuthsCommandSummary.message,
            aliases: ["lo"],
            type: "group",
            children: [],
        };

        const cmdGroups: ICommandDefinition[] = [];
        for (const profileType of Object.keys(authConfigs)) {
            for (const authConfig of authConfigs[profileType]) {
                const loginCommandAction = new AuthLoginCommandBuilder(profileType, logger, authConfig);
                const logoutCommandAction = new AuthLogoutCommandBuilder(profileType, logger, authConfig);
                loginGroup.children.push(loginCommandAction.build());
                logoutGroup.children.push(logoutCommandAction.build());
            }
        }
        authGroup.children.push(loginGroup, logoutGroup);
        return authGroup;
    }
}
