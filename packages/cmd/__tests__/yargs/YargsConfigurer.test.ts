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

import { ImperativeConfig, YargsConfigurer } from "../../..";

describe("YargsConfigurer tests", () => {
    it("should build a failure message", () => {

        const config = new YargsConfigurer({ name: "any", description: "any", type: "command", children: []},
        undefined, undefined, undefined, undefined, undefined, "fake", "fake", "ZOWE", "fake");

        ImperativeConfig.instance.commandLine = "some-command";

        const failmessage = (config as any).buildFailureMessage("apple");
        expect(failmessage).toMatchSnapshot();

    });

});
