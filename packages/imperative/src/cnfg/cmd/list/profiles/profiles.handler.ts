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

import { IHandlerParameters } from "../../../../../../cmd";
import { Config, IConfigProfile } from "../../../../../../config";
import { ImperativeConfig } from "../../../../../../utilities";
import ListBaseHandler from "../list.base.handler";
export default class ProfilesHandler extends ListBaseHandler {
    protected property(): string {
        return "profiles";
    }

    public async process(params: IHandlerParameters): Promise<void> {
        if (!params.arguments.paths)
            return super.process(params);
        const config = Config.load(ImperativeConfig.instance.rootCommandName);
        const paths: string[] = [];
        this.build(config.properties.profiles, "", paths);
        params.response.format.output({
            format: "list",
            output: paths
        });
    }

    private build(profiles: {[key: string]: IConfigProfile}, path: string, paths: string[]) {
        for (const [n, p] of Object.entries(profiles)) {
            if (p.profiles != null)
                this.build(p.profiles, path, paths);
            else {
                path += `.${n}`;
                paths.push(path);
            }
        }
    }
}
