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

// for imperative operations
import { ICredentialManagerNameMap } from "./doc/ICredentialManagerNameMap";

/**
 * This class provides access to the known set of credential manager overrides.
 * These are credential managers that can replace the default credential manager.
 */
export class CredentialManagerNameMap {
    private static readonly DEFAULT_CRED_MGR_NAME: string = "@zowe/cli";

    private static readonly KNOWN_CRED_MGRS: ICredentialManagerNameMap[] = [
        {
            "credMgDisplayName": this.DEFAULT_CRED_MGR_NAME
        },
        {
            "credMgDisplayName": "Kubernetes Secrets",
            "credMgrPluginName": "@zowe/secrets-for-kubernetes-for-zowe-cli",
            "credMgrZEName": "Zowe.secrets-for-kubernetes"
        }
    ];

    /**
     * Get the known credential managers.
     *
     * @returns An array of credential managers.
     */
    public static getKnownCredMgrs() : ICredentialManagerNameMap[] {
        return this.KNOWN_CRED_MGRS;
    }

}
