# Imperative CLI Framework

This Readme file contains the information that CLI developers need to build and install Imperative CLI Framework, develop applications using Imperative CLI Framework, and contribute code to Imperative CLI Framework.

## About Imperative CLI Framework
Imperative CLI Framework is a command processing system that enables developers to quickly build customized command line interfaces by allowing them to focus on adding features rather than creating infrastructure.

Within the imperative repository, we provide you with all the tools that you need to get started with building your own CLIs and plug-ins.

## Install Imperative as a Dependency

Issue the following commands to install Imperative CLI Framework as a dependency:
``` bash
npm config set @zowe:registry https://api.bintray.com/npm/ca/brightside
npm install --save @zowe/imperative
```

## Get Started
Review the following topics to get Imperative CLI Framework up and running quickly.

### Prerequisite Software
Node.js® is a JavaScript runtime environment on which we architected Imperative CLI Framework. You use the Node.js package manager (npm) to install the framework. You install the framework after you install Node.js using the npm.

To install Node.js, go to the [*Installing Node.js via package manager*](https://nodejs.org/en/download/package-manager) website at the following URL, and follow the instructions for installing Node.js on your computer's operating system:
[https://nodejs.org/en/download/package-manager](https://nodejs.org/en/download/package-manager)

In addition to Node.js, you must have a means to execute ".sh" (bash) scripts (required for running integration tests). On Windows, you can install "Git Bash" (bundled with the standard [Git](https://git-scm.com/downloads) installation - check "Use Git and Unix Tools from Windows Command Prompt" installation option). When running the integration tests on Windows, you must have Administrative authority to enable the integration tests to create symbolic links.

After downloading/installing the prerequisites ensure you can perform the following (and receive success responses):
1. `node --version`
2. `npm --version`
3. On Windows: `where sh`

**Note:** CA Technologies does not maintain the prerequisite software that Imperative CLI Framework requires. You are responsible for updating Node.js and other prerequisites on your computer. We recommend that you update Node.js regularly to the latest Long Term Support (LTS) version.

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
Imperative CLI Framework contains the following sample applications:
* **Sample CLI:** We provide a sample CLI application that you can use to get started developing your own command line interface applications. The sample contains examples of how to code your applications to implement custom user profiles, commands, logging, and more. Refer to the code examples in the sample to understand how to implement each Imperative CLI Framework feature. For more information, see the [README.md](**REMOVED**) file in the [imperative-sample repository](**REMOVED**).
* **Sample Plugins:** Imperative CLI Framework lets you extend the functionalities of your applications by implementing plug-ins. We provide a sample plug-in that you can use to get started developing your own plug-ins. For more information, see the [README.md](**REMOVED**) file in the [imperative-plugins repository](**REMOVED**).

## Imperative CLI Framework Documentation
With Imperative CLI Framework, we provide you with content that describes how to define commands, Imperative CLI Framework core features and functionality, working with user profiles, plug-ins and more! For more information, see the [Imperative CLI Framework wiki](**REMOVED**).

## Contribute Code to Imperative CLI Framework
For information about how you can contribute code to Imperative CLI Framework, see the [CONTRIBUTING](**REMOVED**) file that is located in the imperative repository.

## Versioning
Imperative CLI Framework uses Semantic Versioning (SemVer) for versioning. For more information about how to version code, see the [Semantic Versioning](https://semver.org/) website.

## Licencing Imperative CLI Framework
To read the Imperative CLI Framework licensing rules, requirements, and guidelines, see the [LICENSE](**REMOVED**) file that is located in the imperative repository.

[0]: **REMOVED**
