/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');

module.exports.registerBundledPlugins = function(destination, configDestination, 
                                                 oldPlugins, filePermission) {
  let pluginsFolder = path.join(__dirname, '..', 'defaults', 'plugins');
  let items = fs.readdirSync(pluginsFolder);
  console.log('ZWED5011I - Generating default plugin references');
  items.forEach(function (item) {
    let itemPath = path.join(pluginsFolder, item);
    let defaultJson = JSON.parse(fs.readFileSync(itemPath), 'utf8');
    let location;
    let relativeTo;
    if (path.isAbsolute(defaultJson.pluginLocation)) {
      location = defaultJson.pluginLocation;
    } else if (defaultJson.relativeTo) {
      location = defaultJson.pluginLocation;
      relativeTo = defaultJson.relativeTo;
    } else {
      path.join(__dirname, '..', '..', defaultJson.pluginLocation.substring(6)).replace(/\\/g,"\\\\");
    }
    
    if (! fs.lstatSync(itemPath).isDirectory() ){
      let keepOldJson = false;
      try {
        if (oldPlugins.indexOf(item) != -1) {
          const oldJson = JSON.parse(fs.readFileSync(path.join(destination,item)));
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
        const identifier = item.substring(0,item.length-5);
        const newJson = {identifier, pluginLocation:location, relativeTo};
        fs.writeFileSync(path.join(destination,item),
                         JSON.stringify(newJson,null,2),
                         {encoding: 'utf8' , mode: filePermission});

        //small hack for 2 terminals configuration
        if (identifier == 'org.zowe.terminal.vt' && process.env['ZOWE_ZLUX_SSH_PORT']) {
          let defaultConfigDir = path.join(configDestination,'org.zowe.terminal.vt','sessions');
          mkdirp.sync(defaultConfigDir);
          try {
            fs.writeFileSync(path.join(defaultConfigDir,'_defaultVT.json'),
                             JSON.stringify({host:"",
                                             port: process.env['ZOWE_ZLUX_SSH_PORT'],
                                             security: {type: "ssh"}},null,2));
          } catch (e) {
            console.log('ZWED5016E - Could not customize vt-ng2, error writing json=',e);
          }
        } else if (identifier == 'org.zowe.terminal.tn3270' && process.env['ZOWE_ZLUX_TELNET_PORT']) {
          let security = 'telnet';
          if (process.env['ZOWE_ZLUX_SECURITY_TYPE']) {
            security = process.env['ZOWE_ZLUX_SECURITY_TYPE'];
          }
          let defaultConfigDir = path.join(configDestination,'org.zowe.terminal.tn3270','sessions');
          mkdirp.sync(defaultConfigDir);
          try {
            fs.writeFileSync(path.join(defaultConfigDir,'_defaultTN3270.json'),
                             JSON.stringify({host:"",
                                             port: process.env['ZOWE_ZLUX_TELNET_PORT'],
                                             security: {type: security}},null,2));
          } catch (e) {
            console.log('ZWED5017E - Could not customize tn3270-ng2, error writing json=',e);
          }
        }
      }
    }
  });  
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

