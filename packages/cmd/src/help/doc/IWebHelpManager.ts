/**
 * Web help manager API that handles generating and launching of web help.
 * @export
 * @interface IWebHelpManager
 */
export interface IWebHelpManager {
    /**
     * Constructs the help text for a command/group.
     * @returns {string}
     * @memberof IWebHelpManager
     */
    openRootHelp(): void;

    openHelp(inContext: string): void;
}
