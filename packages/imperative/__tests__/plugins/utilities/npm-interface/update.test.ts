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

import Mock = jest.Mock;

jest.mock("child_process");
jest.mock("jsonfile");
jest.mock("path");
jest.mock("fs");
jest.mock("../../../../src/plugins/utilities/PMFConstants");
jest.mock("../../../../../logger");
jest.mock("../../../../../cmd/src/response/CommandResponse");
jest.mock("../../../../../cmd/src/response/HandlerResponse");
jest.mock("../../../../src/plugins/utilities/NpmFunctions");

import { Console } from "../../../../../console";
import { existsSync } from "fs";
import { IPluginJson } from "../../../../src/plugins/doc/IPluginJson";
import { Logger } from "../../../../../logger";
import { PMFConstants } from "../../../../src/plugins/utilities/PMFConstants";
import { readFileSync } from "jsonfile";
import { update } from "../../../../src/plugins/utilities/npm-interface";
import { installPackages } from "../../../../src/plugins/utilities/NpmFunctions";

describe("PMF: update Interface", () => {
  // Objects created so types are correct.
  const mocks = {
    installPackages: installPackages as Mock<typeof installPackages>,
    existsSync: existsSync as Mock<typeof existsSync>,
    readFileSync: readFileSync as Mock<typeof readFileSync>,
  };

  const packageName = "pretty-format";
  const packageVersion = "1.2.3";
  const packageRegistry = "https://registry.npmjs.org/";

  beforeEach(() => {
    // Mocks need cleared after every test for clean test runs
    jest.resetAllMocks();

    // This needs to be mocked before running update
    (Logger.getImperativeLogger as Mock<typeof Logger.getImperativeLogger>).mockReturnValue(new Logger(new Console()));

    /* Since update() adds new plugins into the value returned from
     * readFileSyc(plugins.json), we must reset readFileSync to return an empty set before each test.
     */
    mocks.readFileSync.mockReturnValue({});
  });

  /**
   * Validates that an execSync npm install call was valid based on the parameters passed.
   *
   * @param {string} expectedPackage The package that should be sent to npm update
   * @param {string} expectedRegistry The registry that should be sent to npm update
   * @param {boolean} [updateFromFile=false] was the update from a file. This affects
   *                                          the pipe sent to execSync stdio option.
   */
  const wasNpmInstallCallValid = (expectedPackage: string, expectedRegistry: string) => {
    expect(mocks.installPackages).toHaveBeenCalledWith(PMFConstants.instance.PLUGIN_INSTALL_LOCATION,
        expectedRegistry, expectedPackage);
  };

  describe("Basic update", () => {
    beforeEach(() => {
      mocks.installPackages.mockReturnValue(`+ ${packageName}@${packageVersion}`);
    });

    it("should update from the npm registry", async () => {

    // value for our plugins.json
    const oneOldPlugin: IPluginJson = {
      plugin1: {
        package: packageName,
        registry: packageRegistry,
        version: packageVersion
      }
    };

    mocks.installPackages.mockReturnValue(`+ ${packageName}@${packageVersion}`);
    mocks.readFileSync.mockReturnValue(oneOldPlugin);

    const data = await update(packageName, packageRegistry);
    expect(data).toEqual(packageVersion);

    // Validate the update
    wasNpmInstallCallValid(packageName, packageRegistry);
  });
});
  it("should update from the npm registry", async () => {

    // value for our plugins.json
    const oneOldPlugin: IPluginJson = {
      plugin1: {
        package: packageName,
        registry: packageRegistry,
        version: packageVersion
      }
    };

    mocks.installPackages.mockReturnValue(`+ ${packageName}@${packageVersion}`);
    mocks.readFileSync.mockReturnValue(oneOldPlugin);

    const data = await update(packageName, packageRegistry);
    expect(data).toEqual(packageVersion);

    // Validate the update
    wasNpmInstallCallValid(packageName, packageRegistry);
  });
});
