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
          const zosmfAuthIndex = instanceItems.indexOf('org.zowe.zlux.auth.zosmf.json');
          if (zosmfAuthIndex != -1) {
            console.log('Removing org.zowe.zlux.auth.zosmf.json from defaults');
            pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.auth.zosmf.json');
            fs.unlinkSync(pluginPath);
            instanceItems.splice(zosmfAuthIndex, 1);
          }
          const zosmfProxyIndex = instanceItems.indexOf('org.zowe.zlux.proxy.zosmf.json');
          if (zosmfProxyIndex != -1) {
            console.log('Removing org.zowe.zlux.proxy.zosmf.json from defaults');
            pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.proxy.zosmf.json');
            fs.unlinkSync(pluginPath);
            instanceItems.splice(zosmfProxyIndex, 1);
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
      const apimlAuthIndex = instanceItems.indexOf('org.zowe.zlux.auth.apiml.json');
      if (apimlAuthIndex != -1) {
        console.log('Removing org.zowe.zlux.auth.apiml.json from defaults');
        const pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.auth.apiml.json');
        try {
          fs.unlinkSync(pluginPath);
          instanceItems.splice(apimlAuthIndex, 1);
        } catch (e) {
          console.warn(`Could not remove ${pluginPath}, error=${e.message}`);
          throw e;
        }
      }
      const zssAuthIndex = instanceItems.indexOf('org.zowe.zlux.auth.zss.json');
      if (zssAuthIndex != -1) {
        console.log('Removing org.zowe.zlux.auth.zss.json from defaults');
        const pluginPath = path.join(toLocation, 'plugins', 'org.zowe.zlux.auth.zss.json');
        try {
          fs.unlinkSync(pluginPath);
          instanceItems.splice(apimlAuthIndex, 1);
        } catch (e) {
          console.warn(`Could not remove ${pluginPath}, error=${e.message}`);
          throw e;
        }
      }

      let configNeedsUpdate = false;
      if (serverConfig.dataserviceAuthentication.implementationDefaults.zosmf
          && !serverConfig.dataserviceAuthentication.implementationDefaults.zosmf.plugins) {
        delete serverConfig.dataserviceAuthentication.implementationDefaults.zosmf;
        configNeedsUpdate = true;
      }
      if (serverConfig.dataserviceAuthentication.implementationDefaults.apiml) {
        delete serverConfig.dataserviceAuthentication.implementationDefaults.apiml;
        configNeedsUpdate = true;
      }
      if (serverConfig.dataserviceAuthentication.implementationDefaults.zss) {
        delete serverConfig.dataserviceAuthentication.implementationDefaults.zss;
        configNeedsUpdate = true;
      }

      /* these plugins are either installed by default or installable from the base, v12 or prior */
      /* does not include those that get auto-installed via install-app.sh */
      const v12Plugins = [
        'org.zowe.configjs.json',
        'org.zowe.editor.json',
        'org.zowe.terminal.proxy.json',
        'org.zowe.terminal.tn3270.json',
        'org.zowe.terminal.vt.json',
        'org.zowe.zlux.appmanager.app.propview.json',
        'org.zowe.zlux.auth.safsso.json',
        'org.zowe.zlux.auth.zosmf.json',
        'org.zowe.zlux.auth.trivial.json',
        'org.zowe.zlux.proxy.zosmf.json',
        'org.zowe.zlux.bootstrap.json',
        'org.zowe.zlux.logger.json',
        'org.zowe.zlux.ng2desktop.json',
        'org.zowe.zlux.ng2desktop.settings.json',
        'org.zowe.zlux.sample.angular.json',
        'org.zowe.zlux.sample.iframe.json',
        'org.zowe.zlux.sample.react.json',
        'org.zowe.zosmf.workflows.json',
        'org.zowe.zlux.ng2desktop.admin-notification.json',
        'org.zowe.zlux.ng2desktop.webbrowser.json'
      ];
      if (process.env['ROOT_DIR']) {
        const filtered = instanceItems.filter((item)=> {return v12Plugins.indexOf(item) != -1});
        filtered.forEach((file)=> {
          try {
            const pluginPath = path.join(toLocation, 'plugins', file);
            const pluginJson = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
            const componentIndex = pluginJson.pluginLocation.indexOf('components/app-server');
            if (componentIndex != -1) {
              const newLocation = pluginJson.pluginLocation.substr(componentIndex);
              fs.writeFileSync(pluginPath, JSON.stringify({
                identifier:pluginJson.identifier,
                pluginLocation:newLocation,
                relativeTo:'$ROOT_DIR'
              },null,2));
            }
            console.log(`Updated ${file} to use $ROOT_DIR`);
          } catch (e) {
            console.warn(`Could not update ${file} to use $ROOT_DIR`);
          }
        });
      }
      return configNeedsUpdate ? serverConfig : undefined;
    }
  }
];


module.exports.doUpgrade = function doUpgrade(fromVersion, toLocation, serverConfig, instanceItems) {
  let firstIndex = versions.length;
  let upgradingTo;
  let upgradedTo;
  const envConfig = argParser.environmentVarsToObject("ZWED_");
  for (let i = 0; i < versions.length; i++) {
    if (semver.gt(versions[i].v, fromVersion)) {
      firstIndex = i;
      break;
    }
  }
  let configNeedsUpdate = false;
  try {
    for (let i = firstIndex; i < versions.length; i++) {
      upgradingTo = versions[i].v;
      let newConfig = versions[i].upgrade(toLocation, serverConfig, envConfig, instanceItems);
      if (newConfig) {
        serverConfig = newConfig;
        configNeedsUpdate = true;
      }
      upgradedTo = versions[i].v;
    }
  } catch (e) {
    console.log('app-server config could not upgrade to version='+upgradingTo);
  } finally {
    if (firstIndex == versions.length) {
      upgradedTo = fromVersion;
    }
    if (upgradedTo && (fromVersion != upgradedTo)) {
      console.log('app-server config upgraded to version='+upgradedTo);
    }
    if (configNeedsUpdate) {
      return {upgradedTo, serverConfig};
    } else {
      return {upgradedTo};
    }
  }
};
