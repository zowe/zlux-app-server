/*
  Mock for zlux-server-framework/utils/argumentParser
  Used in test environments where zlux-server-framework is not available.
*/
let mockConfig = '/fake/zowe.yaml';
let mockDArgs = null;

module.exports = {
  constants: {
    ARG_TYPE_FLAG: 1,
    ARG_TYPE_VALUE: 2,
    ARG_TYPE_JSON: 3
  },
  environmentVarsToObject: function(prefix) {
    return {};
  },
  CLIArgument: function(longName, shortName, type) {
    this.longName = longName;
    this.shortName = shortName;
    this.type = type;
  },
  createParser: function(args) {
    return {
      parse: function(commandArgs) {
        return { config: mockConfig, D: mockDArgs };
      }
    };
  },
  _setMockConfig: function(config) { mockConfig = config; },
  _setMockDArgs: function(d) { mockDArgs = d; }
};
