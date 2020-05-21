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

import { AuthCommandBuilder } from "./AuthCommandBuilder";
import { ICommandDefinition } from "../../../../cmd";
import { loginAuthCommandDesc } from "../../../../messages";
import { Constants } from "../../../../constants";
import { TextUtils } from "../../../../utilities";
import { Logger } from "../../../../logger/index";
import { ProfilesConstants } from "../../../../profiles";
import { ICommandProfileAuthConfig } from "../../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";

/**
 * Used to build auth login command definitions.
 * Used automatically if you allow the "auth" command group to be generated
 */
export class AuthLoginCommandBuilder extends AuthCommandBuilder {
    /**
     * Gets the "action" that this command builder is building.
     * @return {string}: The "login" action string
     */
    public getAction(): string {
        return Constants.LOGIN_ACTION;
    }

    /**
     * Build the full command - includes action group and object command.
     * @return {ICommandDefinition}: The command definition.
     */
    public buildFull(): ICommandDefinition {
        return this.buildAuthSegmentFromConfig();
    }

    /**
     * Builds only the "auth" segment from the auth config.
     * @return {ICommandDefinition}
     */
    protected buildAuthSegmentFromConfig(): ICommandDefinition {
        const authType: string = this.mConfig.serviceName;
        const authCommand: ICommandDefinition = {
            name: authType,
            summary: TextUtils.formatMessage(loginAuthCommandDesc.message,
                {type: authType}),
            description: this.mConfig.login.description,
            type: "command",
            handler: this.mConfig.login.handler,
            options: this.mConfig.login.options,
            examples: this.mConfig.login.examples,
            profile: {
                optional: [this.mProfileType]
            },
            customize: {}
        };
        // authCommand.customize[ProfilesConstants.PROFILES_COMMAND_TYPE_KEY] = this.mProfileType;

        if (authCommand.description == null) {
            authCommand.description = authCommand.summary;
        }
        return authCommand;
    }
}
