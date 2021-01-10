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

import { DaemonUtils } from "../src/DaemonUtils";

describe("DaemonUtils tests", () => {

    it("should build a default header response with no options", () => {
        const daemonHeader = DaemonUtils.buildHeader({});
        expect(daemonHeader).toMatchSnapshot();
    });

    it("should build a default header response with explicit values that match defaults", () => {
        const daemonHeader = DaemonUtils.buildHeader({
            exitCode: 0,
            stdout: true,
            stderr: false,
            prompt: 0
        });
        expect(daemonHeader).toMatchSnapshot();
    });

    it("should build a default header response with explicit values that are different than defaults", () => {
        const daemonHeader = DaemonUtils.buildHeader({
            exitCode: 1,
            stdout: false,
            stderr: true,
            prompt: 1
        });
        expect(daemonHeader).toMatchSnapshot();
    });
});
