/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/
@Library('shared-pipelines') import org.zowe.pipelines.nodejs.NodeJSPipeline

import org.zowe.pipelines.nodejs.models.SemverLevel

node('zowe-jenkins-agent-dind') {
    // Initialize the pipeline
    def pipeline = new NodeJSPipeline(this)

    // Build admins, users that can approve the build and receieve emails for
    // all protected branch builds.
    pipeline.admins.add("tucker01", "gejohnston", "zfernand0", "mikebauerca", "markackert", "dkelosky", "awharn", "tjohnsonbcm")

    // Comma-separated list of emails that should receive notifications about these builds
    pipeline.emailList = "fernando.rijocedeno@broadcom.com"

    // Protected branch property definitions
    pipeline.protectedBranches.addMap([
        [name: "master", tag: "latest", aliasTags: ["zowe-v2-lts", "next"], dependencies: ["@zowe/perf-timing": "latest"], level: SemverLevel.MINOR],
        [name: "zowe-v1-lts", tag: "zowe-v1-lts", dependencies: ["@zowe/perf-timing": "latest"], level: SemverLevel.PATCH],
        //[name: "next", tag: "next", prerelease: "next", dependencies: ["@zowe/perf-timing": "next"]]
    ])

    // Git configuration information
    pipeline.gitConfig = [
        email: 'zowe.robot@gmail.com',
        credentialsId: 'zowe-robot-github'
    ]

    // npm publish configuration
    pipeline.publishConfig = [
        email: pipeline.gitConfig.email,
        credentialsId: 'zowe.jfrog.io',
        scope: '@zowe'
    ]

    pipeline.registryConfig = [
        [
            email: pipeline.publishConfig.email,
            credentialsId: pipeline.publishConfig.credentialsId,
            url: 'https://zowe.jfrog.io/zowe/api/npm/npm-release/',
            scope: pipeline.publishConfig.scope
        ]
    ]

    // Initialize the pipeline library, should create 5 steps
    pipeline.setup(nodeJsVersion: 'v12.22.1', npmVersion: '^7')

    // Create a custom lint stage that runs immediately after the setup.
    pipeline.createStage(
        name: "Lint",
        stage: {
            sh "npm run lint"
        },
        timeout: [
            time: 2,
            unit: 'MINUTES'
        ]
    )

    // Build the application
    pipeline.build(
        timeout: [
            time: 5,
            unit: 'MINUTES'
        ]
    )


    def TEST_ROOT = "__tests__/__results__/ci"
    def UNIT_TEST_ROOT = "$TEST_ROOT/unit"
    def UNIT_JUNIT_OUTPUT = "$UNIT_TEST_ROOT/junit.xml"

    // Perform a unit test and capture the results
    pipeline.test(
        name: "Unit",
        operation: {
            sh "npm run test:unit"
        },
        environment: [
            JEST_JUNIT_OUTPUT: UNIT_JUNIT_OUTPUT,
            JEST_STARE_RESULT_DIR: "${UNIT_TEST_ROOT}/jest-stare",
            JEST_STARE_RESULT_HTML: "index.html"
        ],
        testResults: [dir: "${UNIT_TEST_ROOT}/jest-stare", files: "index.html", name: 'Imperative - Unit Test Report'],
        coverageResults: [dir: "__tests__/__results__/unit/coverage/lcov-report", files: "index.html", name: 'Imperative - Unit Test Coverage Report'],
        junitOutput: UNIT_JUNIT_OUTPUT,
        cobertura: [
            autoUpdateHealth: false,
            autoUpdateStability: false,
            coberturaReportFile: '__tests__/__results__/unit/coverage/cobertura-coverage.xml',
            conditionalCoverageTargets: '70, 0, 0',
            failUnhealthy: false,
            failUnstable: false,
            lineCoverageTargets: '80, 0, 0',
            maxNumberOfBuilds: 20,
            methodCoverageTargets: '80, 0, 0',
            onlyStable: false,
            sourceEncoding: 'ASCII',
            zoomCoverageChart: false
        ]
    )

    // Perform an integration test and capture the results
    def INTEGRATION_TEST_ROOT = "$TEST_ROOT/integration"
    def INTEGRATION_JUNIT_OUTPUT = "$INTEGRATION_TEST_ROOT/junit.xml"

    pipeline.test(
        name: "Integration",
        operation: {
            sh "npm run test:integration"
        },
        timeout: [time: 30, unit: 'MINUTES'],
        shouldUnlockKeyring: true,
        environment: [
            JEST_JUNIT_OUTPUT: INTEGRATION_JUNIT_OUTPUT,
            JEST_STARE_RESULT_DIR: "${INTEGRATION_TEST_ROOT}/jest-stare",
            JEST_STARE_RESULT_HTML: "index.html"
        ],
        testResults: [dir: "$INTEGRATION_TEST_ROOT/jest-stare", files: "index.html", name: 'Imperative - Integration Test Report'],
        junitOutput: INTEGRATION_JUNIT_OUTPUT
    )

    //Upload Reports to Code Coverage
    pipeline.createStage(
        name: "Codecov",
        stage: {
            withCredentials([usernamePassword(credentialsId: 'CODECOV_ZOWE_IMP', usernameVariable: 'CODECOV_USERNAME', passwordVariable: 'CODECOV_TOKEN')]) {
                sh "curl -s https://codecov.io/bash | bash -s"
            }
        }
    )

    // Perform sonar qube operations
    pipeline.sonarScan()

    // Check vulnerabilities
    pipeline.checkVulnerabilities()

    pipeline.checkChangelog(
        file: "CHANGELOG.md",
        header: "## Recent Changes"
    )

    // Perform the versioning email mechanism
    pipeline.version(
        timeout: [time: 30, unit: 'MINUTES'],
        updateChangelogArgs: [
            file: "CHANGELOG.md",
            header: "## Recent Changes"
        ]
    )

    // Deploys the application if on a protected branch. Give the version input
    // 30 minutes before an auto timeout approve.
    pipeline.deploy()

    def logLocation = "__tests__/__results__"
    // Once called, no stages can be added and all added stages will be executed. On completion
    // appropriate emails will be sent out by the shared library.
    pipeline.end(archiveFolders: [
        "$logLocation/log"
    ])
}
