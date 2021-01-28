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

import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";

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
