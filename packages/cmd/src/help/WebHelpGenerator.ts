import * as fs from "fs";
import * as marked from "marked";
import * as path from "path";
import * as rimraf from "rimraf";
import { DefaultHelpGenerator } from "./DefaultHelpGenerator";
import { ICommandDefinition } from "../doc/ICommandDefinition";
import { IWebHelpGenerator } from "./doc/IWebHelpGenerator";
import { ImperativeConfig, Imperative } from "../../../imperative";

interface ITreeNode {
    id: string;
    text: string;
    children?: ITreeNode[];
}

export class WebHelpGenerator implements IWebHelpGenerator {
    private mConfig: ImperativeConfig;
    private mDocsDir: string;

    private treeNodes: ITreeNode[];
    private aliasList: { [key: string]: string[] };

    constructor(config: ImperativeConfig, docsDir: string) {
        this.mConfig = config;
        this.mDocsDir = docsDir;
        this.treeNodes = [];
        this.aliasList = {};
    }

    public buildHelp() {
        // TODO Write output to Imperative log
        process.stdout.write("Generating web help");

        if (fs.existsSync(this.mDocsDir)) {
            rimraf.sync(path.join(this.mDocsDir, "*"));
        } else {
            fs.mkdirSync(this.mDocsDir);
        }

        const uniqueDefinitions = Imperative.fullCommandTree;
        uniqueDefinitions.children = uniqueDefinitions.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter((item, pos, self) => self.indexOf(item) === pos);  // Remove duplicate items

        const rootCommandName: string = Imperative.rootCommandName;
        const rootHelpHtmlPath = path.join(this.mDocsDir, "docs", `${rootCommandName}.html`);
        this.treeNodes.push({ id: `${rootCommandName}.html`, text: rootCommandName });

        let rootHelpContent = this.genDocsHeader(rootCommandName);
        rootHelpContent += `<h2><a href="${rootCommandName}.html">${rootCommandName}</a></h2>\n`;
        rootHelpContent += marked(this.mConfig.loadedConfig.rootCommandDescription) + "\n";
        const helpGen = new DefaultHelpGenerator({ produceMarkdown: true, rootCommandName } as any,
            { commandDefinition: uniqueDefinitions, fullCommandTree: uniqueDefinitions });
        rootHelpContent += marked(`<h4>Groups</h4>\n` + this.processChildrenSummaryTables(helpGen, rootCommandName));
        rootHelpContent += this.genDocsFooter();
        fs.writeFileSync(rootHelpHtmlPath, rootHelpContent);
        process.stdout.write(".");

        uniqueDefinitions.children.forEach((def) => {
            this.genCommandHelpPage(def, def.name, this.mDocsDir, path.dirname(this.mConfig.loadedConfig.defaultHome), this.treeNodes[0]);
        });

        process.stdout.write("\nFinished generating web help, launching in browser now\n");
        this.writeTreeData();
    }

    private templatizeImperativeDir(html: string): string {
        return html.replace(/{{IMPERATIVE_DIR}}/g, ImperativeConfig.instance.callerLocation);
    }

    private genDocsHeader(title: string): string {
        return this.templatizeImperativeDir(`<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="ie=edge">
<title>${title}</title>
<link rel="stylesheet" href="{{IMPERATIVE_DIR}}/node_modules/balloon-css/balloon.min.css">
<link rel="stylesheet" href="{{IMPERATIVE_DIR}}/node_modules/github-markdown-css/github-markdown.css">
<link rel="stylesheet" href="{{IMPERATIVE_DIR}}/help-site/dist/css/docs.css">
<article class="markdown-body">
`);
    }

    private genDocsFooter(): string {
        return this.templatizeImperativeDir(`</article>
<script src="{{IMPERATIVE_DIR}}/node_modules/clipboard/dist/clipboard.min.js"></script>
<script src="{{IMPERATIVE_DIR}}/help-site/dist/js/docs.js"></script>
`);
    }

    private genBreadcrumb(baseName: string, fullCommandName: string): string {
        const crumbs: string[] = [];
        let hrefPrefix: string = "";
        [baseName, ...fullCommandName.split("_")].forEach((linkText: string) => {
            crumbs.push(`<a href="${hrefPrefix}${linkText}.html">${linkText}</a>`);
            hrefPrefix += `${linkText}_`;
        });
        return crumbs.join(" → ");
    }

    private processChildrenSummaryTables(helpGen: DefaultHelpGenerator, fullCommandName: string): string {
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

    private genCommandHelpPage(definition: ICommandDefinition, fullCommandName: string, docsDir: string, homeDir: string, parentNode: ITreeNode) {
        const rootCommandName: string = this.treeNodes[0].text;
        const helpGen = new DefaultHelpGenerator({ produceMarkdown: true, rootCommandName } as any,
            { commandDefinition: definition, fullCommandTree: Imperative.fullCommandTree });

        let markdownContent = helpGen.buildHelp() + "\n";
        markdownContent = markdownContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (definition.type === "group") {
            // this is disabled for the CLIReadme.md but we want to show children here
            // so we'll call the help generator's children summary function even though
            // it's usually skipped when producing markdown
            markdownContent += `<h4>Commands</h4>\n` + this.processChildrenSummaryTables(helpGen, rootCommandName + "_" + fullCommandName);
        }

        let htmlContent = this.genDocsHeader(fullCommandName.replace(/_/g, " "));
        htmlContent += `<h2>` + this.genBreadcrumb(rootCommandName, fullCommandName) + `</h2>\n`;
        htmlContent += marked(markdownContent) + this.genDocsFooter();

        // Remove backslash escapes from URLs
        htmlContent = htmlContent.replace(/(%5C(?=.+?>.+?<\/a>)|\\(?=\..+?<\/a>))/g, "");

        // Sanitize references to user's home directory
        htmlContent = htmlContent.replace(new RegExp(homeDir.replace(/[\\/]/g, "."), "g"),
            homeDir.slice(0, homeDir.lastIndexOf(path.sep) + 1) + "&lt;user&gt;");

        // Add Copy buttons after command line examples
        htmlContent = htmlContent.replace(/<code>\$\s*(.*?)<\/code>/g,
            "<code>$1</code> <button class=\"btn-copy\" data-balloon-pos=\"right\" data-clipboard-text=\"$1\">Copy</button>");

        const helpHtmlFile = `${rootCommandName}_${fullCommandName.trim()}.html`;
        const helpHtmlPath = path.join(docsDir, "docs", helpHtmlFile);
        fs.writeFileSync(helpHtmlPath, htmlContent);
        process.stdout.write(".");

        const childNode: ITreeNode = {
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

        if (definition.children) {
            definition.children.forEach((child: any) => {
                this.genCommandHelpPage(child, `${fullCommandName}_${child.name}`, docsDir, homeDir, childNode);
            });
        }
    }

    private writeTreeData() {
        const treeDataPath = path.join(this.mDocsDir, "tree-data.js");
        fs.writeFileSync(treeDataPath,
            "/* This file is automatically generated, do not edit manually! */\n" +
            `const headerStr = "${this.mConfig.loadedConfig.productDisplayName}";\n` +
            `const footerStr = "${this.mConfig.callerPackageJson.name} ${this.mConfig.callerPackageJson.version}";\n` +
            "const treeNodes = " + JSON.stringify(this.treeNodes, null, 2) + ";\n" +
            "const aliasList = " + JSON.stringify(this.aliasList, null, 2) + ";\n");
    }
}
