module.exports = {
    branches: [
        {
            name: "master",
            level: "minor",
            dependencies: ["@zowe/perf-timing"]
        },
        {
            name: "zowe-v?-lts",
            level: "patch",
            dependencies: ["@zowe/perf-timing"]
        }
        // {
        //     name: "next",
        //     prerelease: true,
        //     dependencies: { "@zowe/perf-timing": "latest" }
        // }
    ],
    plugins: [
        "@octorelease/changelog",
        ["@octorelease/npm", {
            aliasTags: {
                "latest": ["zowe-v2-lts", "next"]
            },
            smokeTest: true
        }],
        ["@octorelease/github", {
            checkPrLabels: true
        }],
        "@octorelease/git"
    ]
};
