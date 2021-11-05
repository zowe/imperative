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

import { IImperativeConfig, Imperative } from "../../../../packages/imperative";
// load the other config
const config: IImperativeConfig = require(__dirname + "/ProfileExampleConfiguration.ts");
config.autoGenerateProfileCommands = false; // but turn off the auto generated commands

Imperative.init(config).then(() => {
    Imperative.parse();
});

