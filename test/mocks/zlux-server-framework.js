/*
  Mock for zlux-server-framework (main module)
*/
function ProxyServer(configJSON, configLocation) {
  this.configJSON = configJSON;
  this.configLocation = configLocation;
}
ProxyServer.prototype.start = function() {
  return Promise.resolve();
};
module.exports = ProxyServer;
