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

import { ICommandHandler, IHandlerParameters } from "../../../../../../../packages/index";

/**
 * Syntax test handler. Invoked if the syntax for the command is correct.
 * @export
 * @class ValidationTestCommand
 * @implements {ICommandHandler}
 */
export default class ValidationTestCommand implements ICommandHandler {
    public async process(commandParameters: IHandlerParameters) {
        commandParameters.response.console.log("Color: " + commandParameters.arguments.color);
        commandParameters.response.console.log("Description: " + commandParameters.arguments.bananaDescription);
        commandParameters.response.console.log("Mold type: " + commandParameters.arguments.moldType);
        commandParameters.response.console.log("Sweetness: " + commandParameters.arguments.sweetness);
    }
}
