module.exports = async function (globalConfig, projectConfig) {
    require('events').EventEmitter.defaultMaxListeners = Infinity;
}