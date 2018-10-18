import { ImperativeError } from "../../../../error";

/**
 * This error is thrown when a require to the host cli package included a submodule
 * import. It should never occur within a host cli or imperative but could happen
 * when a plugin gets installed.
 */
export class UnsupportedImportError extends ImperativeError {
    constructor(request: string) {
        super({
            msg: `Could not load module: ${request}`,
            additionalDetails: "Submodule imports are not supported by the hook interface!"
        });
    }
}
