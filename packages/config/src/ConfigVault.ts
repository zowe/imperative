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

import { IConfigVault } from "./doc/IConfigVault";

export class ConfigVault {
    private _vault: IConfigVault;

    // Maximum credential length allowed on Windows 7 and newer
    private static readonly MAX_CREDENTIAL_LENGTH = 2560;

    /**
     * Initialize a config vault using the provided vault backend.
     * @param vault Backend with load and save methods
     */
    constructor(vault: IConfigVault) {
        this._vault = vault;
    }

    public async load(key: string): Promise<any> {
        // Load initial value from vault
        let value = await this._vault.load(key);

        // On Windows, try to load more values from vault
        if (process.platform === "win32" && value != null) {
            let index = 1;
            // Check if we've finished reading null-terminated JSON string
            while (!value.endsWith('\0')) {
                index++;
                // Load more values from vault and concat them
                value += await this._vault.load(`${key}-${index}`);
            }
            // Strip off trailing null char
            value = value.slice(0, -1);
        }

        return value;
    }

    public async save(key: string, value: string): Promise<void> {
        // Calculate max credential length before Base64 encoding
        const maxCredentialLength = Math.ceil(ConfigVault.MAX_CREDENTIAL_LENGTH * 0.75) - 4;
        if (process.platform === "win32" && value.length > maxCredentialLength) {
            value += '\0';
            let index = 1;
            while (value.length > 0) {
                const newKey = (index > 1) ? `${key}-${index}` : key;
                await this._vault.save(newKey, value.slice(0, maxCredentialLength));
                value = value.slice(maxCredentialLength);
                index++;
            }
        } else {
            await this._vault.save(key, value);
        }
    }
}
