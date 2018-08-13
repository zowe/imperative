/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

/**
 * Mock PMFConstants class
 */
export class PMFConstants {
  private static mInstance: PMFConstants;

  public static get instance(): PMFConstants {
    if (PMFConstants.mInstance == null) {
      PMFConstants.mInstance = new PMFConstants();
    }

    return PMFConstants.mInstance;
  }

  public readonly PMF_ROOT: string;
  public readonly PLUGIN_JSON: string;
  public readonly PLUGIN_INSTALL_LOCATION: string;
  public readonly PLUGIN_NODE_MODULE_LOCATION: string;

  constructor() {
    this.PMF_ROOT = "/sample-cli/home/plugins/";
    this.PLUGIN_JSON = this.PMF_ROOT + "plugins.json";
    this.PLUGIN_INSTALL_LOCATION = "/sample-cli/install";
    this.PLUGIN_NODE_MODULE_LOCATION = `${this.PLUGIN_INSTALL_LOCATION}/lib/node_modules`;
  }
}
