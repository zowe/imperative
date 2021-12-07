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

import { TestProfileLoader } from "./TestProfileLoader";
import { TestAppImperativeConfig } from "../src/constants/ProfileInfoConstants";
import { CliProfileManager } from "../../../../../packages/cmd/src/profiles/CliProfileManager";
import * as path from "path";

const setupOldProfiles = async (projectDir: string) => {
    await CliProfileManager.initialize({
        configuration: TestAppImperativeConfig.profiles,
        profileRootDirectory: path.join(projectDir, "profiles"),
    });
};

/**
 * Test application for integration test purposes.
 * This test application focuses on the ProfileInfo API usage.
 * node --require "ts-node/register" <rootDir>/__tests__/src/packages/profiles/test_app/TestApp.ts <TestEnvironment.workingDir>
 * node --require "ts-node/register" /root/gh/zowe/imperative/__tests__/src/packages/profiles/test_app/TestApp.ts /root/gh/test/del/del2
 */
(async (args: string[]) => {
    const projectDir = args[2];

    // Just in case we want to write integration tests for ProfileInfo APIs for OLD profiles
    await setupOldProfiles(projectDir);

    const loader = new TestProfileLoader(projectDir);

    const profile = await loader.defaultProfile();
    loader.logger.debug("default profile:", profile);

    const mergedArgs = loader.getProperties(profile);
    loader.logger.debug("merged args:", mergedArgs);
})(process.argv);
