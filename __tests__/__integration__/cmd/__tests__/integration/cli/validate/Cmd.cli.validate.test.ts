import {ITestEnvironment} from "../../../../../../__src__/environment/doc/response/ITestEnvironment";
import {SetupTestEnvironment} from "../../../../../../__src__/environment/SetupTestEnvironment";
import {runCliScript} from "../../../../../../src/TestUtil";

let TEST_ENVIRONMENT: ITestEnvironment;

describe("cmd-cli", () => {

    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await SetupTestEnvironment.createTestEnv({
            cliHomeEnvVar: "CMD_CLI_CLI_HOME",
            testName: "cmd_validate"
        });
    });

    it("should display proper messages when missing positional parameter", async () => {
        const response = runCliScript(__dirname + "/__scripts__/invalid_positional1.sh", TEST_ENVIRONMENT.workingDir);
        expect(response.status).toBe(1);
        expect(response.stderr.toString()).toMatchSnapshot();
        expect(response.stdout.toString()).toMatchSnapshot();
    });
}