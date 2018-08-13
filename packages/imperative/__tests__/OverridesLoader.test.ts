/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*/

import { IImperativeConfig } from "..";

jest.mock("../../security");

import { OverridesLoader } from "../src/OverridesLoader";
import { CredentialManagerFactory, DefaultCredentialManager, AbstractCredentialManager } from "../../security";

import * as path from "path";
// import { join } from "path";

describe("OverridesLoader", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe("loadCredentialManager", () => {
    it("should load the default when not passed any configuration.", async () => {
      const config: IImperativeConfig = {
        name: "ABCD",
        overrides: {}
      };

      await OverridesLoader.load(config);

      expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
      expect(CredentialManagerFactory.initialize).toHaveBeenCalledWith(DefaultCredentialManager, config.name);
    });

    describe("should load a credential manager specified by the user", () => {
      it("was passed a class", async () => {
        const config: IImperativeConfig = {
          name: "EFGH",
          overrides: {
            CredentialManager: class extends AbstractCredentialManager {
              constructor(service: string) {
                super(service);
              }

              protected async deleteCredentials(account: string): Promise<void> {
                return;
              }

              protected async loadCredentials(account: string): Promise<string> {
                return "PASSWORD";
              }

              protected async saveCredentials(account: string, password: string): Promise<void> {
                return;
              }
            }
          }
        };

        await OverridesLoader.load(config);

        expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        expect(CredentialManagerFactory.initialize).toHaveBeenCalledWith(config.overrides.CredentialManager, config.name);
      });

      it("was passed an absolute path", async () => {
        const config: IImperativeConfig = {
          name: "EFGH",
          overrides: {
            CredentialManager: path.join(__dirname, "DummyFile.ts")
          }
        };

        jest.spyOn(path, "resolve");

        await OverridesLoader.load(config);

        expect(path.resolve).not.toHaveBeenCalled();
        expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        expect(CredentialManagerFactory.initialize).toHaveBeenCalledWith(config.overrides.CredentialManager, config.name);
      });

      it("was passed a relative path", async () => {
        const config: IImperativeConfig = {
          name: "IJKL",
          overrides: {
            CredentialManager: "DummyFile.ts"
          }
        };

        // DON'T YOU EVER DO THIS AFTER THE SPY, IT WILL CAUSE YOU MASSIVE PROBLEMS
        // I suspect that process.mainModule.filename somehow uses path.resolve (25 times when I ran this)
        const expectedArgs = [process.mainModule.filename, "../", config.overrides.CredentialManager];

        const expectedLocation = "/some/random/dummy/location/DummyFile.ts";
        jest.spyOn(path, "resolve").mockReturnValueOnce(expectedLocation);

        await OverridesLoader.load(config);

        expect(path.resolve).toHaveBeenCalledTimes(1);
        expect(path.resolve).toHaveBeenLastCalledWith(expectedArgs[0], expectedArgs[1], expectedArgs[2]);

        expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        expect(CredentialManagerFactory.initialize).toHaveBeenCalledWith(expectedLocation, config.name);
      });
    });
  });
});
