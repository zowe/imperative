import * as fs from "fs";
import * as marked from "marked";
import * as path from "path";
import { DefaultHelpGenerator } from "./DefaultHelpGenerator";
import { ICommandDefinition } from "../doc/ICommandDefinition";
import { ImperativeConfig, Imperative } from "../../../imperative";

interface ITreeNode {
    id: string;
    text: string;
    children?: ITreeNode[];
}

export class WebHelpGenerator {
    private mConfig: ImperativeConfig;
    private mDocsDir: string;

    private treeNodes: ITreeNode[];
    private aliasList: { [key: string]: string[] };

    constructor(config: ImperativeConfig, webHelpDir: string) {
        this.mConfig = config;
        this.mDocsDir = path.join(webHelpDir, "docs");
        this.treeNodes = [];
        this.aliasList = {};
    }

    public buildHelp() {
        // TODO Write output to Imperative log
        process.stdout.write("Generating web help");

        const webHelpDir = path.join(this.mDocsDir, "..");
        if (!fs.existsSync(webHelpDir)) {
            fs.mkdirSync(webHelpDir);
        }

        if (fs.existsSync(this.mDocsDir)) {
            require("rimraf").sync(path.join(this.mDocsDir, "*"));
        } else {
            fs.mkdirSync(this.mDocsDir);
        }

        const indexTemplateHtmlPath = path.join(this.imperativeDir, "help-site", "dist", "index.template.html");
        const indexHtmlContent: string = this.detemplatizeImperativeDir(fs.readFileSync(indexTemplateHtmlPath).toString());
        const indexHtmlPath = path.join(webHelpDir, "index.html");
        fs.writeFileSync(indexHtmlPath, indexHtmlContent);

        if (this.mConfig.loadedConfig.webHelpLogoImgPath) {
            fs.createReadStream(this.mConfig.loadedConfig.webHelpLogoImgPath).pipe(
                fs.createWriteStream(path.join(webHelpDir, "header-image.png")));
        }

        const uniqueDefinitions = Imperative.fullCommandTree;
        uniqueDefinitions.children = uniqueDefinitions.children
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter((item, pos, self) => self.indexOf(item) === pos);  // Remove duplicate items

        const rootCommandName: string = Imperative.rootCommandName;
        const rootHelpHtmlPath = path.join(this.mDocsDir, `${rootCommandName}.html`);
        this.treeNodes.push({ id: `${rootCommandName}.html`, text: rootCommandName });

        let rootHelpContent = this.genDocsHeader(rootCommandName);
        rootHelpContent += `<h2><a href="${rootCommandName}.html">${rootCommandName}</a></h2>\n`;
        rootHelpContent += marked(this.mConfig.loadedConfig.rootCommandDescription) + "\n";
        const helpGen = new DefaultHelpGenerator({ produceMarkdown: true, rootCommandName } as any,
            { commandDefinition: uniqueDefinitions, fullCommandTree: uniqueDefinitions });
        rootHelpContent += marked(`<h4>Groups</h4>\n` + this.buildChildrenSummaryTables(helpGen, rootCommandName));
        rootHelpContent += this.genDocsFooter();
        fs.writeFileSync(rootHelpHtmlPath, rootHelpContent);
        process.stdout.write(".");

        uniqueDefinitions.children.forEach((def) => {
            process.stdout.write(".");
            this.genCommandHelpPage(def, def.name, this.mDocsDir, this.treeNodes[0]);
        });

        this.writeTreeData();
        process.stdout.write("\nFinished generating web help, launching in browser now\n");
    }

    private get imperativeDir(): string {
        // TODO Better way to determine Imperative dir?
        return path.join(__dirname, "..", "..", "..", "..");
    }

    private detemplatizeImperativeDir(html: string): string {
        return html.replace(/{{IMPERATIVE_DIR}}/g, this.imperativeDir);
    }

    private genDocsHeader(title: string): string {
        return this.detemplatizeImperativeDir(`<!DOCTYPE html>
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
        return this.detemplatizeImperativeDir(`</article>
<script src="{{IMPERATIVE_DIR}}/node_modules/clipboard/dist/clipboard.min.js"></script>
<script src="{{IMPERATIVE_DIR}}/help-site/dist/js/docs.js"></script>
`);
    }

    /**
     * Builds breadcrumb of HTML links to show command ancestry
     * @param {string} rootCommandName
     * @param {string} fullCommandName
     * @returns {string}
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
     * @param {DefaultHelpGenerator} helpGen
     * @param {string} fullCommandName
     * @returns {string}
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
     * Generates HTML help page for Imperative command
     * @param {ICommandDefinition} definition
     * @param {string} fullCommandName
     * @param {string} docsDir
     * @param {ITreeNode} parentNode
     */
    private genCommandHelpPage(definition: ICommandDefinition, fullCommandName: string, docsDir: string, parentNode: ITreeNode) {
        const rootCommandName: string = this.treeNodes[0].text;
        const helpGen = new DefaultHelpGenerator({ produceMarkdown: true, rootCommandName } as any,
            { commandDefinition: definition, fullCommandTree: Imperative.fullCommandTree });

        let markdownContent = helpGen.buildHelp() + "\n";
        markdownContent = markdownContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (definition.type === "group") {
            // this is disabled for the CLIReadme.md but we want to show children here
            // so we'll call the help generator's children summary function even though
            // it's usually skipped when producing markdown
            markdownContent += `<h4>Commands</h4>\n` + this.buildChildrenSummaryTables(helpGen, rootCommandName + "_" + fullCommandName);
        }

        let htmlContent = this.genDocsHeader(fullCommandName.replace(/_/g, " "));
        htmlContent += `<h2>` + this.genBreadcrumb(rootCommandName, fullCommandName) + `</h2>\n`;
        htmlContent += marked(markdownContent) + this.genDocsFooter();

        // Remove backslash escapes from URLs
        htmlContent = htmlContent.replace(/(%5C(?=.+?>.+?<\/a>)|\\(?=\..+?<\/a>))/g, "");

        // Add Copy buttons after command line examples
        htmlContent = htmlContent.replace(/<code>\$\s*(.*?)<\/code>/g,
            "<code>$1</code> <button class=\"btn-copy\" data-balloon-pos=\"right\" data-clipboard-text=\"$1\">Copy</button>");

        const helpHtmlFile = `${rootCommandName}_${fullCommandName.trim()}.html`;
        const helpHtmlPath = path.join(docsDir, helpHtmlFile);
        fs.writeFileSync(helpHtmlPath, htmlContent);

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
                this.genCommandHelpPage(child, `${fullCommandName}_${child.name}`, docsDir, childNode);
            });
        }
    }

    private writeTreeData() {
        const treeDataPath = path.join(this.mDocsDir, "..", "tree-data.js");
        fs.writeFileSync(treeDataPath,
            "/* This file is automatically generated, do not edit manually! */\n" +
            `const headerStr = "${this.mConfig.loadedConfig.productDisplayName}";\n` +
            `const footerStr = "${this.mConfig.callerPackageJson.name} ${this.mConfig.callerPackageJson.version}";\n` +
            "const treeNodes = " + JSON.stringify(this.treeNodes, null, 2) + ";\n" +
            "const aliasList = " + JSON.stringify(this.aliasList, null, 2) + ";\n" +
            "const cmdToLoad = null;");
    }
}
