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
const initUtils = require('./initUtils');
const upgradeInstance = require('./upgradeInstance');
const os = require('os');
const ncp = require('ncp').ncp;
const { execSync } = require('child_process');
const mkdirp = require('mkdirp');

const FOLDER_MODE = 0o0770;
const FILE_MODE = 0o0770;



//Where are we: dev environment? Official install?
const instanceLocation = process.env.INSTANCE_DIR && process.env.INSTANCE_DIR != '""' ? process.env.INSTANCE_DIR
      : process.env.USERPROFILE ? path.join(process.env.USERPROFILE, '.zowe')
      : path.join(process.env.HOME, '.zowe');
const workspaceLocation = process.env.WORKSPACE_DIR && process.env.WORKSPACE_DIR != '""' ? process.env.WORKSPACE_DIR
      : path.join(instanceLocation, 'workspace');
const destination = path.join(workspaceLocation, 'app-server');
const versionLocation = path.join(destination, 'component.json');

let createJson = false;
let currentJsonConfig;
try {
  currentJsonConfig = fs.readFileSync(path.join(destination, 'serverConfig', 'server.json'), 'utf8');
} catch (e) {
  if (e.code == 'ENOENT') {
    createJson = true;
  } else {
    console.log('ZWED5002W - Warning: Could not read server.json, error='+e.message);
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
//750 specifically, to keep server config secure
mkdirp.sync(instanceConfig, {mode: 0o0750});

if (!config.groupsDir) {
  config.groupsDir = path.join(config.instanceDir, 'groups');
}
mkdirp.sync(config.groupsDir, {mode: FOLDER_MODE});

if (!config.usersDir) {
  config.usersDir = path.join(config.instanceDir, 'users');
}
mkdirp.sync(config.usersDir, {mode: FOLDER_MODE});

if (!config.pluginsDir) {
  config.pluginsDir = path.join(destination, 'plugins');
}

mkdirp.sync(config.pluginsDir, {mode: FOLDER_MODE});

//Write new config json only if one does not exist
if (createJson) {
  console.log('ZWED5010I - Creating new config=', config);
  fs.writeFileSync(path.join(destination, 'serverConfig', 'server.json'), JSON.stringify(config, null, 2),
                   {encoding: 'utf8', mode: 0o0740});
//740 specifically, to keep server config secure
}



let instanceItems = [];
try {
  instanceItems = fs.readdirSync(config.pluginsDir);
} catch (e) {
  console.warn("ZWED5003W - Warning: couldn't read plugin directory",e);
  //Couldnt read, will copy defaults
}
//Copy default plugins if could not find configjs - implies something wrong with environment.
if (instanceItems.indexOf('org.zowe.configjs.json') == -1) {
  initUtils.registerBundledPlugins(config.pluginsDir, instancePluginStorage, instanceItems, FILE_MODE);
}
  
let siteStorage = [];
let instanceStorage = [];
try {
  siteStorage = fs.readdirSync(sitePluginStorage);
  instanceStorage = fs.readdirSync(instancePluginStorage);
} catch (e) {
  console.warn("ZWED5004W - Warning: couldn't read site or instance storage",e);
  //couldnt read, treat as empty
}
if (siteStorage.length == 0 && instanceStorage.length == 0) {
  console.log("ZWED5012I - Copying default plugin preferences into instance");
  if (os.platform() == 'win32') {
    ncp(path.join(config.productDir, 'ZLUX', 'pluginStorage'), instancePluginStorage, function(err){
      if (err) {
        console.warn('ZWED5005W - Warning: error while copying plugin preferences into instance',err);
        process.exit(1);
      }
      process.exit(0);
    });
  } else {
    execSync("cp -r "+path.join(config.productDir, 'ZLUX', 'pluginStorage')+" "+path.join(config.instanceDir, 'ZLUX'));
    execSync("chmod -R 770 "+instancePluginStorage);
    process.exit(0);
  }
}

/*
  Upgrade logic: If instance contains code from an older version that needs updating, apply the change here.
*/
try {
  let serverConfig = currentJsonConfig ? jsonUtils.readJSONStringWithComments(currentJsonConfig, 'server.json'): undefined;
  let fromVersion;
  try {
    fromVersion = process.env.ZOWE_UPGRADE_VERSION ? process.env.ZOWE_UPGRADE_VERSION : require(versionLocation).version;
  } catch (e) {
    //pre 1.11
    fromVersion = "1.10.99";
  }
  if (serverConfig) {
    //upgrades based on what WAS there, not what we added above
    const result = upgradeInstance.doUpgrade(fromVersion, destination, serverConfig, instanceItems);
    if (result) {
      let componentJsonContent;
      try {
        componentJsonContent = require(versionLocation);
      } catch (e) {
        componentJsonContent = {};
        //doesnt exist, create new
      }
      componentJsonContent.version = result.upgradedTo;
      fs.writeFileSync(versionLocation, JSON.stringify(componentJsonContent));
      if (result.serverConfig) {
        fs.writeFileSync(path.join(destination, 'serverConfig', 'server.json'), JSON.stringify(result.serverConfig,null,2));
      }
    } else {
      console.log("Could not perform app-server upgrade");
      process.exit(1);
    }
  }
} catch (e) {
  //skip process
}
