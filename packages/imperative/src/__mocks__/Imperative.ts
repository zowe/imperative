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

import {TextUtils} from "../../../utilities/";
import {AbstractHelpGenerator, DefaultHelpGenerator, IHelpGeneratorParms} from "../../../cmd";
import {IImperativeConfig} from "../doc/IImperativeConfig";

const PRIMARY_COLOR: string = "yellow";

export class Imperative {
    public static get loadedConfig(): IImperativeConfig {
        return this.mLoadedConfig;
    }

    // public static get callerPackageJson(): any {
    //     return {version: 10000, name: "sample"};
    // }

    // public static get cliHome(): string {
    //     return "/home";
    // }

    public static highlightWithPrimaryColor(text: string): string {
        return TextUtils.chalk[PRIMARY_COLOR](text);
    }

    public static get rootCommandName(): string {
        return "mock_command_name";
    }

    public static getHelpGenerator(parms: IHelpGeneratorParms): AbstractHelpGenerator {
        return new DefaultHelpGenerator({
                produceMarkdown: false,
                primaryHighlightColor: PRIMARY_COLOR, rootCommandName: "mock"
            },
            parms);
    }

    private static mLoadedConfig: IImperativeConfig = {
        defaultHome: "/sample-cli/home/",
        progressBarSpinner: ".oO0Oo.",
        name: "sample-cli",
        productDisplayName: "Sample CLI"
    };
}
