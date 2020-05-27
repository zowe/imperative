import { ICommandProfileAuthConfig } from "../../../../../cmd/src/doc/profiles/definition/ICommandProfileAuthConfig";
import { ICommandOptionDefinition } from "../../../../../cmd";

const fakeOption: ICommandOptionDefinition = {
    name: "fake",
    description: "Fake command option",
    type: "string"
};

export const fakeAuthConfig: ICommandProfileAuthConfig = {
    serviceName: "fakeService",
    handler: "fakeHandler",
    login: {
        description: "Fake login command",
        examples: [
            {
                description: "Fake login example",
                options: ""
            }
        ],
        options: [ fakeOption ]
    },
    logout: {
        description: "Fake logout command",
        examples: [
            {
                description: "Fake logout example",
                options: ""
            }
        ],
        options: [ fakeOption ]
    }
};

export const minimalAuthConfig: ICommandProfileAuthConfig = {
    serviceName: "fakeService",
    handler: "fakeHandler"
};
