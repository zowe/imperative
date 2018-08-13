/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import {ICommandDefinition} from "../../../../cmd";

/* Used in Imperative.test.ts because jest appears to launch a separate
 * context for the call to 'await Imperative.init()', which in turn, calls
 * functions from the PluginManagementFacility singleton.
 * If you use simple mocks in the test program, they do not appear to
 * be in effect within the sub process, which then calls real
 * PluginManagementFacility functions. This __mocks__ file causes
 * Imperative.init() to use these mocked functions.
 */
export class PluginManagementFacility {
    private static mInstance: PluginManagementFacility = null;

    public static get instance(): PluginManagementFacility {
        if (this.mInstance == null) {
          this.mInstance = new PluginManagementFacility();
        }
        return this.mInstance;
    }

    public init(): void {
      return;
    }

    public addPluginsToHostCli(CmdTree: ICommandDefinition): void {
        return;
    }

}
