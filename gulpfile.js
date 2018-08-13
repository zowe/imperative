const gulp = require('gulp');
require('ts-node/register');

/**
 *  Automated test and coverage related tasks
 */
const testTasks = require("./gulp/TestTasks");
gulp.task('test:filePattern', testTasks.filePattern);
gulp.task('test:namePattern', testTasks.namePattern);
gulp.task('test:all', testTasks.runAllTests);
gulp.task('test:integration', testTasks.testIntegration);
gulp.task('test:unit', testTasks.runUnitTests);
gulp.task('test:deleteResults', testTasks.removeTestResultsDir);
gulp.task('test:installSampleClis', testTasks.installSampleClis);
gulp.task('test:uninstallSampleClis', testTasks.uninstallSampleClis);

/**
 * Development related tasks
 */
const developmentTasks = require("./gulp/DevelopmentTasks");
gulp.task("lint", developmentTasks.lint);
gulp.task("updateLicense", developmentTasks.license);
gulp.task('watch', developmentTasks.watch);
gulp.task('prepForDirectInstall', developmentTasks.prepForDirectInstall);
gulp.task('build', developmentTasks.build);
gulp.task('build:sample-cli', developmentTasks.buildSampleCli);
gulp.task('build:all-clis', developmentTasks.buildAllClis);
gulp.task('build:install-all-cli-dependencies', developmentTasks.installAllCliDependencies);
gulp.task("checkCircularDependencies", developmentTasks.checkCircularDependencies);
/**
 * Doc related tasks
 */
const docTasks = require("./gulp/DocTasks");
gulp.task("tsdoc", docTasks.generateTsdoc);
