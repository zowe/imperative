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

import { ICommandHandler, IHandlerParameters, IHandlerResponseConsoleApi } from "../../../../../cmd";
import { ItemId } from "./EnvItems";
import { EnvQuery } from "./EnvQuery";
import { TextUtils } from "../../../../../utilities/src/TextUtils";

/**
 * Handler to report a user's wroking environment.
 *
 * We detect and report information from the user environment, including
 * installed 3rd party prerrequisites. We report those findings.
 *
 * We also maintain a set of known problem conditions (like broken NPM
 * versions which happen way too often). We use that data to report the
 * probelem to the customer and any known workaround.
 *
 * @export
 */
export default class ReportEnvHandler  implements ICommandHandler {
    public async process(cmdParams: IHandlerParameters): Promise<void> {
        this.displayEnvReport(cmdParams.response.console);
        cmdParams.response.data.setExitCode(0);
    }

    // __________________________________________________________________________
    /**
     * Display a report of all items of interest and any problems detected.
     *
     * @param consoleApi Console response object to which we will write messages.
     */
    private displayEnvReport(consoleApi: IHandlerResponseConsoleApi): void {
        for (const nextItemId of Object.keys(ItemId).map(
            keyVal => parseInt(keyVal)).filter(keyVal => !isNaN(keyVal)
        ))
        {
            this.displayEnvItem(nextItemId, consoleApi);
        }
        consoleApi.log("This information cantains site-specific data. Redact anything required\n" +
            "by your company before sending this information to outside companies."
        );
    }

    // __________________________________________________________________________
    /**
     * Display a specific item and any problems detected.
     *
     * @param consoleApi Console response object to which we will write messages.
     */
    private displayEnvItem(itemId: ItemId, consoleApi: IHandlerResponseConsoleApi): void {
        const getResult = EnvQuery.getEnvItemVal(itemId);
        consoleApi.log(getResult.itemValMsg);
        if (getResult.itemProbMsg.length > 0) {
            consoleApi.log(TextUtils.chalk.red("    " + getResult.itemProbMsg));
        }
    }
}
