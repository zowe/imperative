@Library('shared-pipelines@zowe/zowe-cli/142') import org.zowe.pipelines.nodejs.NodeJSPipeline

import org.zowe.pipelines.nodejs.models.SemverLevel

node('ca-jenkins-agent') {
    // Initialize the pipeline
    def pipeline = new NodeJSPipeline(this)

    // Build admins, users that can approve the build and receieve emails for 
    // all protected branch builds.
    pipeline.admins.add("wrich04", "zfernand0", "mikebauerca", "markackert", "dkelosky")

    // Protected branch property definitions
    pipeline.protectedBranches.addMap([
        [name: "master", tag: "daily", prerelease: "alpha"],
        [name: "beta", tag: "beta", prerelease: "beta"],
        [name: "latest", tag: "latest"],
        [name: "lts-incremental", tag: "lts-incremental", level: SemverLevel.MINOR],
        [name: "lts-stable", tag: "lts-stable", level: SemverLevel.PATCH]
    ])

    // Git configuration information
    pipeline.gitConfig = [
        email: 'zowe.robot@gmail.com',
        credentialsId: 'zowe-robot-github'
    ]

    // npm publish configuration
    pipeline.publishConfig = [
        email: pipeline.gitConfig.email,
        credentialsId: 'GizaArtifactory'
    ]

    // Initialize the pipeline library, should create 5 steps
    pipeline.setup()

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
    pipeline.build(timeout: [
        time: 5,
        unit: 'MINUTES'
    ])

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
            JEST_SUIT_NAME: "Unit Tests",
            JEST_JUNIT_ANCESTOR_SEPARATOR: " > ",
            JEST_JUNIT_CLASSNAME: "Unit.{classname}",
            JEST_JUNIT_TITLE: "{title}",
            JEST_HTML_REPORTER_OUTPUT_PATH: "${UNIT_RESULTS}/index.html",
            JEST_HTML_REPORTER_PAGE_TITLE: "${BRANCH_NAME} - Unit Test"
        ],
        testResults: [dir: "${UNIT_TEST_ROOT}", files: "index.html", name: 'Imperative - Unit Test Report'],
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
        shouldUnlocKeyring: true,
        environment: [
            JEST_JUNIT_OUTPUT: INTEGRATION_JUNIT_OUTPUT,
            JEST_SUIT_NAME: "Integration Tests",
            JEST_JUNIT_ANCESTOR_SEPARATOR: " > ",
            JEST_JUNIT_CLASSNAME: "Integration.{classname}",
            JEST_JUNIT_TITLE: "{title}",
            JEST_HTML_REPORTER_OUTPUT_PATH: "${INTEGRATION_TEST_ROOT}/index.html",
            JEST_HTML_REPORTER_PAGE_TITLE: "${BRANCH_NAME} - Integration Test"
        ],
        testResults: [dir: INTEGRATION_TEST_ROOT, files: "index.html", name: 'Imperative - Integration Test Report'],
        junitOutput: INTEGRATION_JUNIT_OUTPUT
    )

    // Perform sonar qube operations
    pipeline.createStage(
        name: "SonarQube",
        stage: {
            def scannerHome = tool 'sonar-scanner-maven-install'
            withSonarQubeEnv('sonar-default-server') {
                sh "${scannerHome}/bin/sonar-scanner"
            }
        }
    )

    // Deploys the application if on a protected branch. Give the version input
    // 30 minutes before an auto timeout approve.
    pipeline.deploy(
        versionArguments: [timeout: [time: 30, unit: 'MINUTES']]
    )

    // Once called, no stages can be added and all added stages will be executed. On completion
    // appropriate emails will be sent out by the shared library.
    pipeline.end()
}
