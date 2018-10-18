/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import * as T from "../../../../../src/TestUtil";
import { cliBin } from "../PluginManagementFacility.spec";
import { join } from "path";

describe("Validate plugin", () => {
    const testPluginDir = join(__dirname, "../test_plugins");

    const removeNewline = (str: string): string => {
        str = str.replace(/\r?\n|\r/g, " ");
        return str;
    };

    describe("should validate successfully", () => {
        it("when all plugin installed successfully and no plugin name is provided", () => {
            const testPlugin = join(testPluginDir, "normal_plugin");
            const pluginName: string = "normal-plugin";
            let cmd = `plugins install ${testPlugin}`;
            let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);

            cmd = `plugins validate`;
            result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stderr).toEqual("");
            expect(result.stdout).toContain("Successfully validated.");
        });

        it("when plugin contain space in path is installed sucessfully", () => {
            const testPlugin = join(testPluginDir, "space in path plugin");
            const pluginName: string = "space-in-path-plugin";
            let result = T.executeTestCLICommand(cliBin, this, ["plugins", "install", testPlugin]);
            expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);
            const cmd = `plugins validate`;
            result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stderr).toEqual("");
            expect(result.stdout).toContain("Successfully validated.");
        });

        it("when provided plugin name is installed successfully", () => {
            const pluginName = "normal-plugin";
            const testPlugin = join(testPluginDir, "normal_plugin");
            let cmd = `plugins install ${testPlugin}`;
            let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);

            cmd = `plugins validate ${pluginName}`;
            result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stderr).toEqual("");
            expect(result.stdout).toContain("Successfully validated.");
        });

        it("when imperative object in package.json does not contains a name property", () => {
            const pluginName = "missing_name_plugin";
            const testPlugin = join(testPluginDir, "missing_name_plugin");
            let cmd = `plugins install ${testPlugin}`;
            let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);

            cmd = `plugins validate ${pluginName}`;
            result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stderr).toEqual("");
            expect(result.stdout).toContain("Successfully validated.");
        });
    });

    describe("should display proper error message", () => {
        it("when no plugin is installed", () => {
            const pluginName: string = "noninstalled-plugin";
            const cmd = `plugins validate`;
            const result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stdout).toContain("No plugins have been installed");
        });

        it("when the provided plugin is not installed", () => {
            const testPlugin = join(testPluginDir, "normal_plugin");
            const pluginName: string = "imperative-sample-plugin";
            let cmd = `plugins install ${testPlugin}`;
            let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stdout).toContain(`Installed plugin name = 'normal-plugin'`);

            cmd = `plugins validate ${pluginName}`;
            result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
            expect(result.stdout).toContain(pluginName);
            expect(result.stdout).toContain("has not been installed");
        });

        describe("when package json contains the following scenarios", () => {
            it("duplicated command name with base CLI commands", () => {
                const testPlugin = "duplicated_base_cli_command";
                const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                let cmd = `plugins install ${fullPluginPath}`;
                let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                cmd = `plugins validate ${testPlugin}`;
                result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                result.stderr = removeNewline(result.stderr);
                expect(result.stdout).toContain(testPlugin);
                expect(result.stdout).toContain("Error");
                expect(result.stdout).toContain("Your base application already contains a group with the name");
                expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
            });

            it("duplicated command name with installed plugin", () => {
                const testPlugin = "duplicated_installed_plugin_command";
                const fullPluginPath = join(testPluginDir, "error_plugins", "duplicated_installed_plugin_command");
                const normalPlugin = join(testPluginDir, "normal_plugin");

                let cmd = `plugins install ${normalPlugin} ${fullPluginPath}`;
                let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));

                expect(result.stderr).toMatch(/npm.*WARN/);
                expect(result.stderr).toContain("requires a peer of @brightside/imperative");
                expect(result.stderr).toContain("You must install peer dependencies yourself");

                expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                cmd = `plugins validate ${testPlugin}`;
                result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                result.stderr = removeNewline(result.stderr);
                expect(result.stdout).toContain(testPlugin);
                expect(result.stdout).toContain("Error");
                expect(result.stdout).toContain("Your base application already contains a group with the name");
                expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
            });

            it("missing pluginHealthCheck property", () => {
                const testPlugin = "missing_pluginHealthCheck";
                const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                let cmd = `plugins install ${fullPluginPath}`;
                let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                cmd = `plugins validate ${testPlugin}`;
                result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                result.stderr = removeNewline(result.stderr);
                expect(result.stdout).toContain(testPlugin);
                expect(result.stdout).toContain("Warning");
                expect(result.stdout).toContain("The plugin's configuration does not contain an 'imperative.pluginHealthCheck' property.");
            });

            it("missing pluginHealthCheck handler", () => {
                const testPlugin = "missing_healthcheck_handler";
                const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                let cmd = `plugins install ${fullPluginPath}`;
                let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                cmd = `plugins validate ${testPlugin}`;
                result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                result.stderr = removeNewline(result.stderr);
                expect(result.stdout).toContain(testPlugin);
                expect(result.stdout).toContain("Error");
                expect(result.stdout).toContain(`The program for the 'imperative.pluginHealthCheck' property does not exist:`);
                expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
            });

            it("missing peerDependencies properties", () => {
                const testPlugin = "missing_dependencies";
                const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                let cmd = `plugins install ${fullPluginPath}`;
                let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                cmd = `plugins validate ${testPlugin}`;
                result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                result.stderr = removeNewline(result.stderr);
                expect(result.stdout).toContain(testPlugin);
                expect(result.stdout).toContain("Warning");
                expect(result.stdout).toContain("Your @brightside dependencies must be contained within a 'peerDependencies' property." +
                    " That property does not exist in the file");
                expect(result.stdout).toContain("package.json");
            });

            it("missing rootCommandDescription property", () => {
                const testPlugin = "missing_rootCommandDescription";
                const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                let cmd = `plugins install ${fullPluginPath}`;
                let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                cmd = `plugins validate ${testPlugin}`;
                result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                result.stderr = removeNewline(result.stderr);
                expect(result.stdout).toContain(testPlugin);
                expect(result.stdout).toContain("Error");
                expect(result.stdout).toContain("The plugin's configuration does not contain an 'imperative.rootCommandDescription' property.");
            });

            describe("definitions property", () => {
                it("is missing", () => {
                    const testPlugin = "missing_definitions";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    result.stderr = removeNewline(result.stderr);
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error");
                    expect(result.stdout).toContain("The plugin's configuration defines no children.");
                });

                it("is defined with empty array", () => {
                    const testPlugin = "definition_empty_array";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    result.stderr = removeNewline(result.stderr);
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error: The plugin's configuration defines no children.");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });

                it("is defined with definition which does not contain name property", () => {
                    const testPlugin = "definition_missing_name";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error: Command definition");
                    expect(result.stdout).toContain("no 'name' property");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });

                it("is defined with definition which does not contain description property", () => {
                    const testPlugin = "definition_missing_description";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error");
                    expect(result.stdout).toContain("has no 'description' property");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });

                it("is defined with definition which does not contain type property", () => {
                    const testPlugin = "definition_missing_type";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error");
                    expect(result.stdout).toContain("has no 'type' property");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });

                it("is defined with definition which does not contain handler property", () => {
                    const testPlugin = "definition_missing_handler";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error");
                    expect(result.stdout).toContain("has no 'handler' property");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });

                it("is defined with definition which contains group type and missing children", () => {
                    const testPlugin = "definition_type_group_without_children";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error: Group name");
                    expect(result.stdout).toContain("has no 'children' property");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });

                it("is defined with definition which contains invalid handler", () => {
                    const testPlugin = "missing_command_handler";
                    const fullPluginPath = join(testPluginDir, "error_plugins", testPlugin);

                    let cmd = `plugins install ${fullPluginPath}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${testPlugin}'`);

                    cmd = `plugins validate ${testPlugin}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(testPlugin);
                    expect(result.stdout).toContain("Error: The handler for command");
                    expect(result.stdout).toContain("does not exist:");
                    expect(result.stdout).toContain("No commands from this plugin will be available for future commands.");
                });
            });

            describe("Detect profile problems", () => {
                it("should fail with duplicate profiles within a plugin", () => {
                    const pluginName = "profile_dup_in_plugin";
                    const pluginDir = join(testPluginDir, "error_plugins", pluginName);

                    let cmd = `plugins install ${pluginDir}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);

                    cmd = `plugins validate ${pluginName}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain("");
                    expect(result.stdout).toContain(pluginName);
                    expect(result.stdout).toContain(
                        "___ Error: The plugin's profiles at indexes = '0' and '1' have the same 'type' property = 'DupProfile'.");
                });

                it("should fail when a plugin contains a profile with the same name as the CLI", () => {
                    const pluginName = "profile_dup_with_cli";
                    const pluginDir = join(testPluginDir, "error_plugins", pluginName);

                    let cmd = `plugins install ${pluginDir}`;
                    let result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain(`Installed plugin name = '${pluginName}'`);

                    cmd = `plugins validate ${pluginName}`;
                    result = T.executeTestCLICommand(cliBin, this, cmd.split(" "));
                    expect(result.stdout).toContain("");
                    expect(result.stdout).toContain(pluginName);
                    expect(result.stdout).toContain(
                        "___ Error: The plugin's profile type = 'TestProfile1' already exists within existing profiles.");
                });
            });
        });
    });
});
