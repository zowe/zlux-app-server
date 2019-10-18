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
configAsString = configAsString.split('\n').filter(line => !line.includes("$ZOWE_UI")).join('\n');
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
if (process.env.ZOWE_UI_INST_DIR) {
  destination = process.env.ZOWE_UI_INST_DIR;
} else if (process.env.ZOWE_INST_DIR) {
  destination = path.join(process.env.ZOWE_INST_DIR, '.zowe', 'ui');
} else {
  destination = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, '.zowe', 'ui')
    : path.join(process.env.HOME, '.zowe', 'ui');
}

const FOLDER_MODE = 0o0750 & (~process.umask());
const FILE_MODE = 0o0740 & (~process.umask());

mkdirp.sync(destination, {mode: FOLDER_MODE});

if (!config.siteDir) {
  config.siteDir = path.join(destination, 'site');
  mkdirp.sync(config.siteDir, {mode: FOLDER_MODE});
}
if (!config.instanceDir) {
  config.instanceDir = path.join(destination, 'instance');
  mkdirp.sync(config.instanceDir, {mode: FOLDER_MODE});
}
if (!config.groupsDir) {
  config.groupsDir = path.join(destination, 'instance', 'groups');
  mkdirp.sync(config.groupsDir, {mode: FOLDER_MODE});
}
if (!config.usersDir) {
  config.usersDir = path.join(destination, 'instance', 'users');
  mkdirp.sync(config.usersDir, {mode: FOLDER_MODE});
}
if (!config.pluginsDir) {
  config.pluginsDir = path.join(destination, 'instance', 'plugins');
  mkdirp.sync(config.pluginsDir, {mode: FOLDER_MODE});

  //copy all from defaults
  let pluginsFolder = path.join(__dirname, '..', 'defaults', 'plugins');
  let items = fs.readdirSync(pluginsFolder);
  console.log('Generating default plugin references');
  items.forEach(function (item) {
    let itemPath = path.join(pluginsFolder, item);
    if (! fs.lstatSync(itemPath).isDirectory() ){
      let oldJson = JSON.parse(fs.readFileSync(itemPath), 'utf8');
      fs.writeFileSync(path.join(config.pluginsDir,item),
                       '{"identifier":"'+item.substring(0,item.length-5)
                       +'",\n"pluginLocation":"'
                       +path.join(__dirname, '..', '..', oldJson.pluginLocation.substring(6)).replace(/\\/g,"\\\\")
                       +'"}', {encoding: 'utf8' , mode: FILE_MODE});
    }
  });
}
console.log('Creating new config=', config);
fs.writeFileSync(path.join(destination, 'server.json'), JSON.stringify(config, null, 2), 
                 {encoding: 'utf8', mode: FILE_MODE});






