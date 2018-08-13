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

jest.mock("path");
jest.mock("../../../../logger");

import {join} from "path";
import {ImperativeConfig} from "../../../src/ImperativeConfig";
import {PMFConstants} from "../../../src/plugins/utilities/PMFConstants";
import {Logger} from "../../../../logger";
import {Console} from "../../../../console";
import Mock = jest.Mock;

describe("PMFConstants", () => {
  const mocks = {
    join: join as jest.Mock<typeof join>
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // This needs cleared out before each test
    (PMFConstants as any).mInstance = null;

    (Logger.getImperativeLogger as Mock<typeof Logger.getImperativeLogger>).mockReturnValue(new Logger(new Console()));

    // Define properties to Imperative CLI that we need
    Object.defineProperty(ImperativeConfig.instance, "cliHome", {
      configurable: true, // Allows this to be modified after the first before each
      get: () => "/sample-cli/home"
    });

    Object.defineProperty(ImperativeConfig.instance, "callerFileLocation", {
      configurable: true, // Allows this to be modified after the first before each
      get: () => "/"
    });
  });

  it("should initialize properly", () => {
    const pmfRoot = `${ImperativeConfig.instance.cliHome}/plugins`;
    const pluginJson = `${pmfRoot}/plugins.json`;
    const cliInstallDir = "installed";

    mocks.join
      .mockReturnValueOnce(pmfRoot)
      .mockReturnValueOnce(pluginJson)
      .mockReturnValueOnce(cliInstallDir);

    const pmf = PMFConstants.instance;

    expect(pmf.PMF_ROOT).toBe(pmfRoot);
    expect(pmf.PLUGIN_JSON).toBe(pluginJson);
    expect(pmf.PLUGIN_INSTALL_LOCATION).toBe(cliInstallDir);
  });

  describe("platform specific checks", () => {
    // Be sure to remember the current platform
    const platform = process.platform;

    afterEach(() => {
      process.platform = platform;
    });

    it("should point to the correct module location (win32)", () => {
      process.platform = "win32";

      const pmf = PMFConstants.instance;

      expect(pmf.PLUGIN_INSTALL_LOCATION).toEqual(join(pmf.PLUGIN_INSTALL_LOCATION, "node_modules"));
    });

    it("should point to the correct module location (linux)", () => {
      process.platform = "linux";

      const pmf = PMFConstants.instance;

      expect(pmf.PLUGIN_INSTALL_LOCATION).toEqual(join(pmf.PLUGIN_INSTALL_LOCATION, "lib", "node_modules"));
    });
  });
});
