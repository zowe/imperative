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

jest.mock("log4js");
import * as log4js from "log4js";
import {LoggingConfigurer} from "../../imperative/src/LoggingConfigurer";
import {IConfigLogging, ILog4jsConfig, Logger} from "../../logger";

import {ImperativeError} from "../../error";

import * as os from "os";
import * as path from "path";
import {IO} from "../../io";

let configuration: ILog4jsConfig;
(log4js.configure as any) = jest.fn((config: any) => {
    // console.log("config passed to configure: " + require("util").inspect(config));
    configuration = config;
});

class MockedLoggerInstance {
    private mLevel: string;

    public set level(newLevel: any) {
        this.mLevel = newLevel;
    }

    public get level(): any {
        return {
            levelStr: this.mLevel
        };
    }
}

(log4js.getLogger as any) = jest.fn((category: string) => {
        let configuredLevel = "debug";
        if (category !== null) {
            for (const configuredCategory of Object.keys(configuration.categories)) {
                if (configuredCategory === category) {
                    configuredLevel = configuration.categories[configuredCategory].level;
                }
            }
        }
        const newLogger = new MockedLoggerInstance();
        newLogger.level = configuredLevel;
        return newLogger;
    }
);

(os.homedir as any) = jest.fn(() => "/someHome");
(path.normalize as any) = jest.fn((p: string) => p);
(IO.createDirsSync as any) = jest.fn((myPath: string) => {
    // do nothing
});

const fakeHome = "/home";
const name = "sample";
describe("Logger tests", () => {
    it("Should call underlying service function", () => {
        const config = LoggingConfigurer.configureLogger(fakeHome, {name});
        const logger = Logger.initLogger(config);

        (logger as any).logService.trace = jest.fn<string>((data: string) => data);
        (logger as any).logService.info = jest.fn<string>((data: string) => data);
        (logger as any).logService.debug = jest.fn<string>((data: string) => data);
        (logger as any).logService.warn = jest.fn<string>((data: string) => data);
        (logger as any).logService.error = jest.fn<string>((data: string) => data);
        (logger as any).logService.fatal = jest.fn<string>((data: string) => data);

        logger.trace("test");
        logger.info("test");
        logger.debug("test");
        logger.warn("test");
        logger.error("test");
        logger.fatal("test");

        expect((logger as any).logService.trace).toBeCalled();
        expect((logger as any).logService.info).toBeCalled();
        expect((logger as any).logService.debug).toBeCalled();
        expect((logger as any).logService.warn).toBeCalled();
        expect((logger as any).logService.error).toBeCalled();
        expect((logger as any).logService.fatal).toBeCalled();
    });

    it("Should error if not given a config on initialization", () => {
        const expectMessage = "Input logging config document is required";
        let errorMessage = "";
        try {
            Logger.initLogger(undefined);
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).toBe(expectMessage);
    });

    it("Should error if given an incomplete config on initialization", () => {
        const expectMessage = "Input logging config is incomplete, does not contain log4jsConfig";
        let errorMessage = "";
        try {
            Logger.initLogger({});
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).toBe(expectMessage);
    });

    it("Should error if given a partially config on initialization", () => {
        const expectMessage = "Input logging config is incomplete, does not contain log4jsConfig.appenders";
        let errorMessage = "";
        try {
            const config = {log4jsConfig: {}};
            Logger.initLogger((config as IConfigLogging));
        } catch (error) {
            errorMessage = error.message;
        }
        expect(errorMessage).toBe(expectMessage);
    });

    it("Should set the level like we say", () => {
        const config = LoggingConfigurer.configureLogger(fakeHome, {name});
        const logger = Logger.initLogger(config);
        const level = logger.level;

        expect((level as any).levelStr.toUpperCase()).toMatchSnapshot();
        logger.level = "trace";
        expect((logger.level as any).levelStr.toUpperCase()).toMatchSnapshot();
    });

    it("Should call underlying services for logError function", () => {
        const config = LoggingConfigurer.configureLogger(fakeHome, {name});
        const logger = Logger.initLogger(config);

        (logger as any).logService.trace = jest.fn<string>((data: string) => data);
        (logger as any).logService.info = jest.fn<string>((data: string) => data);
        (logger as any).logService.debug = jest.fn<string>((data: string) => data);
        (logger as any).logService.warn = jest.fn<string>((data: string) => data);
        (logger as any).logService.error = jest.fn<string>((data: string) => data);
        (logger as any).logService.fatal = jest.fn<string>((data: string) => data);

        const error = new ImperativeError({msg: "sample error"});

        logger.logError(error);

        expect((logger as any).logService.trace).not.toBeCalled();
        expect((logger as any).logService.info).not.toBeCalled();
        expect((logger as any).logService.debug).toBeCalled();
        expect((logger as any).logService.warn).not.toHaveBeenCalledTimes(1);
        expect((logger as any).logService.fatal).not.toBeCalled();
        expect((logger as any).logService.error).toHaveBeenCalledTimes(2);
    });

    it("Should get the correct requested logger appender", () => {
        const config = LoggingConfigurer.configureLogger(fakeHome, {
            logging: {
                appLogging: {
                    level: "trace"
                },
                imperativeLogging: {
                    level: "error"
                }
            },
            name
        });
        Logger.initLogger(config);

        const imperative = Logger.getImperativeLogger();
        const imperativeCategory = Logger.getLoggerCategory("imperative");
        const app = Logger.getAppLogger();
        const console = Logger.getConsoleLogger();

        // these should match config
        expect((imperative.level as any).levelStr.toUpperCase()).toMatchSnapshot();
        expect((app.level as any).levelStr.toUpperCase()).toMatchSnapshot();

        // this should be identical to imperative
        expect((imperative.level as any).levelStr.toUpperCase()).toBe((imperativeCategory.level as any).levelStr.toUpperCase());
    });

});
