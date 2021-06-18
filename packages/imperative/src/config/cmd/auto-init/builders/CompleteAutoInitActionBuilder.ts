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

import { ICommandDefinition } from "../../../../../../cmd";
import {
    authCategoryDesc,
    authLoginGroupDesc, authLoginGroupSummary,
    authLogoutGroupDesc, authLogoutGroupSummary
} from "../../../../../../messages";
import { Constants } from "../../../../../../constants";
import { AutoInitCommandBuilder } from "./AutoInitCommandBuilder";
import { Logger } from "../../../../../../logger/index";
import { ICommandProfileAutoInitConfig } from "../../../../../../cmd/src/doc/profiles/definition/ICommandProfileAutoInitConfig";
import { IImperativeAutoInitCommandConfig } from "../../../../doc/IImperativeAutoInitCommandConfig";

/**
 * Generate a complete command for automatic initialization of a user configuration
 */
export class CompleteAutoInitCommandBuilder {
    /**
     * Get the complete auth group of commands
     * @param {ICommandProfileAutoInitConfig} autoInitConfig - mapping of profile types to auto init configs
     * @param {Logger} logger - logger to use in the builder classes
     * @param {IImperativeAutoInitCommandConfig} autoInitCommandConfig - config that allows command definitions to be overridden
     * @returns {ICommandDefinition} - the complete profile group of commands
     */
    public static getAutoInitCommand(autoInitConfig: ICommandProfileAutoInitConfig,
                                     logger: Logger,
                                     autoInitCommandConfig: IImperativeAutoInitCommandConfig = {}): ICommandDefinition {
        const autoInitCommandAction = new AutoInitCommandBuilder(logger, autoInitConfig, autoInitConfig.profileType);
        const autoInitCommandActionBuilt = autoInitCommandAction.build();
        const autoInitCommand: ICommandDefinition = {...autoInitCommandActionBuilt, ...autoInitCommandConfig.autoInitConfig.autoInit};
        return autoInitCommand;
    }
}
