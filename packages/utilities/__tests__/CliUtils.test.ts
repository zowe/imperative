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

import { CliUtils } from "../src/CliUtils";
import { CommandProfiles, ICommandOptionDefinition } from "../../cmd";
import { IProfile } from "../../profiles";
import { ImperativeError } from "../../error";

describe("CliUtils", () => {
    describe("buildBaseArgs", () => {
        it("should preserve the _ and $0 properties", () => {
            const args = CliUtils.buildBaseArgs({_: ["cmd1", "cmd2"], $0: "test exe"});
            expect(args).toMatchSnapshot();
        });

        it("should remove properties that are set to undefined", () => {
            const args = CliUtils.buildBaseArgs({_: ["cmd1", "cmd2"], $0: "test exe", test: undefined});
            expect(args).toMatchSnapshot();
        });

        it("should preserve already set properties (that are not undefined)", () => {
            const args = CliUtils.buildBaseArgs({_: ["cmd1", "cmd2"], $0: "test exe", test: true});
            expect(args).toMatchSnapshot();
        });
    });
    describe("getOptValueFromProfiles", () => {

        const FAKE_OPTS: ICommandOptionDefinition[] = [{
            name: "fake-string-opt",
            description: "a fake opt",
            type: "string"
        }, {
            name: "nohyphen",
            description: "a fake opt",
            type: "string"
        }, {
            name: "couldBeEither",
            description: "a fake opt",
            type: "string"
        },
        {
            name: "with-alias",
            description: "a fake opt",
            type: "string",
            aliases: ["w"]
        }];

        it("should throw an imperative error if a required profile is not present", () => {
            let error;
            try {
                const args = CliUtils.getOptValueFromProfiles(
                    new CommandProfiles(new Map<string, IProfile[]>()),
                    { required: ["banana"] },
                    FAKE_OPTS);
            } catch (e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error instanceof ImperativeError).toBe(true);
            expect(error.message).toMatchSnapshot();
        });

        it("should return nothing if a profile was optional and not loaded", () => {
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(new Map<string, IProfile[]>()),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(Object.keys(args).length).toBe(0);
        });

        it("should return args (from definitions with no hyphen in name) extracted from loaded profile", () => {
            const map = new Map<string, IProfile[]>();
            map.set("banana", [{ type: "banana", name: "fakebanana", nohyphen: "specified in profile" }]);
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(map),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(args).toMatchSnapshot();
        });

        it("should return args (with both cases) extracted from loaded profile, preferring the camel case", () => {
            const map = new Map<string, IProfile[]>();
            map.set("banana", [{
                "type": "banana",
                "name": "fakebanana",
                "couldBeEither": "should be me",
                "could-be-either": "should not be me"
            }]);
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(map),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(args).toMatchSnapshot();
        });

        it("should return args (with both cases) extracted from loaded profile, preferring the kebab case", () => {
            const map = new Map<string, IProfile[]>();
            map.set("banana", [{
                "type": "banana",
                "name": "fakebanana",
                "fakeStringOpt": "should not be me",
                "fake-string-opt": "should be me"
            }]);
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(map),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(args).toMatchSnapshot();
        });

        it("should return args with both cases, if the option is camel and the profile is kebab", () => {
            const map = new Map<string, IProfile[]>();
            map.set("banana", [{
                "type": "banana",
                "name": "fakebanana",
                "could-be-either": "should be me"
            }]);
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(map),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(args).toMatchSnapshot();
        });

        it("should return args with both cases, if the option is kebab and the profile is camel", () => {
            const map = new Map<string, IProfile[]>();
            map.set("banana", [{
                type: "banana",
                name: "fakebanana",
                fakeStringOpt: "should be me"
            }]);
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(map),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(args).toMatchSnapshot();
        });

        it("should return args with aliases if extracted option from a profile", () => {
            const map = new Map<string, IProfile[]>();
            map.set("banana", [{
                type: "banana",
                name: "fakebanana",
                withAlias: "should have 'w' on args object too"
            }]);
            const args = CliUtils.getOptValueFromProfiles(
                new CommandProfiles(map),
                { optional: ["banana"] },
                FAKE_OPTS);
            expect(args).toMatchSnapshot();
        });
    });

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
