/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const path = require('path');

const ZLUX_ROOT_DIR = path.join(__dirname, '..');
const DEFAULT_PLUGINS_DIR = path.join(ZLUX_ROOT_DIR, 'defaults', 'plugins');
module.exports.FOLDER_MODE = 0o0770;
module.exports.FILE_MODE = 0o0770;

module.exports.registerBundledPlugins = function(destination, configDestination, 
                                                 oldPlugins, filePermission) {
  let items = fs.readdirSync(DEFAULT_PLUGINS_DIR);
  console.log('ZWED5011I - Generating default plugin references');
  items.forEach(function (item) {
    registerBundledPlugin(item, destination, oldPlugins, filePermission);
  });
}

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

module.exports.setTerminalDefaults = function(configDestination, instanceItems) {
  if (instanceItems.indexOf('org.zowe.terminal.vt.json') != -1) {
    let defaultConfigDir = path.join(configDestination,'org.zowe.terminal.vt','sessions');
    fs.mkdirSync(defaultConfigDir, {recursive: true});
    try {
      fs.writeFileSync(path.join(defaultConfigDir,'_defaultVT.json'),
                       JSON.stringify({host:process.env['ZWED_SSH_HOST'] ? process.env['ZWED_SSH_HOST'] : "",
                                       port: process.env['ZWED_SSH_PORT'] ? process.env['ZWED_SSH_PORT'] : 22,
                                       security: {type: "ssh"}},null,2));
    } catch (e) {
      console.log('ZWED5016E - Could not customize vt-ng2, error writing json=',e);
    }
  }
  if (instanceItems.indexOf('org.zowe.terminal.tn3270.json') != -1) {
    let security = 'telnet';
    if (process.env['ZWED_TN3270_SECURITY']) {
      security = process.env['ZWED_TN3270_SECURITY'];
    }
    let defaultConfigDir = path.join(configDestination,'org.zowe.terminal.tn3270','sessions');
    fs.mkdirSync(defaultConfigDir, {recursive: true});
    try {
      let tn3270Json = {host:process.env['ZWED_TN3270_HOST'] ? process.env['ZWED_TN3270_HOST'] : "",
                        port: process.env['ZWED_TN3270_PORT'] ? process.env['ZWED_TN3270_PORT'] : 23,
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

