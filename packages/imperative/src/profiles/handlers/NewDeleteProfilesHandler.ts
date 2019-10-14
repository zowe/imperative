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

import { IHandlerParameters } from "../../../../cmd";
import { Imperative } from "../../Imperative";
import { Constants } from "../../../../constants";
import { IProfileDeleted, ProfilesConstants } from "../../../../profiles";

export default class NewDeleteProfilesHandler {
    public async process(commandParameters: IHandlerParameters) {
        const profileType = commandParameters.definition.customize[ProfilesConstants.PROFILES_COMMAND_TYPE_KEY];
        const profileName: string = commandParameters.arguments[Constants.PROFILE_NAME_OPTION];
        const deleted: IProfileDeleted = await Imperative.api.profileManager(profileType).delete({
            name: profileName,
            rejectIfDependency: !commandParameters.arguments.force || false
        });
        commandParameters.response.console.log(`Profile "${profileName}" of type "${profileType}" successfully deleted.`);
        if (deleted.defaultCleared) {
            commandParameters.response.console.log(`"${profileName}" was the default profile for type "${profileType}".\nBecause you deleted it, ` +
                `the default profile for type "${profileType}" has been cleared.\nTo set a new default profile, run "zowe profiles set-default ` +
                `${profileType} <profileName>".`);
        }
    }
}
