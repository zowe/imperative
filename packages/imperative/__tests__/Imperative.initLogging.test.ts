/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

jest.mock("../src/ImperativeConfig");
jest.mock("../src/env/EnvironmentalVariableSettings");

import { Imperative } from "../src/Imperative";
import { LoggingConfigurer } from "../src/LoggingConfigurer";
import { ImperativeConfig } from "../src/ImperativeConfig";
import { Logger } from "../../logger";
import { EnvironmentalVariableSettings } from "../src/env/EnvironmentalVariableSettings";

const DEFAULT_LEVEL = "DEBUG";

describe("Imperative initLogging()", () => {

    it("should verify that imperative and log levels are changed based on environmental variable settings", async () => {
        const IMP_TEST_LEVEL = "TRACE";
        const APP_TEST_LEVEL = "TRACE"; // yum

        // pretend env var response
        (EnvironmentalVariableSettings as any).read = jest.fn( (data: string) => {
            return {
                imperativeLogLevel: {
                    key: "BRIGHT_IMPERATIVE_LOG_LEVEL",
                    value: IMP_TEST_LEVEL
                },
                appLogLevel: {
                    key: "BRIGHT_APP_LOG_LEVEL",
                    value: APP_TEST_LEVEL
                }
            };
        });

        // pretend init logging
        (Imperative as any).initLogging();

        // test
        expect((Logger.getAppLogger().level as any).levelStr).toBe(APP_TEST_LEVEL);
        expect((Logger.getImperativeLogger().level as any).levelStr).toBe(IMP_TEST_LEVEL);
    });

    it("should verify that imperative and app log levels are not changed based on missing environmental variable settings", async () => {
        // pretend env var response
        (EnvironmentalVariableSettings as any).read = jest.fn((data: string) => {
            return {
                imperativeLogLevel: {
                    key: "BRIGHT_IMPERATIVE_LOG_LEVEL",
                    value: undefined
                },
                appLogLevel: {
                    key: "BRIGHT_APP_LOG_LEVEL",
                    value: undefined
                }
            };
        });

        // pretend init logging
        (Imperative as any).initLogging();

        // test
        expect((Logger.getAppLogger().level as any).levelStr).toBe(DEFAULT_LEVEL);
        expect((Logger.getImperativeLogger().level as any).levelStr).toBe(DEFAULT_LEVEL);
    });

    it("should verify that imperative log level is changed based on environmental variable settings and app log level is not", async () => {
        const IMP_TEST_LEVEL = "TRACE";

        // pretend env var response
        (EnvironmentalVariableSettings as any).read = jest.fn((data: string) => {
            return {
                imperativeLogLevel: {
                    key: "BRIGHT_IMPERATIVE_LOG_LEVEL",
                    value: IMP_TEST_LEVEL
                },
                appLogLevel: {
                    key: "BRIGHT_APP_LOG_LEVEL",
                    value: undefined
                }
            };
        });

        // pretend init logging
        (Imperative as any).initLogging();

        // test
        expect((Logger.getAppLogger().level as any).levelStr).toBe(DEFAULT_LEVEL);
        expect((Logger.getImperativeLogger().level as any).levelStr).toBe(IMP_TEST_LEVEL);
    });

    it("should verify that app log level is changed based on environmental variable settings and imperative log level is not", async () => {
        const APP_TEST_LEVEL = "TRACE"; // yum

        // pretend env var response
        (EnvironmentalVariableSettings as any).read = jest.fn((data: string) => {
            return {
                imperativeLogLevel: {
                    key: "BRIGHT_IMPERATIVE_LOG_LEVEL",
                    value: undefined
                },
                appLogLevel: {
                    key: "BRIGHT_APP_LOG_LEVEL",
                    value: APP_TEST_LEVEL
                }
            };
        });

        // pretend init logging
        (Imperative as any).initLogging();

        // test
        expect((Logger.getAppLogger().level as any).levelStr).toBe(APP_TEST_LEVEL);
        expect((Logger.getImperativeLogger().level as any).levelStr).toBe(DEFAULT_LEVEL);
    });
});
