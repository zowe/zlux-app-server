/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
 
 SPDX-License-Identifier: EPL-2.0
 
 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const path = require('path');
const argParser = require('../../zlux-server-framework/utils/argumentParser');
const jsonUtils = require('../../zlux-server-framework/lib/jsonUtils');
const mergeUtils = require('../../zlux-server-framework/utils/mergeUtils');
const ncp = require('ncp').ncp;
const mkdirp = require('mkdirp');

const FOLDER_MODE = 0o0750 & (~process.umask());
const FILE_MODE = 0o0740 & (~process.umask());



let destination;
//Where are we: dev environment? Official install?
if (process.env.WORKSPACE_DIR && process.env.WORKSPACE_DIR != '""') {
  destination = path.join(process.env.WORKSPACE_DIR, 'app-server');
} else if (process.env.INSTANCE_DIR && process.env.INSTANCE_DIR != '""') {
  destination = path.join(process.env.INSTANCE_DIR, 'workspace', 'app-server');
} else {
  destination = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, '.zowe', 'workspace', 'app-server')
    : path.join(process.env.HOME, '.zowe', 'workspace', 'app-server');
}
let createJson = false;
try {
  let currentJsonConfig = fs.readFileSync(path.join(destination, 'serverConfig', 'server.json'));
} catch (e) {
  if (e.code == 'ENOENT') {
    createJson = true;
  } else {
    console.log('Warning: Could not read server.json, error='+e.message);
  }
}

let config = argParser.environmentVarsToObject("ZWED_");
if (createJson) {
  let defaultConfig = jsonUtils.parseJSONWithComments('../defaults/serverConfig/server.json');

  delete defaultConfig.siteDir;
  delete defaultConfig.instanceDir;
  delete defaultConfig.groupsDir;
  delete defaultConfig.usersDir;
  delete defaultConfig.pluginsDir;

  config = mergeUtils.deepAssign(defaultConfig, config);
}

config.productDir = path.join(__dirname, '..', 'defaults');

//Begin generate any missing folders
mkdirp.sync(destination, {mode: FOLDER_MODE});

if (!config.siteDir) {
  config.siteDir = path.join(destination, 'site');
}
const sitePluginStorage = path.join(config.siteDir, 'ZLUX', 'pluginStorage');
mkdirp.sync(sitePluginStorage, {mode: FOLDER_MODE});

if (!config.instanceDir) {
  config.instanceDir = destination;
}
const instancePluginStorage = path.join(config.instanceDir, 'ZLUX', 'pluginStorage');
mkdirp.sync(instancePluginStorage, {mode: FOLDER_MODE});
const instanceConfig = path.join(config.instanceDir, 'serverConfig');
mkdirp.sync(instanceConfig, {mode: FOLDER_MODE});

if (!config.groupsDir) {
  config.groupsDir = path.join(config.instanceDir, 'groups');
}
mkdirp.sync(path.join(config.groupsDir, 'ZLUX', 'pluginStorage'), {mode: FOLDER_MODE});

if (!config.usersDir) {
  config.usersDir = path.join(config.instanceDir, 'users');
}
mkdirp.sync(path.join(config.usersDir, 'ZLUX', 'pluginStorage'), {mode: FOLDER_MODE});

if (!config.pluginsDir) {
  config.pluginsDir = path.join(destination, 'plugins');
}

mkdirp.sync(config.pluginsDir, {mode: FOLDER_MODE});

//Write new config json only if one does not exist
if (createJson) {
  console.log('Creating new config=', config);
  fs.writeFileSync(path.join(destination, 'serverConfig', 'server.json'), JSON.stringify(config, null, 2), 
                   {encoding: 'utf8', mode: FILE_MODE});
}


//Copy default plugins if no plugins found
let instanceItems = [];
try {
  instanceItems = fs.readdirSync(config.pluginsDir);
} catch (e) {
  console.warn("Warning: couldn't read plugin directory",e);
  //Couldnt read, will copy defaults
}
if (instanceItems.length == 0) {
  let pluginsFolder = path.join(__dirname, '..', 'defaults', 'plugins');
  let items = fs.readdirSync(pluginsFolder);
  console.log('Generating default plugin references');
  items.forEach(function (item) {

    let itemPath = path.join(pluginsFolder, item);
    if (! fs.lstatSync(itemPath).isDirectory() ){
      let oldJson = JSON.parse(fs.readFileSync(itemPath), 'utf8');
      const identifier = item.substring(0,item.length-5);
      const location = path.isAbsolute(oldJson.pluginLocation)
            ? oldJson.pluginLocation
            : path.join(__dirname, '..', '..', oldJson.pluginLocation.substring(6)).replace(/\\/g,"\\\\");

      fs.writeFileSync(path.join(config.pluginsDir,item),
                       '{"identifier":"'+identifier
                       +'",\n"pluginLocation":"'+location
                       +'"}', {encoding: 'utf8' , mode: FILE_MODE});
      
      //small hack for 2 terminals configuration
      if (identifier == 'org.zowe.terminal.vt' && process.env['ZOWE_ZLUX_SSH_PORT']) {
        let defaultConfigDir = path.join(instancePluginStorage,'org.zowe.terminal.vt','sessions');
        mkdirp.sync(defaultConfigDir);
        try {
          fs.writeFileSync(path.join(defaultConfigDir,'_defaultVT.json'),
                           JSON.stringify({host:"",
                                           port: process.env['ZOWE_ZLUX_SSH_PORT'],
                                           security: {type: "ssh"}},null,2));
        } catch (e) {
          console.log('Could not customize vt-ng2, error writing json=',e);
        }
      } else if (identifier == 'org.zowe.terminal.tn3270' && process.env['ZOWE_ZLUX_TELNET_PORT']) {
        let security = 'telnet';
        if (process.env['ZOWE_ZLUX_SECURITY_TYPE']) {
          security = process.env['ZOWE_ZLUX_SECURITY_TYPE'];
        }
        let defaultConfigDir = path.join(instancePluginStorage,'org.zowe.terminal.tn3270','sessions');
        mkdirp.sync(defaultConfigDir);
        try {
          fs.writeFileSync(path.join(defaultConfigDir,'_defaultTN3270.json'),
                           JSON.stringify({host:"",
                                           port: process.env['ZOWE_ZLUX_TELNET_PORT'],
                                           security: {type: security}},null,2));
        } catch (e) {
          console.log('Could not customize tn3270-ng2, error writing json=',e);
        }
      }  
    }
  });
}

let siteStorage = [];
let instanceStorage = [];
try {
  siteStorage = fs.readdirSync(sitePluginStorage);
  instanceStorage = fs.readdirSync(instancePluginStorage);
} catch (e) {
  console.warn("Warning: couldn't read site or instance storage",e);
  //couldnt read, treat as empty
}
if (siteStorage.length == 0 && instanceStorage.length == 0) {
  console.log("Copying default plugin preferences into instance");
  ncp(path.join(config.productDir, 'ZLUX', 'pluginStorage'), instancePluginStorage, function(err){
    if (err) {
      console.warn('Warning: error while copying plugin preferences into instance',err);
      process.exit(1);
    }
    process.exit(0);
  });
} else {
  process.exit(0);
}
