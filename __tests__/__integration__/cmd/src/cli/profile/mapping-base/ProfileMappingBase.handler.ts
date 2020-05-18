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
 * Test of mapping of profile fields to options
 * @export
 * @class ProfileMappingNameTypeHandler
 * @implements {ICommandHandler}
 */
export default class ProfileMappingNameTypeHandler implements ICommandHandler {
    public async process(params: IHandlerParameters) {
        params.response.console.log("Amount: " + params.arguments.amount);
        params.response.console.log("Price: " + params.arguments.price);
    }
}
