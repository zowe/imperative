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

import { Imperative } from "../../../";
import { ProfilesConstants } from "../../../../profiles/src/constants/ProfilesConstants";
import { CliProfileManager, ICommandHandler, IHandlerParameters } from "../../../../cmd";
import { IProfileLoaded } from "../../../..";

/**
 * Handler for the auto-generated list profiles command.
 */
export default class ListProfilesHandler implements ICommandHandler {

    /**
     * The process command handler for the "list profiles" command.
     * @return {Promise<ICommandResponse>}: The promise to fulfill when complete.
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const profileType: string = params.definition.customize[ProfilesConstants.PROFILES_COMMAND_TYPE_KEY];
        let profileManager: CliProfileManager;
        let defaultName: string;
        let loadResults: IProfileLoaded[];
        try {
            // Extract the profile type, profile manager, and the default profile
            profileManager = Imperative.api.profileManager(profileType);
            defaultName = profileManager.getDefaultProfileName();

            // Load all profiles for the type contained in the manager
            loadResults = await profileManager.loadAll({noSecure: true, typeOnly: true});
        } catch (error) {
            const err: string = `Error occurred while listing profiles for ` +
                `${profileType}.\n${error.message}`;
            params.response.console.error(err);
            return;
        }

        // Set the data object
        params.response.data.setMessage(`"${loadResults.length}" profiles loaded for type "${profileType}"`);
        params.response.data.setObj(loadResults);

        // Construct the format print list
        const print = [];
        for (const result of loadResults) {
            if (result.name === defaultName) {
                result.name += " (default) ";
            }

            print.push({
                name: result.name,
                contents: result.profile
            });

        }

        // Format the results accord to the contents
        if (params.arguments.showContents) {
            params.response.format.output({
                output: print,
                format: "object"
            });
        } else {
            params.response.format.output({
                output: print,
                fields: ["name"],
                format: "list"
            });
        }
    }
}

