/*
  Mock for zlux-server-framework/lib/jsonUtils
*/
module.exports = {
  readJSONStringWithComments: function(str, filename) {
    return JSON.parse(str);
  }
};
