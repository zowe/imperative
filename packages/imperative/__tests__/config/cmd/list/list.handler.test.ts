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

jest.mock("../../../../../utilities/src/ImperativeConfig");

import { IConfig, IConfigLayer } from "../../../../../config";
import { ImperativeConfig } from "../../../../../utilities";
import ListHandler from "../../../../src/config/cmd/list/list.handler";

let dataObj: any;
let formatObj: any;
let errorText: string;
let logText: string;

// "Mocked" version of the handler parameters for a config list command
const handlerParms: any = {
    response: {
        data: {
            setObj: jest.fn((jsonObj) => {
                dataObj = jsonObj;
            })
        },
        format: {
            output: jest.fn((formatArgs) => {
                formatObj = formatArgs.output;
            })
        },
        console: {
            log: jest.fn((msgText) => {
                logText = msgText;
            }),
            error: jest.fn((msgText) => {
                errorText = msgText;
            })
        }
    }
};

const configLayers: IConfigLayer[] = [
    {
        exists: true,
        path: "fakePath",
        user: false,
        global: false,
        properties: {
            profiles: {
                email: {
                    properties: {
                        host: "smtp.gmail.com",
                        port: 587,
                        user: "admin",
                        password: "123456"
                    }
                }
            },
            defaults: {},
            plugins: [],
            secure: [
                "profiles.email.properties.user",
                "profiles.email.properties.password"
            ]
        }
    }
];

const configMaskedProps: IConfig = configLayers[0].properties;
configMaskedProps.profiles.email.properties.user = "(secure value)";
configMaskedProps.profiles.email.properties.password = "(secure value)";

describe("Configuration List command handler", () => {
    const configMock = jest.fn();

    beforeAll(() => {
        Object.defineProperty(ImperativeConfig.instance, "config", {
            get: configMock
        });
    });

    beforeEach(() => {
        dataObj = null;
        formatObj = null;
        errorText = null;
        logText = null;
    })

    it("should output empty object when there is no config", async () => {
        configMock.mockReturnValueOnce({
            exists: false
        });
        handlerParms.arguments = {};

        await (new ListHandler()).process(handlerParms);
        expect(errorText).toBeNull();
        expect(dataObj).toEqual({});
        expect(formatObj).toEqual(dataObj);
    });

    it("should output entire config", async () => {
        configMock.mockReturnValueOnce({
            exists: true,
            maskedProperties: configMaskedProps
        });
        handlerParms.arguments = {};

        await (new ListHandler()).process(handlerParms);
        expect(errorText).toBeNull();
        expect(dataObj).toEqual(configLayers[0].properties);
        expect(dataObj.profiles.email.properties.user).toBe("(secure value)");
        expect(dataObj.profiles.email.properties.password).toBe("(secure value)");
        expect(formatObj).toEqual(dataObj);
    });

    it("should output config property", async () => {
        configMock.mockReturnValueOnce({
            exists: true,
            maskedProperties: configMaskedProps
        });
        handlerParms.arguments = { property: "secure" };

        await (new ListHandler()).process(handlerParms);
        expect(errorText).toBeNull();
        expect(dataObj).toEqual(configLayers[0].properties.secure);
        expect(formatObj).toEqual(dataObj);
    });

    it("should output entire config listed by location", async () => {
        configMock.mockReturnValueOnce({
            exists: true,
            layers: configLayers
        });
        handlerParms.arguments = { locations: true };

        await (new ListHandler()).process(handlerParms);
        expect(errorText).toBeNull();
        expect(dataObj.fakePath).toEqual(configLayers[0].properties);
        expect(dataObj.fakePath.profiles.email.properties.user).toBe("(secure value)");
        expect(dataObj.fakePath.profiles.email.properties.password).toBe("(secure value)");
        expect(formatObj).toEqual(dataObj);
    });

    it("should output config property listed by location", async () => {
        configMock.mockReturnValueOnce({
            exists: true,
            layers: configLayers
        });
        handlerParms.arguments = { locations: true, property: "secure" };

        await (new ListHandler()).process(handlerParms);
        expect(errorText).toBeNull();
        expect(dataObj.fakePath).toEqual(configLayers[0].properties.secure);
        expect(formatObj).toEqual(dataObj);
    });

    it("should output entire config at root level", async () => {
        configMock.mockReturnValueOnce({
            exists: true,
            maskedProperties: configMaskedProps
        });
        handlerParms.arguments = { root: true };

        await (new ListHandler()).process(handlerParms);
        expect(errorText).toBeNull();
        expect(dataObj).toEqual(Object.keys(configLayers[0].properties));
        expect(formatObj).toEqual(dataObj);
    });
});
