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

import { ImperativeConfig } from "../ImperativeConfig";
import { Logger } from "../../../logger";

export class ConfigManagementFacility {
    //
    private static mInstance: ConfigManagementFacility;

    /**
     * Used for internal imperative logging.
     *
     * @private
     * @type {Logger}
     */
    private impLogger: Logger = Logger.getImperativeLogger();

    public static get instance(): ConfigManagementFacility {
        if (this.mInstance == null) {
            this.mInstance = new ConfigManagementFacility();
        }

        return this.mInstance;
    }

    public init(): void {
        this.impLogger.debug("ConfigManagementFacility.init() - Start");

        // Add the config group and related commands.
        ImperativeConfig.instance.addCmdGrpToLoadedConfig({
            name: "config",
            type: "group",
            description: "Manage configuration and overrides",
            children: [
                // require("./cmd/get/get.definition").getDefinition,
                require("./cmd/set/set.definition").setDefinition,
                // require("./cmd/reset/reset.definition").resetDefinition,
            ]
        });

        this.impLogger.debug("ConfigManagementFacility.init() - Success");
    }
}
