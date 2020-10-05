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

import { ICommandHandler, IHandlerParameters } from "../../../../../../cmd";
import { ImperativeConfig } from "../../../../../../utilities";


/**
 * The get command group handler for cli configuration settings.
 *
 */
export default class PathsHandler implements ICommandHandler {

    /**
     * Process the command and input.
     *
     * @param {IHandlerParameters} params Parameters supplied by yargs
     *
     * @throws {ImperativeError}
     */
    public async process(params: IHandlerParameters): Promise<void> {
        const paths = ImperativeConfig.instance.configPaths;
        params.response.data.setObj(paths);
        params.response.format.output({
            output: paths,
            format: "list"
        });
    }
}
