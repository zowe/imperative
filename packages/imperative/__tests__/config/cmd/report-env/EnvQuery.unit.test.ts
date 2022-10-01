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

import * as path from "path";

import { ImperativeConfig } from "../../../../../utilities";
import { EnvQuery, IGetItemVal } from "../../../../src/config/cmd/report-env/EnvQuery";
import { ItemId } from "../../../../src/config/cmd/report-env/EnvItems";

describe("Tests for EnvQuery module", () => {

    afterEach(() => {
        // Mocks need cleared after every test for clean test runs
        jest.resetAllMocks();
    });

    describe("test getEnvItemVal function", () => {
        const impCfg: ImperativeConfig = ImperativeConfig.instance;

        // fake values
        const fakeDir = "this_is_a_fake_cli_home_dir";
        const configLocOutput = `
            dir1/zowe.config.json:
            other stuff 1
            other stuff 2
            dir2/zowe.config.json:
            dir2/zowe.config.user.json:
        `;
        const configProfilesOutput = `
            zosmf_profile
            tso_profile
            endevor_profile
            jclcheck_profile
            cics_profile
        `;
        const configListOutput =
            "my_zosmf_profile:\n" +
            "    type:       zosmf\n" +
            "    properties:\n" +
            "    host:                 usilca31.lvn.broadcom.net\n" +
            "    port:                 1443\n" +
            "    responseFormatHeader: true\n" +
            "defaults:\n" +
            "  base:     my_base_profile\n" +
            "  zosmf:    my_zosmf_profile\n" +
            "  jclcheck: my_jck_profile\n" +
            "  tso:      my_tso_profile\n" +
            "  cics:     my_cics_profile\n" +
            "autoStore: true\n"
        ;

        it("should report the zowe version", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_VER);
            expect(itemObj.itemVal).toMatch(/[0-9]+.[0-9]+.[0-9]+/);
            expect(itemObj.itemValMsg).toContain("Zowe CLI version =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the NodeJs version", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.NODEJS_VER);
            expect(itemObj.itemVal).toMatch(/[0-9]+.[0-9]+.[0-9]+/);
            expect(itemObj.itemValMsg).toContain("NodeJS version =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the NVM version", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.NVM_VER);
            if (itemObj.itemVal.length !== 0) {
                expect(itemObj.itemVal).toMatch(/[0-9]+.[0-9]+.[0-9]+/);
                expect(itemObj.itemValMsg).toContain("Node Version Manager version =");
            }
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the platform", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.PLATFORM);
            expect(itemObj.itemVal === "win32" || itemObj.itemVal === "linux" || itemObj.itemVal === "darwin").toBeTruthy();
            expect(itemObj.itemValMsg).toContain("O.S. platform =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the architecture", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ARCHITECTURE);
            expect(
                itemObj.itemVal === "arm"   || itemObj.itemVal === "arm64"  || itemObj.itemVal === "ia32" ||
                itemObj.itemVal === "mips"  || itemObj.itemVal === "mipsel" || itemObj.itemVal === "ppc" ||
                itemObj.itemVal === "ppc64" || itemObj.itemVal === "s390"   || itemObj.itemVal === "s390x" ||
                itemObj.itemVal === "x64"
            ).toBeTruthy();
            expect(itemObj.itemValMsg).toContain("O.S. architecture =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the OS command path", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.OS_PATH);
            expect(itemObj.itemVal).toContain(path.sep + "nodejs");
            expect(itemObj.itemValMsg).toContain("O.S. PATH =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the ZOWE_CLI_HOME", async () => {
            // cliHome is a getter property, so mock the property
            const fakeDir = "this_is_a_fake_cli_home_dir";
            Object.defineProperty(impCfg, "cliHome", {
                configurable: true,
                get: jest.fn(() => {
                    return fakeDir;
                })
            });

            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_CLI_HOME);
            expect(itemObj.itemVal).toContain("undefined");
            expect(itemObj.itemVal).toContain("Default = " + fakeDir);
            expect(itemObj.itemValMsg).toContain("ZOWE_CLI_HOME =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report an undefined ZOWE_APP_LOG_LEVEL", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_APP_LOG_LEVEL);
            expect(itemObj.itemVal).toBeUndefined();
            expect(itemObj.itemValMsg).toContain("ZOWE_APP_LOG_LEVEL = undefined");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report a valid ZOWE_APP_LOG_LEVEL", async () => {
            const logLevVal = "error";
            process.env.ZOWE_APP_LOG_LEVEL = logLevVal;
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_APP_LOG_LEVEL);
            expect(itemObj.itemVal).toBe(logLevVal);
            expect(itemObj.itemValMsg).toBe("ZOWE_APP_LOG_LEVEL = " + logLevVal);
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report a bogus ZOWE_APP_LOG_LEVEL", async () => {
            const logLevVal = "bogus";
            process.env.ZOWE_APP_LOG_LEVEL = logLevVal;
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_APP_LOG_LEVEL);
            expect(itemObj.itemVal).toBe(logLevVal);
            expect(itemObj.itemValMsg).toBe("ZOWE_APP_LOG_LEVEL = " + logLevVal);
            expect(itemObj.itemProbMsg).toContain("The ZOWE_APP_LOG_LEVEL must be set to one of:");
        });

        it("should report a valid ZOWE_IMPERATIVE_LOG_LEVEL", async () => {
            const logLevVal = "warn";
            process.env.ZOWE_IMPERATIVE_LOG_LEVEL = logLevVal;
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_IMPERATIVE_LOG_LEVEL);
            expect(itemObj.itemVal).toBe(logLevVal);
            expect(itemObj.itemValMsg).toBe("ZOWE_IMPERATIVE_LOG_LEVEL = " + logLevVal);
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report other Zowe variables", async () => {
            const newVarVal = "NewZoweVar";
            const otherVarVal = "OtherZoweVar";
            process.env.ZOWE_SOME_NEW_VAR  = newVarVal;
            process.env.ZOWE_SOME_OTHER_VAR = otherVarVal;
            process.env.ZOWE_PASSWORD_VAR = "ThisShouldBeASecret";

            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.OTHER_ZOWE_VARS);
            expect(itemObj.itemVal).toBeNull();
            expect(itemObj.itemValMsg).toContain("ZOWE_SOME_NEW_VAR = " + newVarVal);
            expect(itemObj.itemValMsg).toContain("ZOWE_SOME_OTHER_VAR = " + otherVarVal);
            expect(itemObj.itemValMsg).toContain("ZOWE_PASSWORD_VAR = " + "******");
            expect(itemObj.itemProbMsg).toBe("");

            delete  process.env.ZOWE_SOME_NEW_VAR;
            delete process.env.ZOWE_SOME_OTHER_VAR;
            delete process.env.ZOWE_PASSWORD_VAR;
        });

        it("should report that no other Zowe variables are set", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.OTHER_ZOWE_VARS);
            expect(itemObj.itemVal).toBeNull();
            expect(itemObj.itemValMsg).toContain("No other 'ZOWE_' variables have been set.");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report the NPM Version", async () => {
            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.NPM_VER);
            expect(itemObj.itemVal).toMatch(/[0-9]+.[0-9]+.[0-9]+/);
            expect(itemObj.itemValMsg).toContain("NPM version =");
            expect(itemObj.itemValMsg).toContain("Shell =");
            expect(itemObj.itemValMsg).toContain("Global prefix =");
            expect(itemObj.itemValMsg).toContain("The directory above contains the Zowe NodeJs command script.");
            expect(itemObj.itemValMsg).toContain("Global root node modules =");
            expect(itemObj.itemValMsg).toContain("Global config =");
            expect(itemObj.itemValMsg).toContain("Local prefix =");
            expect(itemObj.itemValMsg).toContain("Local root node modules =");
            expect(itemObj.itemValMsg).toContain("User config =");
            expect(itemObj.itemValMsg).toContain("registry =");
            expect(itemObj.itemValMsg).toContain("cwd =");
            expect(itemObj.itemValMsg).toContain("HOME =");
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report Zowe V2 configuration info", async () => {
            // set ImperativeConfig properties to what we want
            Object.defineProperty(impCfg, "config", {
                configurable: true,
                get: jest.fn(() => {
                    return {
                        exists: true
                    };
                })
            });
            Object.defineProperty(impCfg, "cliHome", {
                configurable: true,
                get: jest.fn(() => {
                    return fakeDir;
                })
            });
            (impCfg.loadedConfig as any) = { daemonMode: false };

            // return the values that we want from external commands
            const createStdinStreamSpy = jest.spyOn(EnvQuery as any, "getCmdOutput")
                .mockReturnValueOnce(configLocOutput)
                .mockReturnValueOnce(configProfilesOutput)
                .mockReturnValueOnce(configListOutput);

            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_CONFIG_TYPE);
            expect(itemObj.itemVal).toContain("V2 Team Config");
            expect(itemObj.itemValMsg).toContain("Zowe daemon mode = off");
            expect(itemObj.itemValMsg).toContain("Zowe config type = V2 Team Config");
            expect(itemObj.itemValMsg).toContain("Team config files in effect:");
            expect(itemObj.itemValMsg).toContain("dir1/zowe.config.json:");
            expect(itemObj.itemValMsg).toContain("dir2/zowe.config.json:");
            expect(itemObj.itemValMsg).toContain("dir2/zowe.config.user.json:");
            expect(itemObj.itemValMsg).toMatch(/base: +my_base_profile/);
            expect(itemObj.itemValMsg).toMatch(/zosmf: +my_zosmf_profile/);
            expect(itemObj.itemValMsg).toMatch(/jclcheck: +my_jck_profile/);
            expect(itemObj.itemValMsg).toMatch(/tso: +my_tso_profile/);
            expect(itemObj.itemValMsg).toMatch(/cics: +my_cics_profile/);
            expect(itemObj.itemProbMsg).toBe("");
        });

        it("should report when daemon is on", async () => {
            // set ImperativeConfig properties to what we want
            Object.defineProperty(impCfg, "config", {
                configurable: true,
                get: jest.fn(() => {
                    return {
                        exists: true
                    };
                })
            });
            Object.defineProperty(impCfg, "cliHome", {
                configurable: true,
                get: jest.fn(() => {
                    return fakeDir;
                })
            });
            (impCfg.loadedConfig as any) = { daemonMode: true };

            // return the values that we want from external commands
            const exeVer = "1.2.3";
            const createStdinStreamSpy = jest.spyOn(EnvQuery as any, "getCmdOutput")
                .mockReturnValueOnce(exeVer)
                .mockReturnValueOnce(configLocOutput)
                .mockReturnValueOnce(configProfilesOutput)
                .mockReturnValueOnce(configListOutput);

            const itemObj: IGetItemVal = await EnvQuery.getEnvItemVal(ItemId.ZOWE_CONFIG_TYPE);
            expect(itemObj.itemVal).toContain("V2 Team Config");
            expect(itemObj.itemValMsg).toContain("Zowe daemon mode = on");
            expect(itemObj.itemValMsg).toContain("Zowe daemon executable version = " + exeVer);
            expect(itemObj.itemValMsg).toMatch(/Default Zowe daemon executable directory = this_is_a_fake_cli_home_dir.bin/);
            expect(itemObj.itemProbMsg).toBe("");
        });

        /* TODO: Add tests for v1 profiles. This test does not work yet.
        it("should report Zowe V1 configuration info", async () => {
            // set ImperativeConfig properties to what we want
            Object.defineProperty(impCfg, "config", {
                configurable: true,
                get: jest.fn(() => {
                    return {
                        exists: false
                    };
                })
            });
            Object.defineProperty(impCfg, "cliHome", {
                configurable: true,
                get: jest.fn(() => {
                    return fakeDir;
                })
            });
            (impCfg.loadedConfig as any) = { daemonMode: false };

            const itemObj: IGetItemVal = EnvQuery.getEnvItemVal(ItemId.ZOWE_CONFIG_TYPE);
            expect(itemObj.itemVal).toContain("V1 Team Config");
            expect(itemObj.itemValMsg).toContain("zzz");
            expect(itemObj.itemProbMsg).toBe("");
        });
        TODO: */
    }); // end getEnvItemVal function
}); // end Handler
