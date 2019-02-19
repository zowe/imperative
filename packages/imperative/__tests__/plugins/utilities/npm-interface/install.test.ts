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
jest.mock("find-up");
jest.mock("../../../../src/plugins/utilities/PMFConstants");
jest.mock("../../../../../logger");
jest.mock("../../../../../cmd/src/response/CommandResponse");
jest.mock("../../../../../cmd/src/response/HandlerResponse");
jest.mock("../../../../src/plugins/utilities/NpmFunctions");

import { Console } from "../../../../../console";
import { existsSync, lstatSync } from "fs";
import { ImperativeError } from "../../../../../error";
import { install } from "../../../../src/plugins/utilities/npm-interface";
import { IPluginJson } from "../../../../src/plugins/doc/IPluginJson";
import { IPluginJsonObject } from "../../../../src/plugins/doc/IPluginJsonObject";
import { dirname, isAbsolute, join, resolve, normalize } from "path";
import { Logger } from "../../../../../logger";
import { PMFConstants } from "../../../../src/plugins/utilities/PMFConstants";
import { readFileSync, writeFileSync } from "jsonfile";
import { sync } from "find-up";
import { installPackages } from "../../../../src/plugins/utilities/NpmFunctions";

describe("PMF: Install Interface", () => {
  // Objects created so types are correct.
  const mocks = {
    dirname: dirname as Mock<typeof dirname>,
    installPackages: installPackages as Mock<typeof installPackages>,
    existsSync: existsSync as Mock<typeof existsSync>,
    isAbsolute: isAbsolute as Mock<typeof isAbsolute>,
    join: join as Mock<typeof join>,
    readFileSync: readFileSync as Mock<typeof readFileSync>,
    resolve: resolve as Mock<typeof resolve>,
    writeFileSync: writeFileSync as Mock<typeof writeFileSync>,
    normalize: normalize as Mock<typeof normalize>,
    lstatSync: lstatSync as Mock<typeof lstatSync>,
    sync: sync as Mock<typeof sync>
  };

  const packageName = "a";
  const packageVersion = "1.2.3";
  const packageRegistry = "https://registry.npmjs.org/";

  beforeEach(() => {
    // Mocks need cleared after every test for clean test runs
    jest.resetAllMocks();

    // This needs to be mocked before running install
    (Logger.getImperativeLogger as Mock<typeof Logger.getImperativeLogger>).mockReturnValue(new Logger(new Console()));

    /* Since install() adds new plugins into the value returned from
     * readFileSyc(plugins.json), we must reset readFileSync to return an empty set before each test.
     */
    mocks.readFileSync.mockReturnValue({});
    mocks.sync.mockReturnValue("fake_find-up_sync_result");
    mocks.dirname.mockReturnValue("fake-dirname");
    mocks.resolve.mockReturnValue(packageName);
    mocks.join.mockReturnValue("/fake/join/path");
  });

  /**
   * Validates that an npm install call was valid based on the parameters passed.
   *
   * @param {string} expectedPackage The package that should be sent to npm install
   * @param {string} expectedRegistry The registry that should be sent to npm install
   */
  const wasNpmInstallCallValid = (expectedPackage: string, expectedRegistry: string) => {
      expect(mocks.installPackages).toHaveBeenCalledWith(PMFConstants.instance.PLUGIN_INSTALL_LOCATION,
          expectedRegistry, expectedPackage);
  };

  /**
   * Validates that the writeFileSync was called with the proper JSON object. This object is created
   * by merging the object returned by readFileSync (should be mocked) and an object that represents
   * the new plugin added according to the plugins.json file syntax.
   *
   * @param {IPluginJson} originalJson The JSON object that was returned by readFileSync
   * @param {string} expectedName The name of the plugin that was installed
   * @param {IPluginJsonObject} expectedNewPlugin The expected object for the new plugin
   */
  const wasWriteFileSyncCallValid = (originalJson: IPluginJson, expectedName: string, expectedNewPlugin: IPluginJsonObject) => {
    // Create the object that should be sent to the command.
    const expectedObject = {
      ...originalJson
    };
    expectedObject[expectedName] = expectedNewPlugin;

    expect(mocks.writeFileSync).toHaveBeenCalledWith(
      PMFConstants.instance.PLUGIN_JSON,
      expectedObject,
      {
        spaces: 2
      }
    );
  };

  describe("Basic install", () => {
    beforeEach(() => {
      mocks.installPackages.mockReturnValue(`+ ${packageName}@${packageVersion}`);
      mocks.existsSync.mockReturnValue(true);
      mocks.normalize.mockReturnValue("testing");
      mocks.lstatSync.mockReturnValue({
        isSymbolicLink: jest.fn().mockReturnValue(true)
      });
    });

    it("should install from the npm registry", async () => {
      await install(packageName, packageRegistry);

      // Validate the install
      wasNpmInstallCallValid(packageName, packageRegistry);
      wasWriteFileSyncCallValid({}, packageName, {
        package: packageName,
        registry: packageRegistry,
        version: packageVersion
      });
    });

    it("should install an absolute file path", async () => {
      const rootFile = "/root/a";

      mocks.isAbsolute.mockReturnValue(true);

      await install(rootFile, packageRegistry);

      // Validate the install
      wasNpmInstallCallValid(rootFile, packageRegistry);
      wasWriteFileSyncCallValid({}, packageName, {
        package: rootFile,
        registry: packageRegistry,
        version: packageVersion
      });
    });

    describe("relative file path", () => {
      const relativePath = "../../install/a";
      const absolutePath = "/root/node/cli/install/a";

      // Mock these before each test here since they are common
      beforeEach(() => {
        mocks.isAbsolute.mockReturnValue(false);
        mocks.resolve.mockReturnValue(absolutePath);
      });

      it("should install a relative file path", async () => {
        // Setup mocks for install function
        mocks.existsSync.mockReturnValue(true);

        // Call the install function
        await install(relativePath, packageRegistry);

        // Validate results
        wasNpmInstallCallValid(absolutePath, packageRegistry);
        wasWriteFileSyncCallValid({}, packageName, {
          package: absolutePath,
          registry: packageRegistry,
          version: packageVersion
        });
      });
    });

    it("should install from a url", async () => {
      const installUrl = "http://www.example.com";
      mocks.resolve.mockReturnValue(installUrl);

      // mocks.isUrl.mockReturnValue(true);

      await install(installUrl, packageRegistry);

      wasNpmInstallCallValid(installUrl, packageRegistry);
      wasWriteFileSyncCallValid({}, packageName, {
        package: installUrl,
        registry: packageRegistry,
        version: packageVersion
      });
    });
  });

  describe("Advanced install", () => {
    it("should write even when install from file is true", async () => {
      // This test is constructed in such a way that all if conditions with installFromFile
      // are validated to have been called or not.
      const location = "/this/should/not/change";

      mocks.isAbsolute.mockReturnValue(false);
      mocks.existsSync.mockReturnValue(true);
      mocks.installPackages.mockReturnValue(`+ ${packageName}@${packageVersion}`);
      mocks.normalize.mockReturnValue("testing");
      mocks.lstatSync.mockReturnValue({
        isSymbolicLink: jest.fn().mockReturnValue(true)
      });

      await install(location, packageRegistry, true);

      wasNpmInstallCallValid(location, packageRegistry);
      expect(mocks.writeFileSync).toHaveBeenCalled();
    });

    it("should accept semver properly", async () => {
      const semverVersion = "^1.5.2";
      const semverPackage = `${packageName}@${semverVersion}`;

      mocks.existsSync.mockReturnValue(true);
      mocks.normalize.mockReturnValue("testing");
      mocks.lstatSync.mockReturnValue({
        isSymbolicLink: jest.fn().mockReturnValue(true)
      });

      // While this doesn't replicate the function, we are installing an npm package
      // so it is shorter to just skip the if condition in install.
      mocks.isAbsolute.mockReturnValue(true);

      // This is valid under semver ^1.5.2
      mocks.installPackages.mockReturnValue(`+ ${packageName}@1.5.16`);

      // Call the install
      await install(semverPackage, packageRegistry);

      // Test that shit happened
      wasNpmInstallCallValid(semverPackage, packageRegistry);
      wasWriteFileSyncCallValid({}, packageName, {
        package: packageName,
        registry: packageRegistry,
        version: semverVersion
      });
    });

    it("should merge contents of previous json file", async () => {
      // value for our previous plugins.json
      const oneOldPlugin: IPluginJson = {
        plugin1: {
          package: "plugin1",
          registry: packageRegistry,
          version: "1.2.3"
        }
      };

      mocks.installPackages.mockReturnValue(`+ ${packageName}@${packageVersion}`);
      mocks.existsSync.mockReturnValue(true);
      mocks.normalize.mockReturnValue("testing");
      mocks.lstatSync.mockReturnValue({
        isSymbolicLink: jest.fn().mockReturnValue(true)
      });
      mocks.readFileSync.mockReturnValue(oneOldPlugin);

      await install(packageName, packageRegistry);

      wasNpmInstallCallValid(packageName, packageRegistry);
      wasWriteFileSyncCallValid(oneOldPlugin, packageName, {
        package: packageName,
        registry: packageRegistry,
        version: packageVersion
      });
    });

    it("should throw errors", async () => {
      const error = new Error("This should be caught");

      mocks.installPackages.mockImplementation(() => {
        throw error;
      });

      // Create a placeholder error object that should be set after the call to install
      let expectedError: ImperativeError;

      try {
        await install("test", "http://www.example.com");
      } catch (e) {
        expectedError = e;
      }

      // Check that the expected ImperativeError was thrown
      expect(expectedError).toEqual(new ImperativeError({
        msg: error.message,
        causeErrors: error
      }));
    });
  });
});
