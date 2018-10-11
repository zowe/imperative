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

import {CliUtils} from "../src/CliUtils";

describe("CliUtils", () => {

    it("should be able to produce the --dash-form of any options", () => {
        // correct uses
        expect(CliUtils.getDashFormOfOption("some-option")).toMatchSnapshot();
        expect(CliUtils.getDashFormOfOption("s")).toMatchSnapshot();

        // edge cases (nothing breaks, no error, just tons of dashes)
        expect(CliUtils.getDashFormOfOption("-some-option")).toMatchSnapshot();
        expect(CliUtils.getDashFormOfOption("--some-option")).toMatchSnapshot();
        expect(CliUtils.getDashFormOfOption("-s")).toMatchSnapshot();
        expect(CliUtils.getDashFormOfOption("--s")).toMatchSnapshot();

        // empty cases
        expect(() => {
            CliUtils.getDashFormOfOption("");
        }).toThrowErrorMatchingSnapshot();

    });

    it("should return the proper option format", () => {
        expect(CliUtils.getOptionFormat("hello-world")).toEqual({
            key: "hello-world",
            camelCase: "helloWorld",
            kebabCase: "hello-world"
        });

        expect(CliUtils.getOptionFormat("helloWorld")).toEqual({
            key: "helloWorld",
            camelCase: "helloWorld",
            kebabCase: "hello-world"
        });

        expect(CliUtils.getOptionFormat("hello--------world")).toEqual({
            key: "hello--------world",
            camelCase: "helloWorld",
            kebabCase: "hello-world"
        });

        expect(CliUtils.getOptionFormat("hello-World-")).toEqual({
            key: "hello-World-",
            camelCase: "helloWorld",
            kebabCase: "hello-world"
        });

        expect(CliUtils.getOptionFormat("hello-World-----------")).toEqual({
            key: "hello-World-----------",
            camelCase: "helloWorld",
            kebabCase: "hello-world"
        });
    });

    it("should return environment value for kabab-style option", () => {
        const expectedEnvVarValue = "The value for kabab-style option";
        process.env.MYENVPREFIX_OPT_MY_OPTION = expectedEnvVarValue;

        const recvEnvValue = CliUtils.getEnvValForOption("MYENVPREFIX",
            "my-option"
        );
        expect(recvEnvValue).toEqual(expectedEnvVarValue);
    });

    it("should return environment value for camelCase option", () => {
        const expectedEnvVarValue = "The value for camelCase option";
        process.env.MYENVPREFIX_OPT_MY_OPTION = expectedEnvVarValue;

        const recvEnvValue = CliUtils.getEnvValForOption("MYENVPREFIX",
            "myOption"
        );
        expect(recvEnvValue).toEqual(expectedEnvVarValue);
    });

    it("should not alter the environment prefix", () => {
        const expectedEnvVarValue = "The value for camelCase-kabab prefix";
        process.env["camelCase-kabab-Prefix_OPT_MY_OPTION"] = expectedEnvVarValue;

        const recvEnvValue = CliUtils.getEnvValForOption("camelCase-kabab-Prefix",
            "my-option"
        );
        expect(recvEnvValue).toEqual(expectedEnvVarValue);
    });

    it("should return NULL when environment variable does not exist", () => {
        const recvEnvValue = CliUtils.getEnvValForOption("MYENVPREFIX",
            "not-set-in-env"
        );
        expect(recvEnvValue).toEqual(null);
    });
});
