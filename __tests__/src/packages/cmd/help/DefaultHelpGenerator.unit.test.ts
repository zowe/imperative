import { DefaultHelpGenerator } from "../../../../../packages/cmd/src/help/DefaultHelpGenerator";


describe("Test DefaultHelpGenerator", () => {
    test("escapeMarkdown: removing ansi escape codes", async () => {
        // @ts-ignore
        const result = DefaultHelpGenerator.prototype.escapeMarkdown(
            `Specifies whether to verify that the objects to be created do not exist\
 on the Db2 subsystem and that the related objects that are required for successful creation\
 of the objects exist on the Db2 subsystem or in the input DDL.
 \n \u001b[90m Default value: no \u001b[0m`
        );

        expect(result).toMatchSnapshot();
    });
});
