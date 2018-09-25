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

import {Imperative} from "../../../imperative/src/Imperative";
import {ImperativeConfig} from "../../../imperative/src/ImperativeConfig";
import { ICommandHandler, IHandlerParameters } from "../../../cmd";
/**
 * The default command handler for the top level/root command
 * Allows the user to check the version of the package.
 * If they haven't specified --version, the help prints
 */
export default class DefaultRootCommandHandler implements ICommandHandler {
    public async process(params: IHandlerParameters) {
        // if --version is specified
        if (params.arguments.version) {
            // load the user's package.json to check the version of their package
            const packageJson: any = ImperativeConfig.instance.callerPackageJson;
            const versionString =
                params.response.console.log(packageJson.version);
            params.response.data.setObj({ version: versionString });
            params.response.data.setMessage("Version displayed");
        } else {
            params.response.console.log(Buffer.from(Imperative.getHelpGenerator({
                commandDefinition: params.definition,
                fullCommandTree: params.fullDefinition,
                experimentalCommandsDescription: ImperativeConfig.instance.loadedConfig.experimentalCommandDescription
            }).buildHelp()));
        }
    }
}
