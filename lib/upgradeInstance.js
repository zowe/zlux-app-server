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
const argParser = require('zlux-server-framework/utils/argumentParser');

const versions = [
  {
    v: '1.11.0',
    upgrade: function(toLocation, serverConfig, envConfig, instanceItems) {
      let hasOutdatedZosmfPluginConfig = false;
      try {
        hasOutdatedZosmfPluginConfig = serverConfig.dataserviceAuthentication.implementationDefaults.zosmf
          && !serverConfig.dataserviceAuthentication.implementationDefaults.zosmf.plugins;
      } catch (e) {
        //change not needed
      }

      if (hasOutdatedZosmfPluginConfig) {
        let pluginPath;
        try {
          if (instanceItems.indexOf('org.zowe.zlux.auth.zosmf.json') != -1) {
            console.log('Removing org.zowe.zlux.auth.zosmf.json from defaults');
            pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.auth.zosmf.json');
            fs.unlinkSync(pluginPath);
          }
          if (instanceItems.indexOf('org.zowe.zlux.proxy.zosmf.json') != -1) {
            console.log('Removing org.zowe.zlux.proxy.zosmf.json from defaults');
            pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.proxy.zosmf.json');
            fs.unlinkSync(pluginPath);
          }
        } catch (e) {
          console.warn(`Could not remove ${pluginPath}, error=${e.message}`);
          throw e;
        }
      }
    }
  },
  {
    v: '1.12.0',
    upgrade: function(toLocation, serverConfig, envConfig, instanceItems) {
      let hasOutdatedApimlPluginConfig = false;
      try {
        hasOutdatedApimlPluginConfig =
          (serverConfig.dataserviceAuthentication.implementationDefaults.apiml
            && (!serverConfig.dataserviceAuthentication.implementationDefaults.apiml.plugins
              || (serverConfig.dataserviceAuthentication.implementationDefaults.apiml.plugins.length == 0)))
          && !(envConfig.dataserviceAuthentication.implementationDefaults.apiml);
      } catch (e) {
        //change not needed
      }
      if (hasOutdatedApimlPluginConfig) {
        if (instanceItems.indexOf('org.zowe.zlux.auth.apiml.json') != -1) {
          console.log('Removing org.zowe.zlux.auth.apiml.json from defaults');
          const pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.auth.apiml.json');
          try {
            fs.unlinkSync(pluginPath);
          } catch (e) {
            console.warn(`Could not remove ${pluginPath}, error=${e.message}`);
            throw e;
          }
        }
      }
    }
  }
];


module.exports.doUpgrade = function doUpgrade(fromVersion, toLocation, serverConfig, instanceItems) {
  let firstIndex = 0;
  let upgradingTo;
  let upgradedTo;
  const envConfig = argParser.environmentVarsToObject("ZWED_");
  for (let i = 0; i < versions.length; i++) {
    if (semver.gt(versions[i].v, fromVersion)) {
      firstIndex = i;
      break;
    }
  }
  try {
    for (let i = firstIndex; i < versions.length; i++) {
      upgradingTo = versions[i].v;
      versions[i].upgrade(toLocation, serverConfig, envConfig, instanceItems);
      upgradedTo = versions[i].v;
    }
  } catch (e) {
    console.log('app-server config could not upgrade to version='+upgradingTo);
  } finally {
    if (!fromVersion == upgradedTo) {
      console.log('app-server config upgraded to version='+upgradedTo);
    }
    return upgradedTo;
  }
};
