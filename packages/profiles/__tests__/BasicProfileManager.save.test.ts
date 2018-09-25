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

jest.mock("../src/utils/ProfileIO");
import { ImperativeError } from "../../error/src/ImperativeError";
import { TestLogger } from "../../../__tests__/TestLogger";
import { ISaveProfile } from "../src/doc/parms/ISaveProfile";
import { inspect } from "util";
import { IProfileSaved } from "../src/doc/response/IProfileSaved";
import { CredentialManagerFactory, DefaultCredentialManager } from "../../security";
import {
  APPLE_BAN_UNKNOWN,
  APPLE_PROFILE_TYPE,
  APPLE_TWO_REQ_DEP_BANANA_ONE_REQ_DEP_GRAPE_ONE_REQ_DEP,
  BANANA_PROFILE_TYPE,
  MANGO_PROFILE_TYPE,
  ONLY_APPLE,
  ONLY_MANGO,
  ONLY_ORANGE_WITH_CREDENTIALS,
  SECURE_ORANGE_PROFILE_TYPE,
  STRAWBERRY_PROFILE_TYPE,
  STRAWBERRY_WITH_REQUIRED_APPLE_DEPENDENCY,
  TEST_PROFILE_ROOT_DIR
} from "./TestConstants";
import { BasicProfileManager } from "../src/BasicProfileManager";

const BAD_SAMPLE_SAVE_PARMS: ISaveProfile = {
  profile: {
    name: "bad_apple",
    type: "bad_apple"
  }
};

const GOOD_SAMPLE_SAVE_PARMS: ISaveProfile = {
  profile: {
    name: "apple",
    type: STRAWBERRY_PROFILE_TYPE
  }
};

describe("Basic Profile Manager Save", () => {
  it("should detect missing parameters", async () => {
    let error;
    try {
      const prof = new BasicProfileManager({
        profileRootDirectory: TEST_PROFILE_ROOT_DIR,
        typeConfigurations: ONLY_APPLE,
        type: APPLE_PROFILE_TYPE,
        logger: TestLogger.getTestLogger()
      });
      const response = await prof.save(undefined);
    } catch (e) {
      error = e;
      TestLogger.info(e);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect missing profile", async () => {
    let error;
    try {
      const prof = new BasicProfileManager({
        profileRootDirectory: TEST_PROFILE_ROOT_DIR,
        typeConfigurations: ONLY_APPLE,
        type: APPLE_PROFILE_TYPE,
        logger: TestLogger.getTestLogger()
      });
      const parms = {profile: {name: "bad_apple"}};
      delete parms.profile;
      const response = await prof.save(parms);
    } catch (e) {
      error = e;
      TestLogger.info(e);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect a type mismatch when saving a profile", async () => {
    let error;
    try {
      const prof = new BasicProfileManager({
        profileRootDirectory: TEST_PROFILE_ROOT_DIR,
        typeConfigurations: ONLY_APPLE,
        type: STRAWBERRY_PROFILE_TYPE,
        logger: TestLogger.getTestLogger()
      });
      const response = await prof.save(BAD_SAMPLE_SAVE_PARMS);
    } catch (e) {
      error = e;
      TestLogger.info(e);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect a blank name when creating a profile", async () => {
    let error;
    try {
      const prof = new BasicProfileManager({
        profileRootDirectory: TEST_PROFILE_ROOT_DIR,
        typeConfigurations: ONLY_APPLE,
        type: APPLE_PROFILE_TYPE,
        logger: TestLogger.getTestLogger()
      });
      const copy = JSON.parse(JSON.stringify({
        profile: {
          name: " "
        }
      }));
      const response = await prof.save(copy);
    } catch (e) {
      error = e;
      TestLogger.info(e);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect if the meta name was specified as the profile name", async () => {
    let error;
    try {
      const prof = new BasicProfileManager({
        profileRootDirectory: TEST_PROFILE_ROOT_DIR,
        typeConfigurations: ONLY_APPLE,
        type: APPLE_PROFILE_TYPE,
        logger: TestLogger.getTestLogger()
      });
      const copy = JSON.parse(JSON.stringify({
        profile: {
          name: APPLE_PROFILE_TYPE + "_meta"
        }
      }));
      const response = await prof.save(copy);
    } catch (e) {
      error = e;
      TestLogger.info(e);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect that the dependencies are not an array", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_apple"};
      profile.dependencies = {};
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect that the dependencies are present, but name is missing", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_apple"};
      profile.dependencies = [{type: STRAWBERRY_PROFILE_TYPE}];
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect that the dependencies are present, but type is missing", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_apple"};
      profile.dependencies = [{name: "bad_strawberry"}];
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect that a profile requires a dependency of a certain type", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: STRAWBERRY_WITH_REQUIRED_APPLE_DEPENDENCY,
      type: STRAWBERRY_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_strawberry", description: "A bunch of rotten strawberries", amount: 30};
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect all missing required fields on the schema", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: STRAWBERRY_WITH_REQUIRED_APPLE_DEPENDENCY,
      type: STRAWBERRY_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_strawberry", dependencies: [{type: APPLE_PROFILE_TYPE, name: "bad_apple"}]};
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect a type mismatch from the schema for strings", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_apple", description: true, rotten: true, age: 100};
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should detect a type mismatch from the schema for booleans", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      const profile: any = {name: "bad_apple", description: "A nasty apple", rotten: "yes", age: 100};
      response = await prof.save({profile});
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should fail a save request if the file already exists and overwrite is false", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    try {
      const profile: any = {name: "old_apple", description: "A nasty apple", rotten: true, age: 100};
      const saveResponse = await prof.save({
        profile,
        overwrite: false
      });
    } catch (e) {
      error = e;
      TestLogger.info(e.message);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should fail a save request if an error is thrown by write file", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    try {
      const profile: any = {name: "throw_the_apple", description: "A nasty apple", rotten: true, age: 100};
      const saveResponse = await prof.save({
        profile,
        overwrite: true
      });
    } catch (e) {
      error = e;
      TestLogger.info(e.message);
    }
    expect(error).toBeDefined();
    expect(error.message).toMatchSnapshot();
  });

  it("should fail a save request if there is an error writing the meta file", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_MANGO,
      type: MANGO_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    try {
      const profile: any = {name: "bad_mango", description: "A nasty mango", peeled: true};
      const saveResponse = await prof.save({
        profile,
        overwrite: true,
        updateDefault: true
      });
    } catch (e) {
      error = e;
      TestLogger.info(e.message);
    }
    expect(error).toBeDefined();
    expect(error.message).toMatchSnapshot();
  });

  it("should allow us to save a well-formed profile", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let saveResponse: IProfileSaved;
    try {
      const profile: any = {name: "good_apple", description: "A tasty apple", rotten: false, age: 1};
      saveResponse = await prof.save({
        profile,
        overwrite: true
      });
    } catch (e) {
      error = e;
      TestLogger.info(e.message);
    }
    expect(error).toBeUndefined();
    expect(saveResponse.message).toContain('Profile ("good_apple" of type "apple") successfully written:');
    expect(saveResponse.profile).toMatchSnapshot();
  });

  it("should allow us to save a profile with a dependency", async () => {
    const copy = JSON.parse(JSON.stringify(STRAWBERRY_WITH_REQUIRED_APPLE_DEPENDENCY));
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: copy,
      type: STRAWBERRY_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let saveResponse: IProfileSaved;
    try {
      const strawberry: any = {
        name: "chocolate_covered",
        type: STRAWBERRY_PROFILE_TYPE,
        amount: 10000,
        description: "Strawberries covered in chocolate.",
        dependencies: [
          {
            type: APPLE_PROFILE_TYPE,
            name: "tasty_apples"
          }
        ]
      };
      saveResponse = await prof.save({
        profile: strawberry,
        overwrite: true
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeUndefined();
    expect(saveResponse.message).toContain('Profile ("chocolate_covered" of type "strawberry") successfully written:');
    expect(saveResponse.profile).toMatchSnapshot();
  });

  it("should not allow us to overwrite a profile if overwrite false (or not specified)", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let saveResponse: IProfileSaved;
    try {
      const profile: any = {name: "good_apple", description: "A tasty apple", rotten: false, age: 1};
      saveResponse = await prof.save({
        profile,
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should not allow a save with a circular dependency", async () => {
    const copy = JSON.parse(JSON.stringify(APPLE_TWO_REQ_DEP_BANANA_ONE_REQ_DEP_GRAPE_ONE_REQ_DEP));
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: copy,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      response = await prof.save({
        profile: {
          name: "apple_with_two_req_dep_circular",
          age: 1000,
          description: "An old apple",
          rotten: true,
          dependencies: [
            {
              type: STRAWBERRY_PROFILE_TYPE,
              name: "chocolate_covered"
            },
            {
              type: BANANA_PROFILE_TYPE,
              name: "banana_with_grape_dep"
            }
          ]
        },
        overwrite: true
      });
      TestLogger.error(response.message);
      TestLogger.error("Save response: \n" + inspect(response, {depth: null}));
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should not allow a save with no contents", async () => {
    const copy = JSON.parse(JSON.stringify(ONLY_APPLE));
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: copy,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let response: IProfileSaved;
    try {
      response = await prof.save({
        profile: {
          name: "no_apple_core",
        },
        overwrite: true
      });
    } catch (e) {
      error = e;
      TestLogger.info(error);
    }
    expect(error).toBeDefined();
    expect(error instanceof ImperativeError).toBe(true);
    expect(error.message).toMatchSnapshot();
  });

  it("should not allow us to save a profile that lists dependencies of types that were not defined", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: ONLY_APPLE,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let saveResponse: IProfileSaved;
    try {
      const profile: any = {
        name: "good_apple",
        description: "A tasty apple",
        rotten: false,
        age: 1,
        dependencies: [{name: "bad_pear", type: "pear"}]
      };
      saveResponse = await prof.save({
        profile,
        overwrite: true
      });
    } catch (e) {
      error = e;
      TestLogger.info(e.message);
    }
    expect(error).toBeDefined();
    expect(error.message).toMatchSnapshot();
  });

  it("should fail a save request if a profile has more properties than defined on the schema", async () => {
    const prof = new BasicProfileManager({
      profileRootDirectory: TEST_PROFILE_ROOT_DIR,
      typeConfigurations: APPLE_BAN_UNKNOWN,
      type: APPLE_PROFILE_TYPE,
      logger: TestLogger.getTestLogger()
    });

    let error;
    let saveResponse: IProfileSaved;
    try {
      const profile: any = {
        name: "tasty_apple",
        description: "A tasty apple",
        rotten: false,
        age: 1,
        seedless: false
      };
      saveResponse = await prof.save({
        profile,
        overwrite: true
      });
    } catch (e) {
      error = e;
      TestLogger.info(e.message);
    }
    expect(error).toBeDefined();
    expect(error.message).toMatchSnapshot();
  });
});
