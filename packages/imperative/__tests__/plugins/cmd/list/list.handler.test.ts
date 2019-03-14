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

jest.mock("jsonfile");
jest.mock("../../../../src/plugins/utilities/PMFConstants");
jest.mock("../../../../../cmd/src/response/CommandResponse");
jest.mock("../../../../../cmd/src/response/HandlerResponse");
jest.mock("../../../../../logger");

import { CommandResponse, IHandlerParameters } from "../../../../../cmd";
import { Console } from "../../../../../console";
import { IPluginJson } from "../../../../src/plugins/doc/IPluginJson";
import ListHandler from "../../../../src/plugins/cmd/list/list.handler";
import { Logger } from "../../../../../logger/";
import { readFileSync } from "jsonfile";

describe("Plugin Management Facility list handler", () => {

 // (PluginIssues as any).mInstance = new PluginIssues();
  // Objects created so types are correct.
  const mocks = {
    readFileSync: readFileSync as Mock<typeof readFileSync>
  };

  // two plugin set of values
  const packageName = "a";
  const packageVersion = "22.1.0";
  const packageRegistry = "http://imperative-npm-registry:4873/";

  const packageName2 = "plugin1";
  const packageVersion2 = "2.0.3";
  const packageRegistry2 = "http://imperative-npm-registry:4873/";

  beforeEach(() => {
    // Mocks need cleared after every test for clean test runs
    jest.resetAllMocks();

    // This needs to be mocked before running process function of install handler
    (Logger.getImperativeLogger as Mock<typeof Logger.getImperativeLogger>).mockReturnValue(new Logger(new Console()));

  });

  /**
   * Checks that the "Install Successful" message was written.
   *
   * @param {IHandlerParameters} params The parameters that were passed to the
   *                                    process function.
   */
  const wasListSuccessful = (params: IHandlerParameters) => {
    expect(params.response.console.log).toHaveBeenCalled();
  };

  /**
   *  Create object to be passed to process function
   *
   * @returns {IHandlerParameters}
   */
  const getIHandlerParametersObject = (): IHandlerParameters => {
    const x: any = {
      response: new (CommandResponse as any)(),
      arguments: {
        package: undefined
      },
    };
    x.response.data = {setObj: jest.fn()};
    return x as IHandlerParameters;
  };

  beforeEach(() => {
    mocks.readFileSync.mockReturnValue({});
  });

  test("list packages", async () => {

    // plugin definitions mocking file contents
    const fileJson: IPluginJson = {
      a: {
        package: packageName,
        registry: packageRegistry,
        version: packageVersion
      },
      plugin1: {
        package: packageName2,
        registry: packageRegistry2,
        version: packageVersion2
      }
    };

    // Override the return value for this test only
    mocks.readFileSync.mockReturnValueOnce(fileJson);

    const handler = new ListHandler();

    const params = getIHandlerParametersObject();

    await handler.process(params as IHandlerParameters);

    wasListSuccessful(params);

  });
});

