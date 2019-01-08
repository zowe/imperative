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

jest.mock("../../../../../settings/src/AppSettings");

import { CommandResponse, IHandlerParameters } from "../../../../../cmd";
import { AppSettings } from "../../../../../settings";

describe("Config management reset handler", () => {

  afterEach(() => {
    // Mocks need cleared after every test for clean test runs
    jest.resetAllMocks();
  });

  /**
   *  Create object to be passed to process function
   *
   * @returns {IHandlerParameters}
   */
  const getIHandlerParametersObject = (): IHandlerParameters => {
    const x: any = {
      response: new (CommandResponse as any)(),
      arguments: {
        configName: "credential-manager"
      },
    };
    return x as IHandlerParameters;
  };

  it("should reset credential manager", async () => {

    const handlerReq = require("../../../../src/config/cmd/reset/reset.handler");
    const handler = new handlerReq.default();

    const params = getIHandlerParametersObject();

    const appSettings = AppSettings.initialize("foo");

    await handler.process(params as IHandlerParameters);

    expect(appSettings.setNewOverride).toHaveBeenCalledWith("CredentialManager", false);
    expect(appSettings.settings.overrides).toBeDefined();
    expect(appSettings.settings.overrides.CredentialManager).toEqual(false);
  });
});

