/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import type { argParser } from '../../zlux-server-framework/utils/argumentParser';
import type { initUtils } from './initUtils';

function logPluginFailure(pluginId) {
  console.warn('ZWED0157E - Could not register default plugin %s into app-server', pluginId);
}

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
      
      if (serverConfig.node.childProcesses) {
        for (let i = 0; i < serverConfig.node.childProcesses.length; i++) {
          if (serverConfig.node.childProcesses[i].path == '../bin/zssServer.sh') {
            serverConfig.node.childProcesses.splice(i, 1);
            configNeedsUpdate = true;
            break;
          }
        }
        if (serverConfig.node.childProcesses.length == 0) {
          delete serverConfig.node.childProcesses;
          configNeedsUpdate = true;
        }
      }

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
      /* this only covers plugins that came from ROOT_DIR */
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
      const isContainer = (process.env['ZWED_node_container']=='true');
      if (process.env['ROOT_DIR'] || isContainer) {
        const filtered = instanceItems.filter((item)=> {return v12Plugins.indexOf(item) != -1});
        filtered.forEach((file)=> {
          try {
            const pluginPath = path.join(toLocation, 'plugins', file);
            const pluginJson = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
            let index, componentIndex, componentsIndex, relativeIndex;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            index = componentsIndex = pluginJson.pluginLocation.indexOf('components/app-server');
            if (index == -1) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
              index = relativeIndex = pluginJson.pluginLocation.startsWith('../../') ? 6 : -1;
              if (index == -1 && isContainer) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
                index = componentIndex = pluginJson.pluginLocation.startsWith('/component/share/') ? 17 : -1;
              }
            }
            if (index != -1) {
              if (isContainer) {
                const newLocation = pluginJson.pluginLocation.substr(index);
                fs.writeFileSync(pluginPath, JSON.stringify({
                  identifier:pluginJson.identifier,
                  pluginLocation:newLocation,
                  relativeTo:'$ZLUX_ROOT_DIR'
                },null,2));
              } else {
                const newLocation = pluginJson.pluginLocation.substr(index);
                fs.writeFileSync(pluginPath, JSON.stringify({
                  identifier:pluginJson.identifier,
                  pluginLocation:newLocation,
                  relativeTo:'$ROOT_DIR'
                },null,2));
              }
            }
            console.log(`Updated ${file} to use $ROOT_DIR`);
          } catch (e) {
            console.warn(`Could not update ${file} to use $ROOT_DIR`);
          }
        });
      }
      return configNeedsUpdate ? serverConfig : undefined;
    }
  },
  {
    v: '1.21.0',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    upgrade: function(toLocation, serverConfig, envConfig, instanceItems) {
      if (serverConfig.agent && !serverConfig.agent.mediationLayer) {
        serverConfig.agent.mediationLayer = {
          "serviceName": "zss",
          //environmentally set to true when apiml available
          "enabled": false
        }
        return serverConfig;
      }
      return undefined;
    }
  },
  {
    v: '1.24.0',
    upgrade: function(toLocation, serverConfig, envConfig, instanceItems) {
      try {
        initUtils.registerBundledPlugin('org.zowe.explorer-ip', serverConfig.pluginsDir, instanceItems, initUtils.FILE_MODE);
      } catch (e) {
        logPluginFailure('org.zowe.explorer-ip');
      }
      return undefined;
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
    // eslint-disable-next-line no-unsafe-finally
      return {upgradedTo, serverConfig};
    } else {
    // eslint-disable-next-line no-unsafe-finally
      return {upgradedTo};
    }
  }
};
