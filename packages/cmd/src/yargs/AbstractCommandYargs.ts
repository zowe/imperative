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

import { Arguments, Argv } from "yargs";
import { Logger } from "../../../logger";
import { ICommandDefinition } from "../doc/ICommandDefinition";
import { CommandProcessor } from "../CommandProcessor";
import { Constants } from "../../../constants";
import { IYargsParms } from "./doc/IYargsParms";
import { ICommandResponseParms } from "../../../cmd/src/doc/response/parms/ICommandResponseParms";
import { ImperativeYargsCommandAction, IYargsResponse } from "./doc/IYargsResponse";
import { GroupCommandYargs } from "./GroupCommandYargs";
import { HelpGeneratorFactory } from "../help/HelpGeneratorFactory";
import { IProfileManagerFactory } from "../../../profiles";
import { ICommandProfileTypeConfiguration } from "../doc/profiles/definition/ICommandProfileTypeConfiguration";
import { IHelpGeneratorFactory } from "../help/doc/IHelpGeneratorFactory";
import { CommandResponse } from "../response/CommandResponse";
import { ICommandResponse } from "../../src/doc/response/response/ICommandResponse";
import { WebHelpManager } from "../help/WebHelpManager";

/**
 * Callback that is invoked when a command defined to yargs completes execution.
 */
export type YargsCommandCompleted = (args: Arguments, response: IYargsResponse) => void;

/**
 * Abstract Yargs Bright Command - Contains base methods for defining commands and groups
 */
export abstract class AbstractCommandYargs {
    /**
     * TODO: REMOVE THIS, workaround for yargs.fail() problem
     * @type {boolean}
     */
    public static STOP_YARGS = false;

    protected log: Logger = Logger.getImperativeLogger();
    /**
     * The command definition document
     */
    private mDefinition: ICommandDefinition;

    /**
     * The Yargs parent object - used to obtain parent handlers.
     */
    private mParent: GroupCommandYargs;

    /**
     * The Yargs instance to define the command.
     */
    private mYargsInstance: Argv;

    /**
     * Command response parameters - controls command response processing when help and command handlers are invoked
     */
    private mCommandResponseParms: ICommandResponseParms;

    /**
     * The help generator factory for creating help generators for the commands
     */
    private mHelpGeneratorFactory: IHelpGeneratorFactory;

    /**
     * Profile manager factory (for creating managers of certain types)
     * @private
     * @type {IProfileManagerFactory<any>}
     * @memberof AbstractCommandYargs
     */
    private mProfileManagerFactory: IProfileManagerFactory<ICommandProfileTypeConfiguration>;

    /**
     * The root command name for the CLI.
     * @private
     * @type {string}
     * @memberof AbstractCommandYargs
     */
    private mRootCommandName: string;

    /**
     * The command line.
     * @private
     * @type {string}
     * @memberof AbstractCommandYargs
     */
    private mCommandLine: string;

    /**
     * Environmental variable name prefix used to construct configuration environmental variables.
     * @private
     * @type {string}
     * @memberof AbstractCommandYargs
     */
    private mEnvVariablePrefix: string;

    /**
     * Construct the yargs command instance for imperative. Provides the ability to define Imperative commands to Yargs.
     * @param {IYargsParms} yargsParms - Parameter object contains parms for Imperative/Yargs and command response objects
     */
    constructor(protected yargsParms: IYargsParms) {
        this.mYargsInstance = yargsParms.yargsInstance;
        this.mDefinition = yargsParms.commandDefinition;
        this.mParent = yargsParms.yargsParent;
        this.mCommandResponseParms = yargsParms.commandResponseParms;
        this.mProfileManagerFactory = yargsParms.profileManagerFactory;
        this.mHelpGeneratorFactory = yargsParms.helpGeneratorFactory;
        this.mRootCommandName = yargsParms.rootCommandName;
        this.mCommandLine = yargsParms.commandLine;
        this.mEnvVariablePrefix = yargsParms.envVariablePrefix;
    }

    /**
     * Accessor for the root command name for the CLI
     * @readonly
     * @protected
     * @type {string}
     * @memberof AbstractCommandYargs
     */
    protected get rootCommandName(): string {
        return this.mRootCommandName;
    }

    /**
     * Accessor for the command line
     * @readonly
     * @type {string}
     * @memberof AbstractCommandYargs
     */
    protected get commandLine(): string {
        return this.mCommandLine;
    }

    /**
     * Accessor for the Environmental variable prefix
     * @readonly
     * @protected
     * @type {string}
     * @memberof AbstractCommandYargs
     */
    protected get envVariablePrefix(): string {
        return this.mEnvVariablePrefix;
    }

    /**
     * Accessor for the command response parms (for subclasses)
     * @return {ICommandResponseParms} - Command response object
     */
    protected get responseParms(): ICommandResponseParms {
        return this.mCommandResponseParms;
    }

    /**
     * Accessor for the help generator factory.
     * @readonly
     * @protected
     * @type {HelpGeneratorFactory}
     * @memberof AbstractCommandYargs
     */
    protected get helpGeneratorFactory(): IHelpGeneratorFactory {
        return this.mHelpGeneratorFactory;
    }

    /**
     * Accessor for the profile manager factory
     * @readonly
     * @type {IProfileManagerFactory<any>}
     * @memberof AbstractCommandYargs
     */
    protected get profileManagerFactory(): IProfileManagerFactory<any> {
        return this.mProfileManagerFactory;
    }

    /**
     * Returns a copy of the definition.
     * @return {ICommandDefinition}: A copy of the definition.
     */
    get definition(): ICommandDefinition {
        return JSON.parse(JSON.stringify(this.mDefinition));
    }

    /**
     * Returns the Yargs instance.
     * @return {yargs.Argv}: The Yargs instance.
     */
    get yargs(): Argv {
        return this.mYargsInstance;
    }

    /**
     * Get the array of parents.
     * @return {GroupCommandYargs[]}: The array of parents.
     */
    get parents(): GroupCommandYargs[] {
        let parents: GroupCommandYargs[] = [];
        if (this.mParent) {
            parents = parents.concat(this.mParent.parents);
            parents.push(this.mParent);
        }
        return parents;
    }

    /**
     * Construct the Bright command definition "tree" - the full definition document including all parents.
     * @return {ICommandDefinition}: The command definition "tree".
     */
    public constructDefinitionTree(): ICommandDefinition {
        const parents: GroupCommandYargs[] = this.parents;
        return (parents[0]) ? JSON.parse(JSON.stringify(parents[0].definition)) : {};
    }

    /**
     * Define the command to Yargs - Accepts the callback to be invoked when this command has executed.
     * @param {YargsCommandCompleted} commandExecuted: Invoked after the command is executed.
     */
    public abstract defineCommandToYargs(commandExecuted: YargsCommandCompleted): void;

    /**
     * Build The Bright Yargs response for the callback. Includes the Bright command response and status info.
     * @param {boolean} successful: True if the command succeeded
     * @param {string} responseMessage: Response message for display purposes.
     * @param {ImperativeYargsCommandAction} action
     * @param {ICommandResponse[]} responses
     * @return {IYargsResponse}
     */
    protected getBrightYargsResponse(successful: boolean, responseMessage: string,
                                     action: ImperativeYargsCommandAction,
                                     responses?: ICommandResponse[]): IYargsResponse {
        let exitCode: number;
        if (responses != null && responses.length > 0) {
            for (const response of responses) {
                // use the maximum exit code from all command responses
                if (exitCode == null || (response.exitCode != null && response.exitCode > exitCode)) {
                    exitCode = response.exitCode;
                }
            }
        }
        return {
            success: successful,
            message: responseMessage,
            exitCode,
            actionPerformed: action,
            commandResponses: responses || []
        };
    }

    /**
     * Execute the help Command for the definition.
     * @param {YargsCommandCompleted} commandExecuted: The callback when help is complete.
     * @param {Arguments} args: The arguments passed by the user - used for -y.
     */
    protected executeHelp(args: Arguments, commandExecuted: YargsCommandCompleted) {
        /**
         * Allocate the command processor and command response object to execute the help. The command response
         * object is recreated/changed based on the currently specified CLI options
         */
        const newHelpGenerator = this.helpGeneratorFactory.getHelpGenerator({
            commandDefinition: this.definition,
            fullCommandTree: this.constructDefinitionTree(),
            experimentalCommandsDescription: this.yargsParms.experimentalCommandDescription
        });

        let invoked: boolean = false;
        let response;
        try {
            response = new CommandProcessor({
                definition: this.definition,
                fullDefinition: this.constructDefinitionTree(),
                helpGenerator: newHelpGenerator,
                profileManagerFactory: this.profileManagerFactory,
                rootCommandName: this.rootCommandName,
                commandLine: this.commandLine,
                envVariablePrefix: this.envVariablePrefix
            }).help(new CommandResponse({
                silent: false,
                responseFormat: (args[Constants.JSON_OPTION] || false) ? "json" : "default",
            }));
        } catch (helpErr) {
            const errorResponse: IYargsResponse = this.getBrightYargsResponse(false,
                `The help for ${this.definition.name} was invoked and failed.`,
                "help invoked");
            errorResponse.causeErrors = helpErr;
            invoked = true;
            commandExecuted(args, errorResponse);
        }

        if (!invoked) {
            commandExecuted(args, this.getBrightYargsResponse(true,
                `The help for ${this.definition.name} was invoked.`,
                "help invoked", [response]));
        }
    }

    protected executeWebHelp() {
        let fullCommandName: string = this.rootCommandName;
        for (const parent of this.parents) {
            fullCommandName += "_" + parent.definition.name;
        }
        WebHelpManager.instance.openHelp(fullCommandName + "_" + this.definition.name,
            new CommandResponse({ silent: false }));
    }
}
