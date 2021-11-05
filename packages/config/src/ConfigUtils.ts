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

import { ICommandArguments } from "../../cmd";
import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";

/**
 * Coeerces string property value to a boolean or number type.
 * @param value String value
 * @returns Boolean, number, or string
 */
export function coercePropValue(value: any) {
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    if (!isNaN(value) && !isNaN(parseFloat(value)))
        return parseInt(value, 10);
    return value;
}

/**
 * Retrieves the name of the active profile for the given type. If no such
 * profile exists, returns the default name which can be used to create a new profile.
 * @param profileType The type of CLI profile
 * @param cmdArguments CLI arguments which may specify a profile
 * @param defaultProfileName Name to fall back to if profile doesn't exist. If
 *                           not specified, the profile type will be used.
 * @returns The profile name
 */
export function getActiveProfileName(profileType: string, cmdArguments: ICommandArguments, defaultProfileName?: string): string {
    // Look for profile name first in command line arguments, second in
    // default profiles defined in config, and finally fall back to using
    // the profile type as the profile name.
    return cmdArguments[`${profileType}-profile`] ||
        ImperativeConfig.instance.config.properties.defaults[profileType] ||
        defaultProfileName || profileType;
}

/**
 * Form an error message for failures to securely save a value.
 *
 * @param solution Text that our caller can supply for a solution.
 */
export function secureSaveError(solution?: string): ImperativeError {
    const displayName = ImperativeConfig.instance.loadedConfig.productDisplayName || ImperativeConfig.instance.loadedConfig.name;
    let details = `Possible Solutions:\n` +
        ` 1. Reinstall ${displayName}. On Linux systems, also make sure to install the prerequisites listed in ${displayName} documentation.\n` +
        ` 2. Ensure ${displayName} can access secure credential storage. ${displayName} needs access to the OS to securely save credentials.`;
    if (solution != null) {
        details += `\n 3. ${solution}`;
    }
    return new ImperativeError({
        msg: "Unable to securely save credentials.",
        additionalDetails: details
    });
}
