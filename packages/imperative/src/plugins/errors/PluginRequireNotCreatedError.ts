import { ImperativeError } from "../../../../error";

/**
 * This error is thrown when a call to {@link PluginRequireProvider.destroyPluginHooks} has
 * been made without hooks in place.
 */
export class PluginRequireNotCreatedError extends ImperativeError {
    constructor() {
        super({
            msg: "Hooks have not been initialized. Please use `PluginRequireProvider.createPluginHooks(...)` first"
        });
    }
}
