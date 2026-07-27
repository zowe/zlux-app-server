/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const os = require('os');
const path = require('path');

const ZLUX_ROOT_DIR = path.join(__dirname, '..');
const DEFAULT_PLUGINS_DIR = path.join(ZLUX_ROOT_DIR, 'defaults', 'plugins');
const USERNAME = os.userInfo().username;
const LOG_LEVEL = process.env.ZWE_PRIVATE_LOG_LEVEL_ZWELS;
const PRINT_DEBUG = LOG_LEVEL == 'DEBUG' || LOG_LEVEL == 'TRACE';
const FILE_MODE = 0o770;
const FOLDER_MODE = 0o770;
module.exports.FOLDER_MODE = FOLDER_MODE;
module.exports.FILE_MODE = FILE_MODE;

module.exports.registerBundledPlugins = function(destination, configDestination, 
                                                 oldPlugins, filePermission) {
  let items = fs.readdirSync(DEFAULT_PLUGINS_DIR);
  console.log('ZWED5011I - Generating default plugin references');
  items.forEach(function (item) {
    registerBundledPlugin(item, destination, oldPlugins, filePermission);
  });
}

function mkdirp(directory, mode) {
  try {
    fs.mkdirSync(directory, {mode: mode, recursive: true});
  } catch (e) {
    if (e.code != 'EEXIST') {
      throw e;
    }
  }
}
module.exports.mkdirp = mkdirp;


function printFormattedMessage(level, message) {
  var d = new Date();
//  d.setTime(d.getTime()-Logger.offsetMs);
  var dateString = d.toISOString();
  dateString = dateString.substring(0,dateString.length-1).replace('T',' ');
  console.log(`${dateString} <ZWED:${process.pid}> ${USERNAME} ${level} (plugins-init) ${message}`);
}

function printFormattedError(message) {
  printFormattedMessage('ERROR', message);
}
module.exports.printFormattedError = printFormattedError;

function printFormattedInfo(message) {
  printFormattedMessage('INFO', message);
}
module.exports.printFormattedInfo = printFormattedInfo;


function printFormattedDebug(message) {
  if (PRINT_DEBUG) {
    printFormattedMessage('DEBUG', message);
  }
}
module.exports.printFormattedDebug = printFormattedDebug;

function getManifestPath(componentDir) {
  if (fileExists(`${componentDir}/manifest.yaml`)) {
    return `${componentDir}/manifest.yaml`;
  } else if (fileExists(`${componentDir}/manifest.yml`)) {
    return `${componentDir}/manifest.yml`;
  } else if (fileExists(`${componentDir}/manifest.json`)) {
    return `${componentDir}/manifest.json`;
  }
  return undefined;
}
module.exports.getManifestPath = getManifestPath;

function findComponentDirectory(runtimeDirectory, extensionDirectory, componentId) {
  if (directoryExists(`${runtimeDirectory}/components/${componentId}`)) {
    return `${runtimeDirectory}/components/${componentId}`;
  } else if (extensionDirectory && directoryExists(`${extensionDirectory}/${componentId}`)) {
    return `${extensionDirectory}/${componentId}`;
  } else if (directoryExists(`${runtimeDirectory}/components/app-server/share/${componentId}`)) {
    return `${runtimeDirectory}/components/app-server/share/${componentId}`;
  }
  return undefined;
}
module.exports.findComponentDirectory = findComponentDirectory;


function directoryExists(directory) {
  try {
    let stat = fs.statSync(directory);
    if (stat) {
      return stat.isDirectory();
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
}
module.exports.directoryExists = directoryExists;

function fileExists(file) {
  try {
    let stat = fs.statSync(file);
    if (stat) {
      return !stat.isDirectory();
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
}
module.exports.fileExists = fileExists;


function deregisterPlugin(pluginDefinition, pluginPointerDirectory, actionsDirectories, startMenuFoldersLocation) {
  const filePath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`;
  let removed = false;
  if (fileExists(filePath, true)) {
    try {
      fs.unlinkSync(filePath);
      removed = true;
    } catch (e) {
      printFormattedError(`Could not deregister plugin ${pluginDefinition.identifier}, delete ${filePath} failed, error=${e}`);
    }
  } else {
    removed = deregisterApp2App(pluginDefinition.identifier, actionsDirectories);
  }
  if (startMenuFoldersLocation) {
    const startMenuFile = path.resolve(startMenuFoldersLocation, pluginDefinition.identifier + '.json');
    if (fileExists(startMenuFile, true)) {
      try {
        fs.unlinkSync(startMenuFile);
        printFormattedDebug(`Removed start menu folders for ${pluginDefinition.identifier}`);
      } catch (e) {
        printFormattedError(`Could not remove start menu folders for ${pluginDefinition.identifier}: ${e.message}`);
      }
    }
  }
  return removed;
}
module.exports.deregisterPlugin = deregisterPlugin;

function deregisterApp2App(appId, actionsDirectories) {
  let exists = false;
  actionsDirectories.forEach((actionsDirectory) => {
  const actionPath = path.join(actionsDirectory, appId);
  if (fileExists(actionPath, true)) {
    try {
      fs.unlinkSync(actionPath);
    } catch (e) {
      printFormattedError(`Could not deregister plugin ${appId}, delete ${actionPath} failed, error=${e}`);
    }
    exists = true;
  }
  });
  return exists;
  //TODO how to deregister recognizer?
}
module.exports.deregisterApp2App = deregisterApp2App;



function registerApp2App(pluginDirectory, pluginId, pluginVersion, pluginActionsLocations, pluginRecognizersLocations) {
  printFormattedDebug(`app2app for ${pluginId}`);
  copyRecognizers(pluginDirectory, pluginId, pluginVersion, pluginRecognizersLocations);
  copyActions(pluginDirectory, pluginId, pluginVersion, pluginActionsLocations);
}
module.exports.registerApp2App = registerApp2App;

function copyStartMenuFolders(appDir, appId, appVers, startMenuFoldersDirectory) {
  const pluginFoldersLocation = path.join(appDir, 'config', 'startMenuFolders');
  if (!directoryExists(pluginFoldersLocation)) {
    return;
  }
  const srcPath = path.join(pluginFoldersLocation, 'folders.json');
  if (!fileExists(srcPath)) {
    return;
  }
  printFormattedDebug(`Found startMenuFolders/folders.json in ${appId}`);
  mkdirp(startMenuFoldersDirectory, FOLDER_MODE);

  const destPath = path.resolve(startMenuFoldersDirectory, appId + '.json');
  try {
    const folderData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    folderData.pluginIdentifier = appId;
    folderData.pluginVersion = appVers;
    fs.writeFileSync(destPath, JSON.stringify(folderData, null, 2), {encoding: 'utf8', mode: FILE_MODE});
    printFormattedInfo(`ZWED0296I Successfully loaded start menu folders for '${appId}' into ${destPath}`);
  } catch (e) {
    printFormattedError(`Error copying start menu folders for ${appId}: ${e.message}`);
  }
}
module.exports.copyStartMenuFolders = copyStartMenuFolders;

function copyRecognizers(appDir, appId, appVers, recognizerDirectories) {
  let recognizers;
  let recognizersKeys;
  let configRecognizers;
  const pluginRecognizersLocation = path.join(appDir, "config", "recognizers");


  if (directoryExists(pluginRecognizersLocation)) { // Get recognizers in a plugin's appDir/config/xxx location
    printFormattedDebug(`rec ${pluginRecognizersLocation} exists`);
    fs.readdirSync(pluginRecognizersLocation, {withFileTypes: true}).filter(statObj=> statObj.isFile())
    .forEach((statObj) => {
      const filename = statObj.name;
      const filepath = path.resolve(pluginRecognizersLocation, filename);
      
      recognizers = JSON.parse(fs.readFileSync(filepath, 'utf8')).recognizers;
      recognizersKeys = Object.keys(recognizers)
      for (const key of recognizersKeys) { // Add metadata for plugin version & plugin identifier of origin (though objects don't have to be plugin specific)
        recognizers[key].pluginVersion = appVers;
        recognizers[key].pluginIdentifier = appId;
        recognizers[key].key = appId + ":" + key + ":" + recognizers[key].id; // pluginid_that_provided_it:index(or_name)_in_that_provider:actionid
      }
      printFormattedDebug(`ZWED0301I Found ${filepath} in config for '${appId}'`);
      recognizerDirectories.forEach((recognizerDirectory) => {
      const filepathConfig = path.resolve(path.join(recognizerDirectory, filename));
      printFormattedDebug(`Going to merge into ${filepathConfig}`);
      try { // Get pre-existing recognizers in config, if any
        configRecognizers = fileExists(filepathConfig) ? JSON.parse(fs.readFileSync(filepathConfig, 'utf8')).recognizers : {};
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
        printFormattedError(`Error: Invalid JSON for ${filepathConfig}`);
      }
      });
      
      if (recognizers) { // Attempt to copy recognizers over to config location for Desktop access later
        recognizerDirectories.forEach((recognizerDirectory) => {
        const filepathConfig = path.resolve(path.join(recognizerDirectory, filename));
        try { //TODO: Doing recognizers.recognizers is redundant. We may want to consider refactoring in the future
          fs.writeFileSync(filepathConfig, '{ "recognizers":' + JSON.stringify(recognizers) + '}',
                           {encoding: 'utf8', mode: FILE_MODE});
          console.log("ZWED", "plugins-init", "ZWED0294I Successfully loaded " + Object.keys(recognizers).length + " recognizers for '" + appId + "' into config at "+filepathConfig);
        } catch (e) {
          printFormattedError(`ZWED0177W Unable to load ${recognizers} for '${appId}' into config`);
        }
        });
      }
      
    });
  }
  printFormattedDebug(`Done rec`);
}

function copyActions(appDir, appId, appVers, actionsDirectories) {
  let actions;
  let actionsKeys;
  const pluginActionsLocation = path.join(appDir, "config", "actions", appId);

  if (fileExists(pluginActionsLocation)) {
    printFormattedDebug(`act ${pluginActionsLocation} exists`);
    try { // Get actions in a plugin's appDir/config/xxx location
      actions = JSON.parse(fs.readFileSync(pluginActionsLocation, 'utf8')).actions;
      actionsKeys = Object.keys(actions)
      for (const key of actionsKeys) { // Add metadata for plugin version & plugin identifier of origin (though objects don't have to be plugin specific)
        actions[key].pluginVersion = appVers;
        actions[key].pluginIdentifier = appId;
      }
      printFormattedDebug(`ZWED0301I Found ${actions} in config for '${appId}'`);
    } catch (e) {
      printFormattedError(`Error: Malformed JSON in ${pluginActionsLocation}`);
    }

    if (actions) { // Attempt to copy actions over to config location for Desktop access later
      try { //TODO: Doing actions.actions is redundant. We may want to consider refactoring in the future
        actionsDirectories.forEach((actionsDirectory) => {
        fs.writeFileSync(path.join(actionsDirectory, appId), '{ "actions":' + JSON.stringify(actions) + '}',
                         {encoding: 'utf8', mode: FILE_MODE});
          printFormattedInfo("ZWED0295I Successfully loaded " + actions.length + " actions for '" + appId + "' into config at "+path.join(actionsDirectory, appId));
        });
      } catch (e) {
        printFormattedError(`ZWED0177W Unable to load ${actions} for '${appId}' into config`);
      }
    }
  }
  printFormattedDebug(`done act`);
}


function registerPlugin(pluginPath, pluginDefinition, pluginPointerDirectory, pluginActionsLocations, pluginRecognizersLocations, runtimeDirectory, startMenuFoldersLocation) {
  const pointerPath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`; 
  let location, relativeTo;
  if (pluginPath.startsWith(runtimeDirectory)) {
    relativeTo = "$ZWE_zowe_runtimeDirectory";
    location = pluginPath.substring(runtimeDirectory.length);
    if (location.startsWith('/')) {
      location = location.substring(1);
    }

    fs.writeFileSync(pointerPath, JSON.stringify({
      "identifier": pluginDefinition.identifier,
      "pluginLocation": location,
      "relativeTo": relativeTo
    }, null, 2), {encoding: 'utf8', mode: FILE_MODE});
  } else {
    fs.writeFileSync(pointerPath, JSON.stringify({
      "identifier": pluginDefinition.identifier,
      "pluginLocation": pluginPath
    }, null, 2), {encoding: 'utf8', mode: FILE_MODE});
  }
  registerApp2App(pluginPath, pluginDefinition.identifier, pluginDefinition.pluginVersion, pluginActionsLocations, pluginRecognizersLocations);
  if (startMenuFoldersLocation) {
    copyStartMenuFolders(pluginPath, pluginDefinition.identifier, pluginDefinition.pluginVersion, startMenuFoldersLocation);
  }
}
module.exports.registerPlugin = registerPlugin;

/**
  @param pluginID Identifier of a plugin
  @param outputDir plugins directory where plugin identifier file will be placed
  @param filePermission permission of new file if created
  @param oldPlugins array of plugins seen at destination prior to creation of new plugins
  @throws filenotfound error if plugin requested is not a bundled plugin.
*/
let registerBundledPlugin = function(pluginId, destination, oldPlugins, filePermission) {
  let pluginFilename = pluginId.endsWith('.json') ? pluginId : pluginId+'.json'
  let pluginFilePath = path.join(DEFAULT_PLUGINS_DIR, pluginFilename);
  let defaultJson = JSON.parse(fs.readFileSync(pluginFilePath), 'utf8');
  let location;
  let relativeTo;
  if (path.isAbsolute(defaultJson.pluginLocation)) {
    location = defaultJson.pluginLocation;
  } else if (defaultJson.relativeTo) {
    location = defaultJson.pluginLocation;
    relativeTo = defaultJson.relativeTo;
  } else {
    //TODO should this be removed in v2? It is a weird path assumption
    location = path.join(__dirname, '..', '..', defaultJson.pluginLocation.substring(6)).replace(/\\/g,"\\\\");
  }
  
  if (! fs.lstatSync(pluginFilePath).isDirectory() ){
    let keepOldJson = false;
    try {
      if (oldPlugins.indexOf(pluginFilename) != -1) {
        const oldJson = JSON.parse(fs.readFileSync(path.join(destination,pluginFilename)));
        //if contents are identical, dont bother rewriting
        if ((oldJson.relativeTo == relativeTo) && (oldJson.pluginLocation == location)) {
          keepOldJson = true;
        }
      }
    } catch (e) {
      console.warn('Error reading old plugin reference in workspace folder, leaving unchanged.');
      keepOldJson = true;
    }

    if (!keepOldJson) {
      const identifier = pluginFilename.substring(0,pluginFilename.length-5);
      const newJson = {identifier, pluginLocation:location, relativeTo};
      fs.writeFileSync(path.join(destination,pluginFilename),
                       JSON.stringify(newJson,null,2),
                       {encoding: 'utf8' , mode: filePermission});
    }
  }
}
module.exports.registerBundledPlugin = registerBundledPlugin;

function readPortFromUnixConfig(configFile, regex) {
  let result = 0;
  let configContent;
  if (fileExists(configFile)) {
    try {
      // File exists, but permission could be an inssue
      configContent = fs.readFileSync(configFile, 'utf8');
    }
    catch (e) {
      return result;
    }
    if (configContent) {
      const configLines = configContent.split('\n');
      for (let line in configLines) {
        const matchLine = configLines[line].match(regex);
        if (matchLine) {
          const portNumber = parseInt(matchLine[0].replace(/\s+/g, " ").split(' ')[1]);
          if (portNumber > 0 && portNumber < 65536) {
            printFormattedDebug(`readPortFromUnixConfig: ${configFile} -> "${matchLine[0]}" -> ${portNumber}`);
            result = portNumber;
          }
        }
      }
    }
  }
  return result;
}

module.exports.setTerminalDefaults = function(configDestination, instanceItems, zoweConfig) {
  if (instanceItems.indexOf('org.zowe.terminal.vt.json') != -1) {
    const yamlVTDefaults = zoweConfig && zoweConfig.components && zoweConfig.components['vt-ng2']
      ? zoweConfig.components['vt-ng2'].defaults : undefined;
    let vtHost, vtPort;
    if (yamlVTDefaults) {
      vtHost = yamlVTDefaults.host !== undefined ? yamlVTDefaults.host : "";
      vtPort = yamlVTDefaults.port !== undefined ? yamlVTDefaults.port : 22;
    } else {
      if (!process.env['ZWED_SSH_PORT']) {
        const sshPort = readPortFromUnixConfig('/etc/ssh/sshd_config', /^port[\s]+[0-9]{1,5}/i);
        if (sshPort) {
          process.env['ZWED_SSH_PORT'] = sshPort;
        }
      }
      vtHost = process.env['ZWED_SSH_HOST'] ? process.env['ZWED_SSH_HOST'] : "";
      vtPort = process.env['ZWED_SSH_PORT'] ? process.env['ZWED_SSH_PORT'] : 22;
    }
    let defaultConfigDir = path.join(configDestination,'org.zowe.terminal.vt','sessions');
    mkdirp(defaultConfigDir);
    try {
      fs.writeFileSync(path.join(defaultConfigDir,'_defaultVT.json'),
                       JSON.stringify({host: vtHost, port: vtPort, security: {type: "ssh"}}, null, 2));
    } catch (e) {
      console.log('ZWED5016E - Could not customize vt-ng2, error writing json=',e);
    }
  }
  if (instanceItems.indexOf('org.zowe.terminal.tn3270.json') != -1) {
    const yamlTN3270Defaults = zoweConfig && zoweConfig.components && zoweConfig.components['tn3270-ng2']
      ? zoweConfig.components['tn3270-ng2'].defaults : undefined;
    let tn3270Json;
    if (yamlTN3270Defaults) {
      let tn3270Host = yamlTN3270Defaults.host !== undefined ? yamlTN3270Defaults.host : "";
      let tn3270Port = yamlTN3270Defaults.port !== undefined ? yamlTN3270Defaults.port : 992;
      let tn3270Security = (yamlTN3270Defaults.security && yamlTN3270Defaults.security.type)
        ? yamlTN3270Defaults.security.type : 'tls';
      tn3270Json = {host: tn3270Host, port: tn3270Port, security: {type: tn3270Security}};
      if (yamlTN3270Defaults.mod !== undefined) {
        let mod = Number(yamlTN3270Defaults.mod);
        if (!isNaN(mod)) {
          tn3270Json.deviceType = ""+(mod-1);
        } else {
          tn3270Json.deviceType = "5"; //"dynamic"
        }
      }
      if (yamlTN3270Defaults.height !== undefined) {
        let rowNum = Number(yamlTN3270Defaults.height);
        if (!isNaN(rowNum)) {
          tn3270Json.alternateHeight = Math.min(Math.max(rowNum, 24), 80);
        }
      }
      if (yamlTN3270Defaults.width !== undefined) {
        let colNum = Number(yamlTN3270Defaults.width);
        if (!isNaN(colNum)) {
          tn3270Json.alternateWidth = Math.min(Math.max(colNum, 80), 160);
        }
      }
      if (yamlTN3270Defaults.codepage !== undefined) {
        tn3270Json.charsetName = yamlTN3270Defaults.codepage;
      }
    } else {
      if (!process.env['ZWED_TN3270_PORT']) {
        const telnetPort = readPortFromUnixConfig('/etc/services', /^telnet[\s]+[0-9]{1,5}/i);
        if (telnetPort) {
          process.env['ZWED_TN3270_PORT'] = telnetPort;
        }
      }
      let security = 'tls';
      if (process.env['ZWED_TN3270_SECURITY']) {
        security = process.env['ZWED_TN3270_SECURITY'];
      }
      tn3270Json = {host:process.env['ZWED_TN3270_HOST'] ? process.env['ZWED_TN3270_HOST'] : "",
                    port: process.env['ZWED_TN3270_PORT'] ? process.env['ZWED_TN3270_PORT'] : 992,
                    security: {type: security}};
      if (process.env['ZWED_TN3270_MOD']) {
        let mod = Number(process.env['ZWED_TN3270_MOD']);
        if (!isNaN(mod)) {
          tn3270Json.deviceType = ""+(mod-1);
        } else {
          tn3270Json.deviceType = "5"; //"dynamic"
        }
      }
      if (process.env['ZWED_TN3270_ROW']) {
        let rowNum = Number(process.env['ZWED_TN3270_ROW']);
        if (!isNaN(rowNum)) {
          tn3270Json.alternateHeight = Math.min(Math.max(rowNum, 24),80);
        }
      }
      if (process.env['ZWED_TN3270_COL']) {
        let colNum = Number(process.env['ZWED_TN3270_COL']);
        if (!isNaN(colNum)) {
          tn3270Json.alternateWidth = Math.min(Math.max(colNum, 80),160);
        }
      }
      if (process.env['ZWED_TN3270_CODEPAGE']) {
        tn3270Json.charsetName = process.env['ZWED_TN3270_CODEPAGE'];
      }
    }
    let defaultConfigDir = path.join(configDestination,'org.zowe.terminal.tn3270','sessions');
    mkdirp(defaultConfigDir);
    try {
      fs.writeFileSync(path.join(defaultConfigDir,'_defaultTN3270.json'),
                       JSON.stringify(tn3270Json));
    } catch (e) {
      console.log('ZWED5017E - Could not customize tn3270-ng2, error writing json=',e);
    }
  }
}

/* Warning: This function is unused and the way it works is subject to change */
module.exports.getLastZoweRoot = function(workspaceLocation) {
  try {
    const backupsDirContent = fs.readdirSync(path.join(workspaceLocation, 'backups'));
    if (backupsDirContent.length == 0) {return null;}
    let lastBackup = backupsDirContent[0];
    backupsDirContent.forEach((backup)=> {
      if (backup > lastBackup) {
        lastBackup = backup;
      }
    });
    const lines = fs.readFileSync(path.join(workspaceLocation, 'backups', lastBackup),'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('ROOT_DIR=')) {
        /*ex: ROOT_DIR=/opt/zowe/zowe-1.11.0 */
        return lines[i].substr(9);
      }
    }
  } catch (e) {
    console.warn('Could not read workspace backup directory, previous Zowe version unknown');
    return null;
  }
  return null;//dev environment with no env files in backups?
}

