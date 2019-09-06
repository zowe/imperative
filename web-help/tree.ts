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

// Imports to help Browserify find dependencies
import $ from "jquery";
const bootstrap = require("bootstrap");
const jstree = require("jstree");

// Recursive object used for command tree node
interface ITreeNode {
    id: string;
    text: string;
    children?: ITreeNode[];
}

// Declare variables loaded from tree-data.js
declare const headerStr: string;
declare const footerStr: string;
declare const treeNodes: ITreeNode[];
declare const aliasList: { [key: string]: string[] };
declare const cmdToLoad: string;

// Define global variables
let currentNodeId: string;
let isFlattened: boolean = false;
let searchStrList: string[];
let searchTimeout: number = 0;

/**
 * Called by jsTree for each node to check if it matches search string
 * @param _ - Search string (unused because `searchStrList` is used instead)
 * @param node - Tree node being checked
 * @returns {boolean} True if the node matches
 */
function searchTree(_: string, node: any): boolean {
    if ((node.parent === "#") && !isFlattened) {
        return false;  // Don't match root node
    }

    // Do fuzzy search that allows space or no char to be substituted for hyphen
    const fullCmd: string = node.id.slice(0, -5).replace(/_/g, " ");
    for (const haystack of [fullCmd, fullCmd.replace(/-/g, " "), fullCmd.replace(/-/g, "")]) {
        for (const needle of searchStrList) {
            const matchIndex: number = haystack.lastIndexOf(needle);
            if (matchIndex !== -1) {  // A search string was matched
                if (isFlattened || (haystack.indexOf(" ", matchIndex + needle.length) === -1)) {
                    // Don't match node if text that matches is only in label of parent node
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * Find all possible combinations of a search string that exist with different aliases
 * @param searchStr - Search string input by user
 * @returns List of search strings with all combinations of aliases
 */
function permuteSearchStr(searchStr: string): string[] {
    const searchWords: string[] = searchStr.split(" ");
    const searchWordsList: string[][] = [searchWords];

    for (let i = 0; i < searchWords.length; i++) {
        const word = searchWords[i];

        if (aliasList[word] !== undefined) {
            const newSearchWordsList: string[][] = [];
            searchWordsList.forEach((oldSearchWords: string[]) => {
                aliasList[word].forEach((alias: string) => {
                    newSearchWordsList.push([...oldSearchWords.slice(0, i), alias, ...oldSearchWords.slice(i + 1)]);
                });
            });
            searchWordsList.push(...newSearchWordsList);
        }
    }

    return searchWordsList.map((words: string[]) => words.join(" "));
}

/**
 * Update URL in address bar to contain name of current node
 */
function updateUrl() {
    const baseUrl: string = window.location.href.replace(window.location.search, "");
    let queryString: string = "";
    if (currentNodeId !== treeNodes[0].id) {
        queryString = "?p=" + currentNodeId.slice(0, -5);
    }
    window.history.replaceState(null, "", baseUrl + queryString);
}

/**
 * Select `currentNodeId` in the command tree and scroll it into view
 * @param alsoExpand - Also expand the current node
 */
function selectCurrentNode(alsoExpand: boolean) {
    $("#cmd-tree").jstree(true).deselect_all();
    $("#cmd-tree").jstree(true).select_node(currentNodeId);

    if (alsoExpand) {
        $("#cmd-tree").jstree(true).open_node(currentNodeId);
    }

    const node = document.getElementById(currentNodeId);
    if (node !== null) {
        node.scrollIntoView();
    }

    updateUrl();
}

/**
 * Called when text in search box changes and runs search after 250 ms
 */
function updateSearch() {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTimeout = window.setTimeout(() => {
        const searchStr = ($("#tree-search").val() || "").toString().trim();
        searchStrList = permuteSearchStr(searchStr);
        $("#cmd-tree").jstree(true).search(searchStr);
    }, 250);
}

/**
 * Generate flattened list of tree nodes for list view
 * @param nestedNodes - Node list for command tree
 * @returns Flattened node list
 */
function genFlattenedNodes(nestedNodes: ITreeNode[]): ITreeNode[] {
    const flattenedNodes: ITreeNode[] = [];

    nestedNodes.forEach((node: ITreeNode) => {
        if (node.children && (node.children.length > 0)) {
            flattenedNodes.push(...genFlattenedNodes(node.children));
        } else {
            flattenedNodes.push({
                id: node.id,
                text: node.id.slice(0, -5).replace(/_/g, " "),
                children: undefined
            });
        }
    });

    return flattenedNodes;
}

/**
 * Load command tree sidebar
 */
function loadTree() {
    const urlParams = new URLSearchParams(window.location.search);

    // Set header and footer strings
    $("#header-text").text(headerStr);
    $("#footer").text(footerStr);

    // Load jsTree
    $("#cmd-tree").jstree({
        core: {
            animation: 0,
            multiple: false,
            themes: {
                icons: false
            },
            data: treeNodes
        },
        plugins: ["search", "wholerow"],
        search: {
            show_only_matches: true,
            show_only_matches_children: true,
            search_callback: searchTree
        },
    }).on("changed.jstree", (_: any, data: any) => {
        // Change src attribute of iframe when item selected
        if (data.selected.length > 0) {
            currentNodeId = data.selected[0];
            $("#docs-page").attr("src", `./docs/${currentNodeId}`);
            updateUrl();
        }
    }).on("loaded.jstree", () => {
        // Select and expand root node when page loads
        const nodeId = cmdToLoad || urlParams.get("p");
        currentNodeId = (nodeId === null) ? treeNodes[0].id : `${nodeId}.html`;
        selectCurrentNode(true);
    });

    // Flatten tree view if t=0 param specified
    if (urlParams.get("t") === "0") {
        toggleTreeView();
    }

    // Update search status when text in search box changes
    $("#tree-search").on("change keyup mouseup paste", updateSearch);

    // Receive signals from iframe when link is clicked to update selected node
    window.addEventListener("message", (e: any) => {
        currentNodeId = e.data.slice(e.data.lastIndexOf("/") + 1);
        selectCurrentNode(false);
    }, false);
}

/**
 * Toggle visibility of sidebar
 * @param splitter - SplitJS object
 */
function toggleTree(splitter: any) {
    if ($("#panel-left").is(":visible")) {
        $("#panel-left").children().hide();
        $("#panel-left").hide();
        splitter.setSizes([0, 100]);
    } else {
        splitter.setSizes([20, 80]);
        $("#panel-left").show();
        $("#panel-left").children().show();
    }
}

/**
 * Toggle whether tree nodes are nested or flattened
 */
function toggleTreeView() {
    isFlattened = !isFlattened;
    const newNodes = isFlattened ? genFlattenedNodes(treeNodes) : treeNodes;
    ($("#cmd-tree").jstree(true) as any).settings.core.data = newNodes;
    $("#cmd-tree").jstree(true).refresh(false, true);
    setTimeout(() => {
        selectCurrentNode(true);
        updateSearch();
    }, 100);
    const otherViewName = isFlattened ? "Tree View" : "List View";
    $("#tree-view-toggle").text(`Switch to ${otherViewName}`);
    $("#tree-expand-all").toggle();
    $("#tree-collapse-all").toggle();
}

/**
 * Expand or collapse all nodes in command tree
 * @param expanded - True to expand all, False to collapse all
 */
function expandAll(expanded: boolean) {
    if (expanded) {
        $("#cmd-tree").jstree("open_all");
    } else {
        $("#cmd-tree").jstree("close_all");
        $("#cmd-tree").jstree(true).toggle_node(treeNodes[0].id);
    }
}
