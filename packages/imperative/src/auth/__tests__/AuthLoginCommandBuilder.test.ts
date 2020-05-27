import { AuthLoginCommandBuilder } from "../builders/AuthLoginCommandBuilder";
import { Logger } from "../../../../logger";
import { Constants } from "../../../../constants";
import { minimalAuthConfig } from "./__data__/SampleAuthConfig";
import { ICommandDefinition } from "../../../../cmd";


describe("AuthLoginCommandBuilder", () => {
    it("should build command successfully if valid auth config supplied", () => {
        const builder = new AuthLoginCommandBuilder("base", Logger.getImperativeLogger(), minimalAuthConfig);
        expect(builder.getAction()).toBe(Constants.LOGIN_ACTION);

        const cmdDef: ICommandDefinition = builder.buildFull();
        expect(cmdDef).toBeDefined();
        expect(cmdDef.name).toBe(minimalAuthConfig.serviceName);
    });

    it("should fail to initialize if missing auth config", () => {
        let caughtError;
        try {
            const builder = new AuthLoginCommandBuilder("base", Logger.getImperativeLogger(), null);
        } catch (error) {
            caughtError = error;
        }
        expect(caughtError).toBeDefined();
        expect(caughtError.message).toContain("No auth config was supplied.");
    });
});
