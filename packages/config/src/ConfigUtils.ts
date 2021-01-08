import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";

export function secureSaveError(solution?: string): ImperativeError {
    const displayName = ImperativeConfig.instance.loadedConfig.productDisplayName || ImperativeConfig.instance.loadedConfig.name;
    let details = `Possible Solutions:\n` +
        ` 1. Reinstall ${displayName}. On Linux systems, also make sure to install the prerequisites listed in ${displayName} documentation.\n` +
        ` 2. Ensure ${displayName} can access secure credential storage. ${displayName} needs access to the OS to securely store credentials.`;
    if (solution != null) {
        details += ` 3. ${solution}`;
    }
    return new ImperativeError({
        msg: "Unable to securely save credentials.",
        additionalDetails: details
    });
}
