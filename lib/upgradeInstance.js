/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/
const fs = require('fs');
const path = require('path');
const semver = require('semver');

const versions = [
  {
    v: '1.11.0',
    upgrade: function(toLocation, serverConfig, instanceItems) {
      try {
        let hasOutdatedZosmfPluginConfig = serverConfig.dataserviceAuthentication.implementationDefaults.zosmf
            && !serverConfig.dataserviceAuthentication.implementationDefaults.zosmf.plugins;
        if (hasOutdatedZosmfPluginConfig) {
          if (instanceItems.indexOf('org.zowe.zlux.auth.zosmf.json') != -1) {
            console.log('Removing org.zowe.zlux.auth.zosmf.json from defaults');
            fs.unlinkSync(path.join(toLocation, 'plugins', 'org.zowe.zlux.auth.zosmf.json'));
          }
          if (instanceItems.indexOf('org.zowe.zlux.proxy.zosmf.json') != -1) {
            console.log('Removing org.zowe.zlux.proxy.zosmf.json from defaults');
            fs.unlinkSync(path.join(toLocation, 'plugins', 'org.zowe.zlux.proxy.zosmf.json'));
          }
        }
      } catch (e) {
        //change not needed
      }
    }
  }
];


module.exports.doUpgrade = function doUpgrade(fromVersion, toLocation, serverConfig, instanceItems) {
  let firstIndex = 0;
  let upgradingTo;
  let upgradedTo;
  for (let i = 0; i < versions.length; i++) {
    if (semver.gt(versions[i].v, fromVersion)) {
      firstIndex = i;
      break;
    }
  }
  try {
    for (let i = firstIndex; i < versions.length; i++) {
      upgradingTo = versions[i].v;
      versions[i].upgrade(toLocation, serverConfig, instanceItems);
      upgradedTo = versions[i].v;
    }
  } catch (e) {
    console.log('app-server config could not upgrade to version='+upgradingTo);
  } finally {
    console.log('app-server config upgraded to version='+upgradedTo);
    return upgradedTo;
  }
};
