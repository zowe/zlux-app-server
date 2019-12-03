/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
 
 SPDX-License-Identifier: EPL-2.0
 
 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const path = require('path');
const jsonUtils = require('../../zlux-server-framework/lib/jsonUtils');
const mergeUtils = require('../../zlux-server-framework/utils/mergeUtils');
const ncp = require('ncp').ncp;
const mkdirp = require('mkdirp');
let defaultConfig = jsonUtils.parseJSONWithComments('../defaults/serverConfig/server.json');
let configAsString = fs.readFileSync('../defaults/serverConfig/server.template.json', 'utf8');
//let it throw if it cant read

/*
steps:
1. string.replace $ with env vars
2. get rid of all $ left over
3. jsonparse
4. merge recursively
*/


let envKeys = Object.keys(process.env);
for (let i = 0; i < envKeys.length; i++){
  configAsString = configAsString.replace(new RegExp("\$"+envKeys[i]), process.env[envKeys[i]]);
}
configAsString = configAsString.split('\n').filter(line => !line.includes("$ZWED_")).join('\n');
let config = JSON.parse(configAsString);
let configKeys = Object.keys(config);
for (let i = 0; i < configKeys.length; i++) {
  if (typeof config[configKeys[i]] == 'object' && Object.keys(config[configKeys[i]]) != 0) {
    delete config[configKeys[i]];
  }
}
delete defaultConfig.siteDir;
delete defaultConfig.instanceDir;
delete defaultConfig.groupsDir;
delete defaultConfig.usersDir;
delete defaultConfig.pluginsDir;

config = mergeUtils.deepAssign(config, defaultConfig);
config.productDir = path.join(__dirname, '..', 'defaults');
let destination;
if (process.env.WORKSPACE_DIR && process.env.WORKSPACE_DIR != '""') {
  destination = path.join(process.env.WORKSPACE_DIR, 'app-server');
} else {
  destination = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, '.zowe', 'app-server')
    : path.join(process.env.HOME, '.zowe', 'app-server');
}

const FOLDER_MODE = 0o0750 & (~process.umask());
const FILE_MODE = 0o0740 & (~process.umask());

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
let instanceItems = [];
try {
  instanceItems = fs.readdirSync(config.pluginsDir);
} catch (e) {
  console.warn("Warning: couldn't read plugin directory",e);
  //Couldnt read, will copy defaults
}
if (instanceItems.length == 0) {
  //copy all from defaults
  let pluginsFolder = path.join(__dirname, '..', 'defaults', 'plugins');
  let items = fs.readdirSync(pluginsFolder);
  console.log('Generating default plugin references');
  items.forEach(function (item) {

    let itemPath = path.join(pluginsFolder, item);
    if (! fs.lstatSync(itemPath).isDirectory() ){
      let oldJson = JSON.parse(fs.readFileSync(itemPath), 'utf8');
      const identifier = item.substring(0,item.length-5);
      const location = path.join(__dirname, '..', '..', oldJson.pluginLocation.substring(6)).replace(/\\/g,"\\\\");

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

console.log('Creating new config=', config);
fs.writeFileSync(path.join(destination, 'serverConfig', 'server.json'), JSON.stringify(config, null, 2), 
                 {encoding: 'utf8', mode: FILE_MODE});


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
