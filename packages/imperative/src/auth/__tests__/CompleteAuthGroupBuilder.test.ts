import { CompleteAuthGroupBuilder } from "../builders/CompleteAuthGroupBuilder";
import { Logger } from "../../../../logger";
import { ICommandProfileAuthConfig } from "../../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";
import { ICommandDefinition } from "../../../../cmd";
import { fakeAuthConfig } from "./__data__/SampleAuthConfig";

const authConfigs: {[key: string]: ICommandProfileAuthConfig[]} = {
    base: [ fakeAuthConfig ]
};

describe("CompleteAuthGroupBuilder", () => {
    it("should create complete auth group given an auth config object", () => {
        const cmdDef: ICommandDefinition = CompleteAuthGroupBuilder.getAuthGroup(authConfigs, Logger.getImperativeLogger());
        expect(cmdDef).toMatchSnapshot();
    });
});
