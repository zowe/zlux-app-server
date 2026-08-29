/*
  Mock for zlux-server-framework/utils/mergeUtils
*/
module.exports = {
  deepAssign: function(target, source) {
    return Object.assign({}, target, source);
  }
};
