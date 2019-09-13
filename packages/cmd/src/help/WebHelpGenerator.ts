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

import * as fs from "fs";
import * as path from "path";

import { DefaultHelpGenerator } from "./DefaultHelpGenerator";
import { ICommandDefinition } from "../doc/ICommandDefinition";
import { ImperativeConfig } from "../../../utilities";
import { IHandlerResponseApi } from "../doc/response/api/handler/IHandlerResponseApi";
import { ImperativeError } from "../../../error";
import { Logger } from "../../../logger";
import { IWebHelpTreeNode } from "./doc/IWebHelpTreeNode";

/**
 * Imperative web help generator. Accepts the command definitions and constructs
 * the full help text for the command node.
 *
 * @export
 * @class WebHelpGenerator
 */
export class WebHelpGenerator {
    /**
     * Specifies whether user's home directory should be redacted from help content
     * @memberof WebHelpGenerator
     */
    public sanitizeHomeDir: boolean = false;

    /**
     * Imperative command tree to build help for
     * @private
     * @memberof WebHelpGenerator
     */
    private mFullCommandTree: ICommandDefinition;

    /**
     * Imperative config containing data about the CLI
     * @private
     * @memberof WebHelpGenerator
     */
    private mConfig: ImperativeConfig;

    /**
     * Output directory for HTML doc pages
     * @private
     * @memberof WebHelpGenerator
     */
    private mDocsDir: string;

    /**
     * Marked module used to convert markdown to HTML
     * @private
     * @memberof WebHelpGenerator
     */
    private marked: any;

    /**
     * List of nodes in command tree
     * @private
     * @memberof WebHelpGenerator
     */
    private treeNodes: IWebHelpTreeNode[];

    /**
     * Key value list of commands and their aliases
     * @private
     * @memberof WebHelpGenerator
     */
    private aliasList: { [key: string]: string[] };

    /**
     * Used to build single page version of web help
     * @private
     * @memberof WebHelpGenerator
     */
    private singlePageHtml: string;

    /**
     * Create an instance of WebHelpGenerator.
     * @param {ICommandDefinition} - Imperative command tree to build help for
     * @param {ImperativeConfig} - Imperative config containing data about the CLI
     * @param {string} - Output directory for web help files
     */
    constructor(fullCommandTree: ICommandDefinition, config: ImperativeConfig, webHelpDir: string) {
        this.mFullCommandTree = fullCommandTree;
        this.mConfig = config;
        this.mDocsDir = path.join(webHelpDir, "docs");
        this.treeNodes = [];
        this.aliasList = {};
    }

    /**
     * Build web help files and copy dependencies to output folder
     * @param {IHandlerResponseApi} - Command response object to use for output
     */
    public buildHelp(cmdResponse: IHandlerResponseApi) {
        // Log using buffer to prevent trailing newline from getting added
        // This allows printing dot characters on the same line to show progress
        cmdResponse.console.log(Buffer.from("Generating web help"));

        // Load additional dependencies
        this.marked = require("marked");
        const copySync: any = require("fs-extra").copySync;

        // Create web-help folder
        // After upgrading to Node v10, this step should no longer be necessary
        // if the option recursive=True is used when the docs dir is created
        // below
        const webHelpDir: string = path.join(this.mDocsDir, "..");
        if (!fs.existsSync(webHelpDir)) {
            fs.mkdirSync(webHelpDir);
        }

        // Create web-help/docs folder
        if (fs.existsSync(this.mDocsDir)) {
            require("rimraf").sync(path.join(this.mDocsDir, "*"));
        } else {
            fs.mkdirSync(this.mDocsDir);
        }

        // Copy files from dist folder to .zowe home dir
        const distDir: string = this.webHelpDistDir;
        const dirsToCopy: string[] = [distDir, path.join(distDir, "css"), path.join(distDir, "js")];
        dirsToCopy.forEach((dir: string) => {
            const destDir = path.join(webHelpDir, path.relative(distDir, dir));

            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir);
            }

            fs.readdirSync(dir)
                .filter((pathname: string) => fs.statSync(path.join(dir, pathname)).isFile())
                .forEach((filename: string) => copySync(path.join(dir, filename), path.join(destDir, filename)));
        });

        // Copy header image if it exists
        if (this.mConfig.loadedConfig.webHelpLogoImgPath) {
            copySync(this.mConfig.loadedConfig.webHelpLogoImgPath, path.join(webHelpDir, "header-image.png"));
        }

        // Replace main.css with custom CSS file if it exists
        if (this.mConfig.loadedConfig.webHelpCustomCssPath) {
            copySync(this.mConfig.loadedConfig.webHelpCustomCssPath, path.join(webHelpDir, "css/main.css"));
        }

        // Sort all items in the command tree and remove duplicates
        const uniqueDefinitions: ICommandDefinition = this.mFullCommandTree;
        uniqueDefinitions.children = uniqueDefinitions.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter((a, pos, self) => self.findIndex((b) => a.name === b.name) === pos);

        // Generate HTML help file for the root CLI command
        const rootCommandName: string = this.mConfig.rootCommandName;
        const rootHelpHtmlPath: string = path.join(this.mDocsDir, `${rootCommandName}.html`);
        this.treeNodes.push({ id: `${rootCommandName}.html`, text: rootCommandName });

        let rootHelpContent: string = this.genDocsHeader(rootCommandName);
        rootHelpContent += `<h2><a href="${rootCommandName}.html" name="${rootCommandName}">${rootCommandName}</a></h2>\n`;
        rootHelpContent += this.marked(this.mConfig.loadedConfig.rootCommandDescription) + "\n";
        const helpGen = new DefaultHelpGenerator({ produceMarkdown: true, rootCommandName } as any,
            { commandDefinition: uniqueDefinitions, fullCommandTree: uniqueDefinitions });
        this.singlePageHtml = rootHelpContent.repeat(1);  // Deep copy
        rootHelpContent += this.marked("<h4>Groups</h4>\n" + this.buildChildrenSummaryTables(helpGen, rootCommandName));
        rootHelpContent += this.genDocsFooter();
        fs.writeFileSync(rootHelpHtmlPath, rootHelpContent);
        cmdResponse.console.log(Buffer.from("."));

        // Generate HTML help files for every CLI command
        uniqueDefinitions.children.forEach((def) => {
            cmdResponse.console.log(Buffer.from("."));
            this.genCommandHelpPage(def, def.name, this.mDocsDir, this.treeNodes[0]);
        });

        // Generate single HTML file for all CLI commands
        this.singlePageHtml += this.genDocsFooter();
        this.singlePageHtml = this.singlePageHtml.replace(new RegExp(`<a href="(${rootCommandName}.*?)\.html"`, "g"), "<a href=\"#$1\"");
        fs.writeFileSync(path.join(this.mDocsDir, "all.html"), this.singlePageHtml);

        this.writeTreeData();
        cmdResponse.console.log("done!");
    }

    /**
     * Finds directory where web help dependencies are stored
     * @readonly
     * @private
     * @returns {string} Absolute path of the directory
     */
    private get webHelpDistDir(): string {
        const runtimeDistDir = path.join(path.dirname(process.mainModule.filename),
            "..", "node_modules", "@zowe", "imperative", "web-help", "dist");
        let distDir = runtimeDistDir;

        if (!fs.existsSync(runtimeDistDir)) {
            const impLogger: Logger = Logger.getImperativeLogger();
            impLogger.error(
                "webHelpDistDir: The web-help runtime distribution directory does not exist:\n    " +
                runtimeDistDir + "\n    " +
                "To work in a development environment, we will also try a source directory."
            );

            /* During development we do not have a runtime distribution path,
             * so fallback to a source directory path.
             */
            distDir = path.join(__dirname, "../../../..", "web-help", "dist");
            if (!fs.existsSync(distDir)) {
                impLogger.error(
                    "webHelpDistDir: The web-help source distribution directory does not exist:\n    " +
                    distDir
                );

                /* The dev directory was just an in-house fallback.
                 * If neither exist, just report the runtime directory to our user.
                 */
                throw new ImperativeError({
                    msg: `The web-help distribution directory does not exist:\n    "${runtimeDistDir}"`
                });
            }

        }
        return distDir;
    }

    /**
     * Returns header HTML for help page
     * @private
     * @param title - Title string for the page
     */
    private genDocsHeader(title: string): string {
        return `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="ie=edge">
<title>${title}</title>
<link rel="stylesheet" href="../css/bundle-docs.css">
<link rel="stylesheet" href="../css/docs.css">
<article class="markdown-body">
`;
    }

    /**
     * Returns footer HTML for help page
     * @private
     */
    private genDocsFooter(): string {
        return `</article>
<script src="../js/bundle-docs.js"></script>
<script src="../js/docs.js"></script>
`;
    }

    /**
     * Builds breadcrumb of HTML links to show command ancestry
     * @private
     * @param {string} rootCommandName
     * @param {string} fullCommandName
     */
    private genBreadcrumb(rootCommandName: string, fullCommandName: string): string {
        const crumbs: string[] = [];
        let hrefPrefix: string = "";
        [rootCommandName, ...fullCommandName.split("_")].forEach((linkText: string) => {
            crumbs.push(`<a href="${hrefPrefix}${linkText}.html">${linkText}</a>`);
            hrefPrefix += `${linkText}_`;
        });
        return crumbs.join(" → ");
    }

    /**
     * Builds list of groups/commands with HTML links added
     * @private
     * @param {DefaultHelpGenerator} helpGen
     * @param {string} fullCommandName
     */
    private buildChildrenSummaryTables(helpGen: DefaultHelpGenerator, fullCommandName: string): string {
        const hrefPrefix = fullCommandName + "_";
        return helpGen.buildChildrenSummaryTables().split(/\r?\n/g)
            .slice(1)  // Delete header line
            .map((line: string) => {
                // Wrap group/command names inside links
                const match = line.match(/^\s*([a-z0-9-]+(?:\s\|\s[a-z0-9-]+)*)\s+[A-Z]/);
                if (match) {
                    const href = `${hrefPrefix}${match[1].split(" ")[0]}.html`;
                    return `\n* <a href="${href}">${match[1]}</a> -` + line.slice(match[0].length - 2);
                }
                return " " + line.trim();
            }).join("");
    }

    /**
     * Appends help content for individual command/group to single page HTML
     * @private
     * @param {ICommandDefinition} definition
     * @param {string} rootCommandName
     * @param {string} fullCommandName
     * @param {string} htmlContent
     */
    private appendToSinglePageHtml(definition: ICommandDefinition, rootCommandName: string, fullCommandName: string, htmlContent: string) {
        // Separate with horizontal line if start of a new top level group
        if (fullCommandName.indexOf("_") === -1) {
            this.singlePageHtml += "<hr>\n";
        }

        // Generate HTML anchor in front of header
        const anchorText = `<a${(definition.type !== "group") ? " class=\"cmd-anchor\"" : ""} name="${rootCommandName}_${fullCommandName}"></a>`;

        if (definition.type === "group") {
            // Remove sections from HTML that would be redundant
            this.singlePageHtml += anchorText + htmlContent.slice(0, htmlContent.indexOf("<h4"));
        } else {
            // Make header smaller for commands
            this.singlePageHtml += anchorText + htmlContent.replace(/<h2/, "<h3").replace(/h2>/, "h3>");
        }
    }

    /**
     * Generates HTML help page for Imperative command
     * @private
     * @param {ICommandDefinition} definition
     * @param {string} fullCommandName
     * @param {string} docsDir
     * @param {ITreeNode} parentNode
     */
    private genCommandHelpPage(definition: ICommandDefinition, fullCommandName: string, docsDir: string, parentNode: IWebHelpTreeNode) {
        const rootCommandName: string = this.treeNodes[0].text;
        const helpGen = new DefaultHelpGenerator({ produceMarkdown: true, rootCommandName } as any,
            { commandDefinition: definition, fullCommandTree: this.mFullCommandTree });

        let markdownContent = helpGen.buildHelp() + "\n";
        markdownContent = markdownContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (definition.type === "group") {
            // this is disabled for the CLIReadme.md but we want to show children here
            // so we'll call the help generator's children summary function even though
            // it's usually skipped when producing markdown
            markdownContent += "<h4>Commands</h4>\n" + this.buildChildrenSummaryTables(helpGen, rootCommandName + "_" + fullCommandName);
        }

        let htmlContent = "<h2>" + this.genBreadcrumb(rootCommandName, fullCommandName) + "</h2>\n";
        htmlContent += this.marked(markdownContent);
        this.appendToSinglePageHtml(definition, rootCommandName, fullCommandName, htmlContent);
        htmlContent = this.genDocsHeader(fullCommandName.replace(/_/g, " ")) + htmlContent + this.genDocsFooter();

        // Remove backslash escapes from URLs
        htmlContent = htmlContent.replace(/(%5C(?=.+?>.+?<\/a>)|\\(?=\..+?<\/a>))/g, "");

        // Add Copy buttons after command line examples
        htmlContent = htmlContent.replace(/<code>\$\s*(.*?)<\/code>/g,
            "<code>$1</code> <button class=\"btn-copy\" data-balloon-pos=\"right\" data-clipboard-text=\"$1\">Copy</button>");

        // Sanitize references to user's home directory
        if (this.sanitizeHomeDir) {
            const homeDir = path.dirname(this.mConfig.loadedConfig.defaultHome);
            htmlContent = htmlContent.replace(new RegExp(homeDir.replace(/[\\/]/g, "."), "g"),
                homeDir.slice(0, homeDir.lastIndexOf(path.sep) + 1) + "&lt;user&gt;");
        }

        const helpHtmlFile = `${rootCommandName}_${fullCommandName.trim()}.html`;
        const helpHtmlPath = path.join(docsDir, helpHtmlFile);
        fs.writeFileSync(helpHtmlPath, htmlContent);

        // Add command node and list of aliases to tree data
        const childNode: IWebHelpTreeNode = {
            id: helpHtmlFile,
            text: [definition.name, ...definition.aliases].join(" | ")
        };
        parentNode.children = [...(parentNode.children || []), childNode];

        definition.aliases.forEach((alias: string) => {
            if (alias !== definition.name) {
                if (this.aliasList[alias] === undefined) {
                    this.aliasList[alias] = [definition.name];
                } else if (this.aliasList[alias].indexOf(definition.name) === -1) {
                    this.aliasList[alias].push(definition.name);
                }
            }
        });

        // Recursively generate HTML help pages if this group/command has children
        if (definition.children) {
            definition.children.forEach((child: any) => {
                this.genCommandHelpPage(child, `${fullCommandName}_${child.name}`, docsDir, childNode);
            });
        }
    }

    /**
     * Writes data for building web help command tree to JS file
     * @private
     */
    private writeTreeData() {
        const treeDataPath = path.join(this.mDocsDir, "..", "tree-data.js");
        fs.writeFileSync(treeDataPath,
            "/* This file is automatically generated, do not edit manually! */\n" +
            `const headerStr = "${this.mConfig.loadedConfig.productDisplayName}";\n` +
            `const footerStr = "${this.mConfig.callerPackageJson.name} ${this.mConfig.callerPackageJson.version}";\n` +
            "const treeNodes = " + JSON.stringify(this.treeNodes) + ";\n" +
            "const aliasList = " + JSON.stringify(this.aliasList) + ";\n" +
            "const cmdToLoad = null;");
    }
}
