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

import { AbstractCommandBuilder } from "../../../../../../cmd/src/builders/AbstractCommandBuilder";
import { ICommandDefinition } from "../../../../../../cmd";
import { Logger } from "../../../../../../logger";
import { ICommandProfileAutoInitConfig } from "../../../../../../cmd/src/doc/profiles/definition/ICommandProfileAutoInitConfig";
import { ImperativeError } from "../../../../../../error";
import { TextUtils } from "../../../../../../utilities";
import { autoInitCommandDesc } from "../../../../../../messages";
import { Constants } from "../../../../../../constants";

/**
 * Class for generating auth-related commands
 */
export class AutoInitCommandBuilder implements AbstractCommandBuilder {

    /**
     * Auth config for the command.
     */
    protected mConfig: ICommandProfileAutoInitConfig;

    /**
     * Construct the builder based on the auth config.
     * @param mProfileType - the profile name of the profile type e.g. banana
     * @param {Logger} mLogger - logger instance to use for the builder class
     * @param {IImperativeAuthConfig} mAuthConfig - the config for the auth type
     */
    constructor(protected mLogger: Logger,
                protected mAutoInitConfig: ICommandProfileAutoInitConfig,
                protected mProfileType?: string) {

        this.mConfig = mAutoInitConfig;
        if (this.mConfig == null) {
            throw new ImperativeError({msg: `Auto-init Builder Error: No auto-init config was supplied.`});
        }
    }

    /**
     * Build the full command - includes action group and object command.
     * @return {ICommandDefinition}: The command definition.
     */
    public buildFull(): ICommandDefinition {
        return this.buildAutoInitSegmentFromConfig();
    }

    /**
     * Gets the "action" that this command builder is building.
     * @return {string}: The auth action string
     */
    public getAction(): string {
        return Constants.AUTO_INIT_ACTION;
    }

    /**
     * Only constructs the "group" command segment for the document. Use this if the command definition
     * document already includes an auth verb.
     * @return {ICommandDefinition}
     */
    public build(): ICommandDefinition {
        return this.buildAutoInitSegmentFromConfig();
    }
    /**
     * Builds only the "auto-init" segment from the auto-init config.
     * @return {ICommandDefinition}
     */
    protected buildAutoInitSegmentFromConfig(): ICommandDefinition {
        const authCommand: ICommandDefinition = {
            name: "auto-init",
            type: "command",
            summary: this.mConfig.autoInit?.summary,
            description: this.mConfig.autoInit?.description,
            handler: this.mConfig.handler,
            options: [
                ...(this.mConfig.autoInit?.options || [])
            ],
            examples: this.mConfig.autoInit?.examples,
            profile: {
                optional: [this.mProfileType]
            },
            customize: {}
        };

        if (authCommand.summary == null) {
            authCommand.summary = TextUtils.formatMessage(autoInitCommandDesc.message, {source: this.mConfig.provider});
        }
        if (authCommand.description == null) {
            authCommand.description = authCommand.summary;
        }
        return authCommand;
    }
}
