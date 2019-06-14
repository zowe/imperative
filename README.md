# Imperative CLI Framework

Imperative CLI Framework is a command processing system that enables developers to quickly build customized command-line interfaces. Focus on adding functionality for your users rather than creating CLI infrastructure.

We provide you with all the tools to get started building your own CLIs and plug-ins.

## Install Imperative as a Dependency

Issue the following commands to install Imperative CLI Framework as a dependency. Note that the registry URL differs between versions of Imperative CLI Framework 

**Install `@latest` version:**
``` bash
npm install --@zowe:registry=https://registry.npmjs.org --no-package-lock --force
npm install --save @zowe/imperative@lts-incremental 
```

**Install the `@lts-incremental` version:**
``` bash
npm install --@zowe:registry=https://registry.npmjs.org --no-package-lock --force
npm install --save @zowe/imperative@lts-incremental 
```

**Note:** Be aware that if you update via `@latest`, you accept breaking changes into your project.

### Prerequisite Software
Node.js® is a JavaScript runtime environment on which we architected Imperative CLI Framework. Use the Node.js package manager (npm) to install the framework.

To install Node.js, go to the [*Installing Node.js via package manager*](https://nodejs.org/en/download/package-manager) and follow the instructions for installing Node.js on your computer.

In addition to Node.js, you must have a means to execute ".sh" (bash) scripts (required for running integration tests). On Windows, you can install "Git Bash" (bundled with the standard [Git](https://git-scm.com/downloads) installation - check "Use Git and Unix Tools from Windows Command Prompt" installation option). When running the integration tests on Windows, you must have Administrative authority to enable the integration tests to create symbolic links.

After downloading/installing the prerequisites ensure you can perform the following (and receive success responses):
1. `node --version`
2. `npm --version`
3. On Windows: `where sh`

**Note:** Broadcom Inc. does not maintain the prerequisite software that Imperative CLI Framework requires. You are responsible for updating Node.js and other prerequisites on your computer. We recommend that you update Node.js regularly to the latest Long Term Support (LTS) version.

### Build and Install Imperative CLI Framework from Source
To build and install the Imperative CLI Framework, follow these steps:

1. Install node-gyp. node-gyp is a tool that you use to build Node.js native addons. For more information, see the node-gyp installation instructions at https://github.com/nodejs/node-gyp.
**Note:** You can skip to the next step if you installed node-gyp previously.
2. Clone the [Imperative CLI Framework project](**REMOVED**) to your PC.
3. From the command line, issue `cd [relative path]/imperative`
4. Issue `npm install`
5. Issue `npm run build`
6. Issue `npm run test`

To build the entire project (including test stand-alone CLIs):
`npm run build`

To build only imperative source:
`gulp build`

### Run Tests
Command | Description
--- | ---
`npm run test` | Run all tests (unit & integration)
`npm test:integration` | Run integration tests
`npm test:unit` | Run unit tests

**Note:** To run the integration tests via gulp, install all dependencies for test clis, build all test clis, & install all sample clis globally using the following sequence:
1. `gulp build:install-all-cli-dependencies`
2. `gulp build:all-clis`
3. `gulp test:installSampleClis`

 **Note:** For more information about the tasks (details and descriptions), issue the following gulp command:
 `gulp --tasks`

### Sample Applications

We provide a sample plug-in that you can use to get started developing your own plug-ins. See the [Zowe CLI Sample Plug-in](https://github.com/zowe/zowe-cli-sample-plugin).

## Documentation
We provide documentation that describes how to define commands, work with user profiles,  and more! For more information, see the [Imperative CLI Framework wiki](https://github.com/zowe/imperative/wiki).

## Contribute
For information about how you can contribute code to Imperative CLI Framework, see [CONTRIBUTING](CONTRIBUTING.md) 

## Versioning
Imperative CLI Framework uses Semantic Versioning (SemVer) for versioning. For more information, see the [Semantic Versioning](https://semver.org/) website.

## Licencing Imperative CLI Framework
For Imperative CLI Framework licensing rules, requirements, and guidelines, see [LICENSE](LICENSE).