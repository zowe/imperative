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

import { Logger } from "../../../../../packages/logger/src/Logger";
import { ProfileInfo } from "../../../../../packages/config/src/ProfileInfo";
import { Log4jsConfig } from "../src/constants/ProfileInfoConstants";
import { IProfAttrs } from "../../../../../packages";
import * as path from "path";

export class TestProfileLoader {
    private mLogger: Logger;
    private mProfileInfo: ProfileInfo;
    public projectDir: string = null;

    public appName = "test_app";
    constructor(projectDir: string) {
        this.projectDir = projectDir;
        this.mLogger = this.initLogger();
        this.mProfileInfo = new ProfileInfo(this.appName);
    }

    public initLogger(): Logger {
        const loggerConfig = Log4jsConfig;
        for (const appenderName in loggerConfig.log4jsConfig.appenders) {
            loggerConfig.log4jsConfig.appenders[appenderName].filename = path.join(
                this.projectDir, Log4jsConfig.log4jsConfig.appenders[appenderName].filename);
        }
        Logger.initLogger(loggerConfig);
        return Logger.getAppLogger();
    }

    public async defaultProfile() {
        await this.mProfileInfo.readProfilesFromDisk({ projectDir: this.projectDir });
        const profile = this.mProfileInfo.getDefaultProfile(this.appName);
        this.mLogger.trace("default profile:", JSON.stringify(profile));
        this.mLogger.debug("default profile:", JSON.stringify(profile));
        return profile;
    }

    public getProperties(profile: IProfAttrs) {
        return this.mProfileInfo.mergeArgsForProfile(profile, { getSecureVals: true });
    }

    public get logger(): Logger {
        return this.mLogger;
    }
}