/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

import * as os from 'os';
import * as zos from 'zos';
import * as std from 'std';
import * as xplatform from 'xplatform';
import * as fs from '../../../../../../bin/libs/fs';
import * as common from '../../../../../../bin/libs/common';
import * as componentlib from '../../../../../../bin/libs/component';
import { PathAPI as pathoid } from '../../../../../../bin/libs/pathoid';

common.printFormattedDebug("ZWED", "plugins-init", `Started plugins-init.js, platform=${os.platform}`);

const runtimeDirectory=std.getenv('ZWE_zowe_runtimeDirectory');
const extensionDirectory=std.getenv('ZWE_zowe_extensionDirectory');
const workspaceDirectory=std.getenv('ZWE_zowe_workspaceDirectory');
const recognizerDirectory=workspaceDirectory+'/app-server/ZLUX/pluginStorage/org.zowe.zlux.ng2desktop/recognizers';
const actionsDirectory=workspaceDirectory+'/app-server/ZLUX/pluginStorage/org.zowe.zlux.ng2desktop/actions';

const installedComponentsEnv=std.getenv('ZWE_INSTALLED_COMPONENTS');
const installedComponents = installedComponentsEnv ? installedComponentsEnv.split(',') : null;

const enabledComponentsEnv=std.getenv('ZWE_ENABLED_COMPONENTS');
const enabledComponents = enabledComponentsEnv ? enabledComponentsEnv.split(',') : null;

const pluginPointerDirectory = `${workspaceDirectory}/app-server/plugins`;

function deleteFile(path) {
  return os.remove(path);
}

function registerPlugin(pluginPath, pluginDefinition) {
  const pointerPath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`;
  let location, relativeTo;
  if (pluginPath.startsWith(runtimeDirectory)) {
    relativeTo = "$ZWE_zowe_runtimeDirectory";
    location = pluginPath.substring(runtimeDirectory.length);
    if (location.startsWith('/')) {
      location = location.substring(1);
    }
    
    xplatform.storeFileUTF8(pointerPath, xplatform.AUTO_DETECT, JSON.stringify({
      "identifier": pluginDefinition.identifier,
      "pluginLocation": location,
      "relativeTo": relativeTo
    }, null, 2));
  } else {
    xplatform.storeFileUTF8(pointerPath, xplatform.AUTO_DETECT, JSON.stringify({
      "identifier": pluginDefinition.identifier,
      "pluginLocation": pluginPath
    }, null, 2));
  }
  registerApp2App(pluginPath, pluginDefinition.identifier, pluginDefinition.pluginVersion);
}



function registerApp2App(pluginDirectory, pluginId, pluginVersion) {
  common.printFormattedDebug("ZWED", "plugins-init", `app2app for ${pluginId}`);
  copyRecognizers(pluginDirectory, pluginId, pluginVersion);
  copyActions(pluginDirectory, pluginId, pluginVersion);
}

function deregisterPlugin(pluginDefinition) {
  const filePath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`;
  if (fs.fileExists(filePath, true)) {
    const rc = deleteFile(filePath);
    if (rc !== 0) {
      common.printFormattedError("ZWED", "plugins-init", `Could not deregister plugin ${pluginDefinition.identifier}, delete ${filePath} failed, error=${rc}`);
    }
    return rc !== 0;
  } else {
    return deregisterApp2App(pluginDefinition.identifier);
  }
}

function deregisterApp2App(appId) {
  const actionPath = pathoid.join(actionsDirectory, appId);
  if (fs.fileExists(actionPath, true)) {
    const rc = deleteFile(actionPath);
    if (rc !== 0) {
      common.printFormattedError("ZWED", "plugins-init", `Could not deregister plugin ${appId}, delete ${actionPath} failed, error=${rc}`);
    }
    return rc === 0;
  }
  //TODO how to deregister recognizer?
}

function copyRecognizers(appDir, appId, appVers) {
  let recognizers;
  let recognizersKeys;
  let configRecognizers;
  const pluginRecognizersLocation = pathoid.join(appDir, "config", "recognizers");


  if (fs.directoryExists(pluginRecognizersLocation)) { // Get recognizers in a plugin's appDir/config/xxx location
    common.printFormattedDebug("ZWED", "plugins-init", `rec ${pluginRecognizersLocation} exists`);
    fs.getFilesInDirectory(pluginRecognizersLocation).forEach(filename => {
      const filepath = pathoid.resolve(pluginRecognizersLocation, filename);
      const filepathConfig = pathoid.resolve(pathoid.join(recognizerDirectory, filename));
      
      recognizers = JSON.parse(xplatform.loadFileUTF8(filepath, xplatform.AUTO_DETECT)).recognizers;
      recognizersKeys = Object.keys(recognizers)
      for (const key of recognizersKeys) { // Add metadata for plugin version & plugin identifier of origin (though objects don't have to be plugin specific)
        recognizers[key].pluginVersion = appVers;
        recognizers[key].pluginIdentifier = appId;
        recognizers[key].key = appId + ":" + key + ":" + recognizers[key].id; // pluginid_that_provided_it:index(or_name)_in_that_provider:actionid
      }
      common.printFormattedDebug("ZWED", "plugins-init", `ZWED0301I Found ${filepath} in config for '${appId}'`);
      common.printFormattedDebug("ZWED", "plugins-init", `Going to merge into ${filepathConfig}`);
      try { // Get pre-existing recognizers in config, if any
        configRecognizers = fs.fileExists(filepathConfig) ? JSON.parse(xplatform.loadFileUTF8(filepathConfig, xplatform.AUTO_DETECT)).recognizers : {};
        const configRecognizersKeys = Object.keys(configRecognizers);
        for (const configKey of configRecognizersKeys) { // Traverse config recognizers
          for (const key of recognizersKeys) { // Traverse plugin recognizers
            if (configRecognizers[configKey].key && recognizers[key].key && configRecognizers[configKey].key == recognizers[key].key) { // TODO: Need to implement real keys for Recognizers
              configRecognizers[configKey] = recognizers[key]; // Choose the recognizers originating from plugin
            }
          }
        }
        recognizers = Object.assign(configRecognizers, recognizers); // If found, combine the ones found in config with ones found in plugin
      } catch (e) {
        common.printFormattedError("ZWED", "plugins-init", `Error: Invalid JSON for ${filepathConfig}`);
      }
      
      if (recognizers) { // Attempt to copy recognizers over to config location for Desktop access later
        try { //TODO: Doing recognizers.recognizers is redundant. We may want to consider refactoring in the future
          xplatform.storeFileUTF8(filepathConfig, xplatform.AUTO_DETECT,  '{ "recognizers":' + JSON.stringify(recognizers) + '}');
          common.printFormattedInfo("ZWED", "plugins-init", "ZWED0294I Successfully loaded " + Object.keys(recognizers).length + " recognizers for '" + appId + "' into config at "+filepathConfig);
        } catch (e) {
          common.printFormattedError("ZWED", "plugins-init", `ZWED0177W Unable to load ${recognizers} for '${appId}' into config`);
        }
      }
      
    });
  }
  common.printFormattedDebug("ZWED", "plugins-init", `Done rec`);
}

function copyActions(appDir, appId, appVers) {
  let actions;
  let actionsKeys;
  const pluginActionsLocation = pathoid.join(appDir, "config", "actions", appId);

  if (fs.fileExists(pluginActionsLocation)) {
    common.printFormattedDebug("ZWED", "plugins-init", `act ${pluginActionsLocation} exists`);
    try { // Get actions in a plugin's appDir/config/xxx location
      actions = JSON.parse(xplatform.loadFileUTF8(pluginActionsLocation, xplatform.AUTO_DETECT)).actions;
      actionsKeys = Object.keys(actions)
      for (const key of actionsKeys) { // Add metadata for plugin version & plugin identifier of origin (though objects don't have to be plugin specific)
        actions[key].pluginVersion = appVers;
        actions[key].pluginIdentifier = appId;
      }
      common.printFormattedDebug("ZWED", "plugins-init", `ZWED0301I Found ${actions} in config for '${appId}'`);
    } catch (e) {
      common.printFormattedError("ZWED", "plugins-init", `Error: Malformed JSON in ${pluginActionsLocation}`);
    }

    if (actions) { // Attempt to copy actions over to config location for Desktop access later
      try { //TODO: Doing actions.actions is redundant. We may want to consider refactoring in the future
        xplatform.storeFileUTF8(pathoid.join(actionsDirectory, appId), xplatform.AUTO_DETECT,  '{ "actions":' + JSON.stringify(actions) + '}');
        common.printFormattedInfo("ZWED", "plugins-init", "ZWED0295I Successfully loaded " + actions.length + " actions for '" + appId + "' into config at "+pathoid.join(actionsDirectory, appId));
      } catch (e) {
        common.printFormattedError("ZWED", "plugins-init", `ZWED0177W Unable to load ${actions} for '${appId}' into config`);
      }
    }
  }
  common.printFormattedDebug("ZWED", "plugins-init", `done act`);
}


if (!fs.directoryExists(pluginPointerDirectory, true)) {
  const rc = os.mkdir(pluginPointerDirectory, 0o770);
  if (rc < 0) {
    common.printFormattedError("ZWED", "plugins-init", `Could not create pluginsDir=${pluginPointerDirectory}, err=${rc}`);
    std.exit(2);
  }
}

common.printFormattedDebug("ZWED", "plugins-init", "Start iteration");

//A port of https://github.com/zowe/zlux-app-server/blob/v2.x/staging/bin/init/plugins-init.sh

installedComponents.forEach(function(installedComponent) {
  const componentDirectory = componentlib.findComponentDirectory(installedComponent);
  if (componentDirectory) {
    const enabled = enabledComponents.includes(installedComponent);
    common.printFormattedDebug("ZWED", "plugins-init", `Checking plugins for component=${installedComponent}, enabled=${enabled}`);

    const manifest = componentlib.getManifest(componentDirectory);
    if (manifest.appfwPlugins) {
      manifest.appfwPlugins.forEach(function (manifestPluginRef) {
        const path = manifestPluginRef.path;
        const fullPath = `${componentDirectory}/${path}`
        const pluginDefinition = componentlib.getPluginDefinition(fullPath);
        if (pluginDefinition) {
          if (enabled) {
            common.printFormattedInfo("ZWED", "plugins-init", `Registering plugin ${fullPath}`);
            registerPlugin(fullPath, pluginDefinition);
          } else {
            common.printFormattedDebug("ZWED", "plugins-init", `Deregistering plugin ${fullPath}`);
            deregisterPlugin(pluginDefinition);
          }
        } else {
          common.printFormattedError("ZWED", "plugins-init", `Skipping plugin at ${fullPath} due to pluginDefinition missing or invalid`);
        }
      });
    }
  } else {
    common.printFormattedError("ZWED", "plugins-init", `Warning: Could not remove app framework plugins for extension ${installedComponent} because its directory could not be found within ${extensionDirectory}`);
  }
});

