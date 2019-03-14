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

import { CommandPreparer, ICommandDefinition } from "../../../cmd";
import { IImperativeConfig } from "../doc/IImperativeConfig";

export class ImperativeConfig {
    private static mInstance: ImperativeConfig = null;
    private mLoadedConfig: IImperativeConfig = {
        name: "test-cli",
        allowConfigGroup: false,
        allowPlugins: false,
        overrides: {
            CredentialManager: "some-string.ts"
        },
        experimentalCommandDescription: "The quick brown fox jumped over the lazy dog!"
    };

    // Private so that tests can access and change the result of the get
    private mHostPackageName = "host-package";

    // Private so that tests can access and change the result of the get
    private mImperativePackageName = "@zowe/imperative";

    public static get instance(): ImperativeConfig {
        if (this.mInstance == null) {
          this.mInstance = new ImperativeConfig();
        }

        return this.mInstance;
    }

    public get callerPackageJson(): any {
         return {version: 10000, name: "sample"};
    }

    public get cliHome(): string {
        return "/home";
    }

    public findPackageBinName(): string {
        return "MockCmdNameFromPkgBin";
    }

    public get loadedConfig(): IImperativeConfig {
      return this.mLoadedConfig;
    }

    public set loadedConfig(config: IImperativeConfig) {
      this.mLoadedConfig = config;
    }

    public get resolvedCmdTree(): ICommandDefinition {
      return {
        name: "mockCmdTreeName",
        description: "Mock resolved command tree description",
        type: "group",
        children: [
          {
            name: "cmdFromCli",
            description: "dummy command",
            type: "command",
            handler: "./lib/cmd/someCmd/someCmd.handler"
          }
        ]
      };
    }

    public getPreparedCmdTree(resolvedCmdTree: ICommandDefinition): ICommandDefinition {
      return {
        name: "mockCmdTreeName",
        description: "Mock resolved command tree description",
        type: "group",
        children: [
          {
            name: "cmdFromCli",
            description: "dummy command",
            type: "command",
            handler: "./lib/cmd/someCmd/someCmd.handler"
          }
        ]
      };
    }

    public get hostPackageName(): string {
        return this.mHostPackageName;
    }

    public get imperativePackageName(): string {
        return this.mImperativePackageName;
    }
}
