

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

'use strict';
const ProxyServer = require('zlux-server-framework');
const argParser = require('zlux-server-framework/utils/argumentParser');
const jsonUtils = require('zlux-server-framework/lib/jsonUtils');

const PRODUCT_CODE = 'ZLUX';

const appConfig = {
    productCode: PRODUCT_CODE,
    rootRedirectURL: '/' + PRODUCT_CODE + '/plugins/org.zowe.zlux.bootstrap/web/',
    rootServices: [
      {
        method: '*',
        url: '/login',
        requiresAuth: false
      },
      {
        method: '*',
        url: '/unixfile'
      },
      {
        method: '*',
        url: '/datasetContents'
      },
      {
        method: '*',
        url: '/VSAMdatasetContents'
      },
      {
        method: '*',
        url: '/datasetMetadata'
      },
      {
        method: '*',
        url: '/omvs'
      },
      {
        method: '*',
        url: '/ras'
      },
      {
        method: '*',
        url: '/security-mgmt'
      },
      {
        method: '*',
        url: '/saf-auth'
      }  
   ]
};

const DEFAULT_CONFIG = {
  "productDir":"../defaults",
  "siteDir":"../deploy/site",
  "instanceDir":"../deploy/instance",
  "groupsDir":"../deploy/instance/groups",
  "usersDir":"../deploy/instance/users",
  "pluginsDir":"../defaults/plugins",

  "node": {
    "allowInvalidTLSProxy": false,
    "noChild": false,
    "noPrompt": false,
    "https": {
      "ipAddresses": ["0.0.0.0"],
      "port": 8544,
      //pfx (string), keys, certificates, certificateAuthorities, and certificateRevocationLists are all valid here.
      "keys": ["../defaults/serverConfig/zlux.keystore.key"],
      "certificates": ["../defaults/serverConfig/zlux.keystore.cer"],
      "certificateAuthorities": ["../defaults/serverConfig/apiml-localca.cer"]
    },
    "mediationLayer": {
      "server": {
        "hostname": "localhost",
        "port": 10011,
        "isHttps": false
      },
      "enabled": false
    }
  },
  "dataserviceAuthentication": {
    "defaultAuthentication": "fallback",
    "implementationDefaults": {
      "fallback": {
        "plugins": ["org.zowe.zlux.auth.trivial"]
      }
    }
  },
  "agent": {
    //host is for zlux to know, not zss
    "host": "localhost",
    "http": {
      "ipAddresses": ["0.0.0.0"],
      "port": 8542
    }
  }  
};

const MVD_ARGS = [
  new argParser.CLIArgument(null, 'D', argParser.constants.ARG_TYPE_JSON),
  new argParser.CLIArgument('config', 'c', argParser.constants.ARG_TYPE_VALUE),
  new argParser.CLIArgument('hostServer', 'h', argParser.constants.ARG_TYPE_VALUE),
  new argParser.CLIArgument('hostPort', 'P', argParser.constants.ARG_TYPE_VALUE),  
  new argParser.CLIArgument('port', 'p', argParser.constants.ARG_TYPE_VALUE),  
  new argParser.CLIArgument('securePort', 's', argParser.constants.ARG_TYPE_VALUE),  
  new argParser.CLIArgument('noPrompt', null, argParser.constants.ARG_TYPE_FLAG),
  new argParser.CLIArgument('noChild', null, argParser.constants.ARG_TYPE_FLAG),
  new argParser.CLIArgument('allowInvalidTLSProxy', null, 
      argParser.constants.ARG_TYPE_VALUE),
  new argParser.CLIArgument('mlUser', 'mu', argParser.constants.ARG_TYPE_VALUE),
  new argParser.CLIArgument('mlPass', 'mp', argParser.constants.ARG_TYPE_VALUE)
];

function deepAssign(target, source) {
  var retVal = {}
  if (typeof target === 'object') {
    Object.keys(target).forEach(function (key) {
      retVal[key] = target[key];
    })
  }
  Object.keys(source).forEach(function (key) {
    if (typeof source[key] !== 'object' || !target[key]) {
      retVal[key] = source[key];
    } else {
      retVal[key] = deepAssign(target[key], source[key]);
    }
  })
  return retVal;
}

var config;
var zssHost = '127.0.0.1';
var commandArgs = process.argv.slice(2);
var argumentParser = argParser.createParser(MVD_ARGS);
var userInput = argumentParser.parse(commandArgs);
var noPrompt = false;
var allowInvalidTLS = false;

if (!userInput.config) {
  console.log('Missing one or more parameters required to run.');
  console.log('config file was '+userInput.config);
  process.exit(-1);
}
const configJSON = DEFAULT_CONFIG;
const userConfig = jsonUtils.parseJSONWithComments(userInput.config);
let hostPort;
for (const attribute in userConfig) { 
  configJSON[attribute] = userConfig[attribute]; 
}
if (userInput.D) {
  configJSON = deepAssign(configJSON, userInput.D);
}


if (configJSON.agent) {
  if (configJSON.agent.https) {
    hostPort = configJSON.agent.https.port;
  } else if (configJSON.agent.http) {
    hostPort = configJSON.agent.http.port;
  } else {
    console.warn(`Invalid server configuration. Agent specified without http or https port`);
  }
  if(configJSON.agent.host){
    zssHost = configJSON.agent.host;
  }
} else if (configJSON.zssPort) {
  hostPort = configJSON.zssPort;
}
if(configJSON.node.noChild === true){
  delete configJSON.node.childProcesses;
}
if(configJSON.node.allowInvalidTLSProxy){
  allowInvalidTLS = true;
}


if(process.env.overrideFileConfig !== "false"){
  let eUser = userInput.mlUser;
  let ePass = userInput.mlPass;
  if(eUser && ePass){
    configJSON.node.mediationLayer.enabled = true;
    configJSON.node.mediationLayer.instance.instanceId = `${configJSON.node.mediationLayer.instance.app}:${Math.floor(Math.random() * 9999)}`;
    configJSON.node.mediationLayer.eureka.serviceUrls.default = [`http://${eUser}:${ePass}@${configJSON.node.mediationLayer.server.hostname}:${configJSON.node.mediationLayer.server.port}/eureka/apps/`];
  }
  if (userInput.hostPort) {
    hostPort = userInput.hostPort;
  }
  if(userInput.noPrompt){
    noPrompt = true;
  }
  if(noPrompt){
    configJSON.node.noPrompt = true;
  }
  if (userInput.hostServer) {
    zssHost = userInput.hostServer;
  }
  if (userInput.port) {
    if (!configJSON.node.http) { configJSON.node.http = {}; }
    configJSON.node.http.port = userInput.port;
  }
  if (userInput.securePort && configJSON.node.https) {
    configJSON.node.https.port = userInput.securePort;
  }
  if (userInput.noChild) {
    configJSON.node.noChild = true;
    delete configJSON.node.childProcesses;
  }
  allowInvalidTLS = (userInput.allowInvalidTLSProxy === 'true');
} else {
  console.log("Using config JSON, discarding CLI args");
}

const startUpConfig = {
  proxiedHost: zssHost,
  proxiedPort: hostPort,
  allowInvalidTLSProxy: allowInvalidTLS
};

module.exports = function() {
  return {appConfig: appConfig, configJSON: configJSON, startUpConfig: startUpConfig, configLocation: userInput.config}
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

