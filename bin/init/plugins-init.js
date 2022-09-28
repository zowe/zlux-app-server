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
import * as componentlib from '../../../../../../bin/libs/component';
import { PathAPI as pathoid } from '../../../../../../bin/libs/pathoid';

console.log(`Started plugins-init.js, platform=${os.platform}`);

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
  if (fs.fileExists(pointerPath)) {
    return true;
  } else {
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
}



function registerApp2App(pluginDirectory, pluginId, pluginVersion) {
  copyRecognizers(pluginDirectory, pluginId, pluginVersion);
  copyActions(pluginDirectory, pluginId, pluginVersion);
}

function deregisterPlugin(pluginDefinition) {
  const filePath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`;
  if (fs.fileExists(filePath, true)) {
    const rc = deleteFile(filePath);
    if (rc !== 0) {
      console.log(`Could not deregister plugin ${pluginDefinition.identifier}, delete ${filePath} failed, error=${rc}`);
    }
    return rc !== 0;
  } else {
    return deregisterApp2App(pluginDefinition.identifier);
  }
}

function deregisterApp2App(appId) {
  const actionPath = path.join(actionsDirectory, appId);
  if (fs.fileExists(actionPath, true)) {
    const rc = deleteFile(actionPath);
    if (rc !== 0) {
      console.log(`Could not deregister plugin ${appId}, delete ${actionPath} failed, error=${rc}`);
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
    fs.getFilesInDirectory(pluginRecognizersLocation).forEach(filename => {
      const filepath = pathoid.resolve(pluginRecognizersLocation, filename);
      const filepathConfig = path.resolve(path.join(recognizerDirectory, filename));
      
      recognizers = JSON.parse(xplatform.loadFileUTF8(filepath, xplatform.AUTO_DETECT)).recognizers;
      recognizersKeys = Object.keys(recognizers)
      for (const key of recognizersKeys) { // Add metadata for plugin version & plugin identifier of origin (though objects don't have to be plugin specific)
        recognizers[key].pluginVersion = appVers;
        recognizers[key].pluginIdentifier = appId;
        recognizers[key].key = appId + ":" + key + ":" + recognizers[key].id; // pluginid_that_provided_it:index(or_name)_in_that_provider:actionid
      }
      console.log(`ZWED0301I Found ${recognizers} in config for '${appId}'`);
      try { // Get pre-existing recognizers in config, if any
        configRecognizers = JSON.parse(xplatform.loadFileUTF8(filepathConfig, xplatform.AUTO_DETECT)).recognizers;
        const configRecognizersKeys = Object.keys(configRecognizers);
        for (const configKey of configRecognizersKeys) { // Traverse config recognizers
          for (const key of recognizerKeys) { // Traverse plugin recognizers
            if (configRecognizers[configKey].key && recognizers[key].key && configRecognizers[configKey].key == recognizers[key].key) { // TODO: Need to implement real keys for Recognizers
              configRecognizers[configKey] = recognizers[key]; // Choose the recognizers originating from plugin
            }
          }
        }
        recognizers = Object.assign(configRecognizers, recognizers); // // If found, combine the ones found in config with ones found in plugin
      } catch (e) {
        logger.debug("No existing recognizers were found in config for '" + appId + "'");
      }
      
      if (recognizers) { // Attempt to copy recognizers over to config location for Desktop access later
        try { //TODO: Doing recognizers.recognizers is redundant. We may want to consider refactoring in the future
          xplatform.storeFileUTF8(filepathConfig, xplatform.AUTO_DETECT,  '{ "recognizers":' + JSON.stringify(recognizers) + '}');
          console.log("ZWED0294I Successfully loaded " + recognizers.length + " recognizers for '" + appId + "' into config");
        } catch (e) {
          console.log(`ZWED0177W Unable to load ${recognizers} for '${appId}' into config`);
        }
      }
      
    });
  }
}

function copyActions(appDir, appId, appVers) {
  let actions;
  let actionsKeys;
  const pluginActionsLocation = pathoid.join(appDir, "config", "actions", appId);

  if (fs.fileExists(pluginActionsLocation)) {
    try { // Get actions in a plugin's appDir/config/xxx location
      actions = JSON.parse(xplatform.loadFileUTF8(pluginActionsLocation, xplatform.AUTO_DETECT)).actions;
      actionsKeys = Object.keys(actions)
      for (const key of actionsKeys) { // Add metadata for plugin version & plugin identifier of origin (though objects don't have to be plugin specific)
        actions[key].pluginVersion = appVers;
        actions[key].pluginIdentifier = appId;
      }
      console.log(`ZWED0301I Found ${actions} in config for '${appId}'`);
    } catch (e) {
      console.log(`Error: Malformed JSON in ${pluginActionsLocation}`);
    }

    if (actions) { // Attempt to copy actions over to config location for Desktop access later
      try { //TODO: Doing actions.actions is redundant. We may want to consider refactoring in the future
        xplatform.storeFileUTF8(pathoid.join(actionsDirectory, appId), xplatform.AUTO_DETECT,  '{ "actions":' + JSON.stringify(actions) + '}');
        console.log("ZWED0295I Successfully loaded " + actions.length + " actions for '" + appId + "' into config");
      } catch (e) {
        console.log(`ZWED0177W Unable to load ${actions} for '${appId}' into config`);
      }
    }
  }
}


if (!fs.directoryExists(pluginPointerDirectory, true)) {
  const rc = os.mkdir(pluginPointerDirectory, 0o770);
  if (rc < 0) {
    console.log(`Could not create pluginsDir=${pluginPointerDirectory}, err=${rc}`);
    std.exit(2);
  }
}

console.log("Start iteration");

//A port of https://github.com/zowe/zlux-app-server/blob/v2.x/staging/bin/init/plugins-init.sh

installedComponents.forEach(function(installedComponent) {
  const componentDirectory = componentlib.findComponentDirectory(installedComponent);
  if (componentDirectory) {
    const enabled = enabledComponents.includes(installedComponent);
    console.log(`Checking plugins for component=${installedComponent}, enabled=${enabled}`);

    const manifest = componentlib.getManifest(componentDirectory);
    if (manifest.appfwPlugins) {
      manifest.appfwPlugins.forEach(function (manifestPluginRef) {
        const path = manifestPluginRef.path;
        const fullPath = `${componentDirectory}/${path}`
        const pluginDefinition = componentlib.getPluginDefinition(fullPath);
        if (pluginDefinition) {
          if (enabled) {
            console.log(`Registering plugin ${fullPath}`);
            registerPlugin(fullPath, pluginDefinition);
          } else {
            console.log(`Deregistering plugin ${fullPath}`);
            deregisterPlugin(pluginDefinition);
          }
        } else {
          console.log(`Skipping plugin at ${fullPath} due to pluginDefinition missing or invalid`);
        }
      });
    }
  } else {
    console.log(`Warning: Could not remove app framework plugins for extension ${installedComponent} because its directory could not be found within ${extensionDirectory}`);
  }
});

