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

import { overroteProfileMessage, profileCreatedSuccessfullyAndPath, profileReviewMessage } from "../../../../messages";
import { Imperative } from "../../Imperative";
import { IProfileSaved, IProfileSchema, ISaveProfileFromCliArgs, ProfilesConstants } from "../../../../profiles";
import { ICommandHandler, ICommandProfileProperty, IHandlerParameters } from "../../../../cmd";

import { Constants } from "../../../../constants";
import { ImperativeConfig, TextUtils } from "../../../../utilities";
import { Config } from "../../../../config/Config";

import * as path from "path";

/**
 * Handler that allows creation of a profile from command line arguments. Intended for usage with the automatically
 * generated profile create commands, but can be used otherwise.
 * @export
 * @class CreateProfilesHandler
 * @implements {ICommandHandler}
 */
export default class CreateProfilesHandler implements ICommandHandler {
    /**
     * Create a profile from command line arguments.
     * @param {IHandlerParameters} commandParameters - Standard Imperative command handler parameters - see the
     * interface for full details
     * @memberof CreateProfilesHandler
     */
    public async process(commandParameters: IHandlerParameters) {
        const profileType: string = commandParameters.definition.customize[ProfilesConstants.PROFILES_COMMAND_TYPE_KEY];
        const profileName = commandParameters.arguments[Constants.PROFILE_NAME_OPTION];

        // Load the configuration and load secure fields from config
        const config = Config.load(ImperativeConfig.instance.rootCommandName, {
            schemas: ImperativeConfig.instance.configSchemas
        });

        if (config.exists) {
            const profile = this.argsToProfile(commandParameters.arguments, ImperativeConfig.instance.configSchemas[profileType]);
            config.api.profiles.set(profileType, profileName, profile);
            // await config.api.profiles.write(profileType, profileName);
        } else {
            const profileManager = Imperative.api.profileManager(profileType);

            const createParms: ISaveProfileFromCliArgs = {
                name: profileName,
                type: profileType,
                args: commandParameters.arguments,
                overwrite: commandParameters.arguments.overwrite,
                disableDefaults: commandParameters.arguments.disableDefaults,
                profile: {}
            };
            /**
             * Create the profile based on the command line arguments passed
             */
            const createResponse: IProfileSaved = await profileManager.save(createParms);

            /**
             * Indicate to the user (if specified) that the profile was overwritten
             */
            if (createResponse.overwritten) {
                commandParameters.response.console.log(overroteProfileMessage.message, {
                    profileOption: commandParameters
                        .arguments[Constants.PROFILE_NAME_OPTION]
                });
            }

            /**
             * Formulate th remainder of the response - which
             */
            commandParameters.response.console.log(profileCreatedSuccessfullyAndPath.message);
            commandParameters.response.console.log(createResponse.path);
            commandParameters.response.console.log("");
            commandParameters.response.console.log(TextUtils.prettyJson(createResponse.profile,
                undefined, undefined, "\n"));
            commandParameters.response.console.log(profileReviewMessage.message);
        }
    }

    /**
     * Default style of building of profile fields to option definitions defined in the schema
     * Will only work if there is a one-to-one option definition mapping for schema fields
     * @param {yargs.Arguments} args - the arguments specified by the user
     * @param {IProfile} profile -  the profile so far, which will be updated
     */
    private argsToProfile(args: any, schema: any): any {
        const profile: any = {};

        /**
         * Helper routine to find nested properties
         * @param {Object} property - profile property
         * @param {ICommandProfileProperty} property - profile property
         * @param {string} propertyNamePath - Dot notation path of a property (e.g. my.nested.property)
         */
        const findOptions = (property: ICommandProfileProperty, propertyNamePath: string): any => {
            if (property.optionDefinition != null) {
                // once we reach a property with an option definition,
                // we now have the complete path to the property
                // so we will set the value on the property from the profile
                return args[property.optionDefinition.name];
            }

            if (property.properties != null) {
                const tempProperties: any = {};
                for (const childPropertyName of Object.keys(property.properties)) {
                    tempProperties[childPropertyName] =
                        findOptions(property.properties[childPropertyName], propertyNamePath + "." + childPropertyName);
                }
                return tempProperties;
            }

            // Don't define any value here if the profile field cannot be set by a CLI option
            return undefined;
        };

        for (const propertyName of Object.keys(schema.properties)) {
            const opt = findOptions(schema.properties[propertyName], propertyName);
            if (opt != null) {
                profile[propertyName] = opt;
            }
        }

        return profile;
    }
}

