import { ImperativeConfig } from "../../utilities";
import { ImperativeError } from "../../error";

export function secureSaveError(solution?: string): ImperativeError {
    let details = `Problem: The Secure Credential feature is not installed. You may need to contact your security administrator to enable this ` +
        `feature.\n\n`;
    const displayName = ImperativeConfig.instance.loadedConfig.productDisplayName || ImperativeConfig.instance.loadedConfig.name;
    if (solution == null) {
        details += `Solution: Install the prerequisites listed in ${ImperativeConfig.instance.loadedConfig.name} documentation for the Secure ` +
            `Credential feature, and then reinstall ${displayName}.`;
    } else {
        details += `Solutions:\n(1) Install the prerequisites listed in ${ImperativeConfig.instance.loadedConfig.name} documentation for the ` +
            `Secure Credential feature, and then reinstall ${displayName}.\n(2)${solution}`;
    }
    return new ImperativeError({
        msg: "Unable to save credentials.",
        additionalDetails: details
    });
}
