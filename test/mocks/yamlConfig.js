/*
  Mock for zlux-server-framework/utils/yamlConfig
*/
module.exports = {
  getCurrentHaInstanceId: function() {
    return 'test-ha-instance';
  },
  parseZoweDotYaml: function(configFile, haInstanceId, debug) {
    return {
      zowe: { workspaceDirectory: '/tmp/workspace' },
      components: {
        'app-server': {
          node: { noChild: false }
        }
      }
    };
  }
};
