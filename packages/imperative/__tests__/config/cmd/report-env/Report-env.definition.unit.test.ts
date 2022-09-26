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

import { ICommandDefinition } from "../../../../../cmd/src/doc/ICommandDefinition";

describe("report-env command definition", () => {
    it("should have the right command content", () => {
        const numOfDaemonCmds = 0;
        const definition: ICommandDefinition = require("../../../../src/config/cmd//report-env/report-env.definition");
        expect(definition).toBeDefined();
        expect(definition).toMatchSnapshot();
    });
});
