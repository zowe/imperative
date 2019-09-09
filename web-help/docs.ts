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

const isInIframe: boolean = window.location !== window.parent.location;
const isSinglePage: boolean = window.location.href.indexOf("/all.html") !== -1;
const links: any = document.getElementsByTagName("a");

// Process all <a> tags on page
for (const link of links) {
    const url = link.getAttribute("href");
    if (!url) {
        continue;  // Ignore links with no href
    } else if (url.indexOf("://") > 0 || url.indexOf("//") === 0) {
        // If link is absolute, assume it points to external site and open it in new tab
        link.setAttribute("target", "_blank");
    } else if (isSinglePage) {
        // If link is relative and in single page mode, then change href to an anchor
        link.setAttribute("href", "#" + url.slice(0, -5));
    } else if (isInIframe) {
        // If link is relative and page is inside an iframe, then send signal to command tree when link is clicked to make it update selected node
        link.setAttribute("onclick", "window.parent.postMessage(this.href, '*'); return true;");
    }
}

/**
 * Show tooltip next to copy button that times out after 1 sec
 * @param btn - Button element the tooltip will show next to
 * @param message - Message to show in the tooltip
 */
function setTooltip(btn: any, message: string) {
    btn.setAttribute("aria-label", message);
    btn.setAttribute("data-balloon-visible", "");
    setTimeout(() => {
        btn.removeAttribute("aria-label");
        btn.removeAttribute("data-balloon-visible");
    }, 1000);
}

// Enable clipboard access for copy buttons
const clipboard = new (require("clipboard"))(".btn-copy");
clipboard.on("success", (e: any) => setTooltip(e.trigger, "Copied!"));
clipboard.on("error", (e: any) => setTooltip(e.trigger, "Failed!"));
