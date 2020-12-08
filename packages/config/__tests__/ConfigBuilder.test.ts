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

import { IImperativeConfig } from "../..";
import { Config, ConfigBuilder, IConfig } from "../";
import { IProfileProperty } from "../../profiles";
import * as config from "../../../__tests__/__integration__/imperative/src/imperative"
import * as lodash from "lodash";

const expectedConfigObject = {
    defaults: {},
    plugins: [],
    profiles: {
        my_secured: {
            properties: {},
            type: "secured"
        }
    },
    secure: []
};

function promptForProp(propName: string, property: IProfileProperty): Promise<any> {
    return new Promise((resolve, reject) => {
        resolve("fake value");
    });
}

function buildProfileProperty(name: string, type: string | Array<string>, missingOptDef: boolean = false) {
    if (missingOptDef === true) {
        return {
            type,
            includeInTemplate: true,
            optionDefinition: null
        }
    } else {
        return {
            type,
            includeInTemplate: true,
            optionDefinition: {
                name,
                description: "The info the keep in the profile.",
                type,
                required: true,
            }
        }
    }
}

describe("Config Builder tests", () => {
    let configEmptySpy;
    let getDefaultValueSpy;
    let hoistTemplatePropertiesSpy;
    let expectedConfig;
    let testConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        configEmptySpy = jest.spyOn(Config, "empty");
        getDefaultValueSpy = jest.spyOn(ConfigBuilder, "getDefaultValue");
        hoistTemplatePropertiesSpy = jest.spyOn(ConfigBuilder, "hoistTemplateProperties");
        expectedConfig = lodash.cloneDeep(expectedConfigObject);
        testConfig = lodash.cloneDeep(config as IImperativeConfig);
    });

    describe("build", () => {

        it("should build a config without populating properties", async () => {
            const builtConfig = await ConfigBuilder.build(testConfig);
            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(0); // Not populating any properties
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(0);
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config and populate properties", async () => {
            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true});
            expectedConfig.profiles.my_secured.properties.info = "";
            expectedConfig.secure.push("profiles.my_secured.properties.secret");
            expectedConfig.defaults.secured = "my_secured";
            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(1); // Populating default value for info
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(0);
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config, populate properties, and securely load a file", async () => {
            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true, getSecureValue: promptForProp});
            expectedConfig.profiles.my_secured.properties.info = "";
            expectedConfig.profiles.my_secured.properties.secret = "fake value";
            expectedConfig.secure.push("profiles.my_secured.properties.secret");
            expectedConfig.defaults.secured = "my_secured";
            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(1); // Populating default value for info
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(0);
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config and populate properties, even option with missing option definition", async () => {
            testConfig.profiles[0].schema.properties.fakestr = buildProfileProperty("fakestr", "string", true);
            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true});
            expectedConfig.profiles.my_secured.properties.info = "";
            expectedConfig.profiles.my_secured.properties.fakestr = "";
            expectedConfig.secure.push("profiles.my_secured.properties.secret");
            expectedConfig.defaults.secured = "my_secured";
            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(2); // Populating default value for info, fakestr
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(0);
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config and populate many empty properties", async () => {
            testConfig.profiles[0].schema.properties.fakestr = buildProfileProperty("fakestr", "string");
            testConfig.profiles[0].schema.properties.fakenum = buildProfileProperty("fakenum", "number");
            testConfig.profiles[0].schema.properties.fakeobj = buildProfileProperty("fakeobj", "object");
            testConfig.profiles[0].schema.properties.fakearr = buildProfileProperty("fakearr", "array");
            testConfig.profiles[0].schema.properties.fakebool = buildProfileProperty("fakebool", "boolean");
            testConfig.profiles[0].schema.properties.fakedflt = buildProfileProperty("fakedflt", "IShouldntExist");

            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true});
            expectedConfig.profiles.my_secured.properties.info = "";
            expectedConfig.profiles.my_secured.properties.fakestr = "";
            expectedConfig.profiles.my_secured.properties.fakenum = 0;
            expectedConfig.profiles.my_secured.properties.fakeobj = {};
            expectedConfig.profiles.my_secured.properties.fakearr = [];
            expectedConfig.profiles.my_secured.properties.fakebool = false;
            expectedConfig.profiles.my_secured.properties.fakedflt = null;
            expectedConfig.secure.push("profiles.my_secured.properties.secret");
            expectedConfig.defaults.secured = "my_secured";

            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            // tslint:disable-next-line: no-magic-numbers
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(7); // Populating default value for info, fakestr, fakenum, fakeobj, fakearr, fakebool
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(0);
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config and populate an empty property that can have multiple types", async () => {
            testConfig.profiles[0].schema.properties.fakestr = buildProfileProperty("fakestr", ["string", "number", "boolean"]);

            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true});
            expectedConfig.profiles.my_secured.properties.info = "";
            expectedConfig.profiles.my_secured.properties.fakestr = "";
            expectedConfig.secure.push("profiles.my_secured.properties.secret");
            expectedConfig.defaults.secured = "my_secured";

            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            // tslint:disable-next-line: no-magic-numbers
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(2); // Populating default value for info, fakestr
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(0);
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config with a base profile", async () => {
            testConfig.baseProfile = {
                type: "base",
                schema: {
                    type: "object",
                    title: "Base Profile",
                    description: "Base profile that stores values shared by multiple service profiles",
                    properties: {host: buildProfileProperty("host", "string")}
                }
            };
            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true});
            delete expectedConfig.profiles.my_secured;
            expectedConfig.profiles.my_profiles = {properties: {}, profiles: {secured: {type: "secured", properties: {}}}};
            expectedConfig.profiles.my_profiles.profiles.secured.properties.info = "";
            expectedConfig.secure.push("profiles.my_profiles.profiles.secured.properties.secret");
            expectedConfig.defaults.secured = "my_profiles.secured";

            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            // tslint:disable-next-line: no-magic-numbers
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(1); // Populating default value for info
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(1); // Hoisting host property from base profile
            expect(builtConfig).toEqual(expectedConfig);
        });

        it("should build a config with a base profile and profiles with a duplicated property", async () => {
            testConfig.baseProfile = {
                type: "base",
                schema: {
                    type: "object",
                    title: "Base Profile",
                    description: "Base profile that stores values shared by multiple service profiles",
                    properties: {host: buildProfileProperty("host", "string")}
                }
            };
            testConfig.profiles[0].schema.properties.host = buildProfileProperty("host", "string");
            testConfig.profiles[1] = lodash.cloneDeep(testConfig.profiles[0]);
            testConfig.profiles[1].type = "securedClone";
            const builtConfig = await ConfigBuilder.build(testConfig, {populateProperties: true});
            delete expectedConfig.profiles.my_secured;
            expectedConfig.profiles.my_profiles = {properties: {host: "", info: ""}, profiles: {secured: {type: "secured", properties: {}},
                                                                                                securedClone: {type: "securedClone", properties: {}}
            }};
            expectedConfig.secure.push("profiles.my_profiles.profiles.secured.properties.secret");
            expectedConfig.secure.push("profiles.my_profiles.profiles.securedClone.properties.secret");
            expectedConfig.defaults.secured = "my_profiles.secured";
            expectedConfig.defaults.securedClone = "my_profiles.securedClone";

            expect(configEmptySpy).toHaveBeenCalledTimes(1);
            // tslint:disable-next-line: no-magic-numbers
            expect(getDefaultValueSpy).toHaveBeenCalledTimes(4); // Populating default value for info and host of each profile
            expect(hoistTemplatePropertiesSpy).toHaveBeenCalledTimes(1); // Hoisting host property from base profile
            expect(builtConfig).toEqual(expectedConfig);
        });
    });
});
