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

jest.mock("keytar");

import { DefaultCredentialManager } from "..";
import * as keytar from "keytar";
import { ImperativeError } from "../../error";

describe("DefaultCredentialManager", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("Constructs Properly", () => {
    const service = "imperative";
    const manager = new DefaultCredentialManager(service);

    expect((manager as any).service).toEqual(service);
  });

  describe("instance methods", () => {
    const service = "imperative-service";

    /**
     * Use this manager as classes should use it.
     */
    let manager: DefaultCredentialManager;

    /**
     * Use only to access private methods/functions of the manager
     */
    let privateManager: any;

    beforeEach(() => {
      // I'm lazy so let's call the init method before every test
      manager = new DefaultCredentialManager(service);
      privateManager = manager as any;
    });

    describe("initialize", () => {
      it("should properly initialize keytar", async () => {
        await manager.initialize();

        expect(privateManager.loadError).toBeUndefined();
        expect(privateManager.keytar).toEqual(keytar);
      });

      it("should catch a load error", async () => {
        const tempKeytar = keytar;

        // Force enter the try catch
        Object.defineProperty(manager, "keytar", {
          writable: false
        });

        await manager.initialize();

        expect(privateManager.keytar).toBeUndefined();
        expect(privateManager.loadError).toBeInstanceOf(ImperativeError);
        expect(privateManager.loadError.message).toEqual("Keytar not Installed");
      });
    });

    describe("methods after initialize", () => {
      /**
       * Values used by the tests below
       *
       * @type {{account: string; credentials: string}}
       */
      const values = {
        account: "test",
        credentials: "someUser:somePassword"
      };

      const longValues = [
        {
          account: "test-1",
          credentials: "someUser:"
        },
        {
          account: "test-2",
          credentials: "somePassword\0"
        }
      ];

      beforeEach(async () => {
        await manager.initialize();
      });

      describe("checkForKeytar", () => {
        it("should do nothing if keytar is there", () => {
          privateManager.keytar = "abcd";
          expect(privateManager.checkForKeytar()).toBeUndefined();
        });
        it("should throw load error if keytar is missing", () => {
          privateManager.keytar = null;
          privateManager.loadError = new ImperativeError({
            msg: "A message"
          });

          expect(() => {
            privateManager.checkForKeytar();
          }).toThrowError(privateManager.loadError);
        });
        it("should throw an error if keytar and load error are missing", () => {
          privateManager.keytar = null;
          privateManager.loadError = null;

          expect(() => {
            privateManager.checkForKeytar();
          }).toThrowError(ImperativeError);
        });
      });

      describe("deleteCredentials", () => {
        it("should delete credentials", async () => {
          // Check this in the first test of each one
          jest.spyOn(privateManager, "checkForKeytar");

          (keytar.deletePassword as jest.Mock).mockReturnValueOnce(true);

          await privateManager.deleteCredentials(values.account);
          expect(privateManager.checkForKeytar).toHaveBeenCalledTimes(1);
          expect(keytar.deletePassword).toHaveBeenCalledWith(privateManager.service, values.account);
        });
        it("should silently fail to delete non-existent credentials", async () => {
          const deleteSpy = jest.spyOn(privateManager, "deleteCredentialsHelper");
          let caughtError: ImperativeError;

          try {
            await privateManager.deleteCredentials(values.account);
          } catch (error) {
            caughtError = error;
          }

          expect(caughtError).toBeUndefined();
          expect(deleteSpy).toHaveBeenCalled();
          await deleteSpy.mock.results[0].value.then((value: boolean) => {
            expect(value).toBe(false);
          });
        });
      });

      describe("loadCredentials", () => {
        it("should return credentials", async () => {
          jest.spyOn(privateManager, "checkForKeytar");

          (keytar.getPassword as jest.Mock).mockReturnValueOnce(values.credentials);

          expect(await privateManager.loadCredentials(values.account)).toEqual(values.credentials);

          expect(privateManager.checkForKeytar).toHaveBeenCalledTimes(1);
          expect(keytar.getPassword).toHaveBeenLastCalledWith(service, values.account);
        });

        it("should return credentials for an alternate service", async () => {
          (keytar.getPassword as jest.Mock).mockImplementation(async (svc, acct) => svc === service ? null : values.credentials);

          expect(await privateManager.loadCredentials(values.account)).toEqual(values.credentials);
          expect(keytar.getPassword).toHaveBeenLastCalledWith(DefaultCredentialManager.SVC_NAME, values.account);
        });

        it("should throw an error when required credential fails to load", async () => {
          let caughtError: ImperativeError;

          (keytar.getPassword as jest.Mock).mockReturnValueOnce(null);

          try {
            await privateManager.loadCredentials(values.account);
          } catch (error) {
            caughtError = error;
          }

          expect(caughtError.message).toEqual("Unable to load credentials.");
          expect((caughtError as ImperativeError).additionalDetails).toContain(values.account);
          expect((caughtError as ImperativeError).additionalDetails).toContain(service);
        });

        it("should not throw an error when optional credential fails to load", async () => {
          let result;
          let caughtError: ImperativeError;

          (keytar.getPassword as jest.Mock).mockReturnValue(null);

          try {
            result = await privateManager.loadCredentials(values.account, true);
          } catch (error) {
            caughtError = error;
          }

          expect(result).toBeNull();
          expect(caughtError).toBeUndefined();
        });
      });

      describe("setCredentials", () => {
        it("should set credentials", async () => {
          jest.spyOn(privateManager, "checkForKeytar");

          await privateManager.saveCredentials(values.account, values.credentials);

          expect(privateManager.checkForKeytar).toHaveBeenCalledTimes(1);
          // tslint:disable-next-line no-magic-numbers
          expect(keytar.deletePassword).toHaveBeenCalledTimes(5);
          expect(keytar.setPassword).toHaveBeenLastCalledWith(privateManager.service, values.account, values.credentials);
        });
      });

      describe("Windows credential management", () => {
        const oldPlatform = process.platform;

        beforeAll(() => {
          Object.defineProperty(process, "platform", { get: () => "win32" });
        });

        afterAll(() => {
          Object.defineProperty(process, "platform", oldPlatform);
        });

        it("should load credentials that exceed max length", async () => {
          (keytar.getPassword as jest.Mock).mockReturnValueOnce(null)
                                           .mockReturnValueOnce(longValues[0].credentials)
                                           .mockReturnValueOnce(longValues[1].credentials);

          expect(await privateManager.loadCredentials(values.account)).toEqual(values.credentials);
          expect(keytar.getPassword).toHaveBeenLastCalledWith(service, longValues[1].account);
        });

        it("should save credentials that exceed max length", async () => {
          // tslint:disable no-magic-numbers
          const longCredentials = values.credentials.repeat(512);
          const numFields = Math.ceil(longCredentials.length / 2560);

          await privateManager.saveCredentials(values.account, longCredentials);

          expect(keytar.deletePassword).toHaveBeenCalledWith(privateManager.service, values.account);
          expect(keytar.setPassword).toHaveBeenCalledTimes(numFields);
          expect(keytar.setPassword).toHaveBeenCalledWith(privateManager.service, `${values.account}-1`, longCredentials.slice(0, 2560));
          // tslint:enable no-magic-numbers
        });

        it("should delete credentials that exceed max length", async () => {
          (keytar.deletePassword as jest.Mock).mockImplementation((svc, acct) => acct.endsWith("-1"))

          await privateManager.deleteCredentials(values.account);

          expect(keytar.deletePassword).toHaveBeenLastCalledWith(DefaultCredentialManager.SVC_NAME, `${values.account}-2`);
        });
      });
    });
  });
});
