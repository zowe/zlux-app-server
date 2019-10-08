

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
const mergeUtils = require('zlux-server-framework/utils/mergeUtils');
const cluster = require('cluster');
const PRODUCT_CODE = 'ZLUX';

const DEFAULT_CONFIG = {
  "productDir":"../defaults",
  "siteDir":"../deploy/site",
  "instanceDir":"../deploy/instance",
  "groupsDir":"../deploy/instance/groups",
  "usersDir":"../deploy/instance/users",
  "pluginsDir":"../defaults/plugins",

  "node": {
    "rootRedirectURL": '/' + PRODUCT_CODE + '/plugins/org.zowe.zlux.bootstrap/web/',
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
    "rbac": false,
    "defaultAuthentication": "fallback",
    "implementationDefaults": {
      "fallback": {
        "plugins": ["org.zowe.zlux.auth.trivial"]
      }
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
let agentHost = undefined;
let agentPort = undefined;
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
let configJSON = DEFAULT_CONFIG;
//Overall config is a result of a heirarchy of overrides from defaults.
//CLI args > CLI -D arg > Env vars > JSON file > builtin defaults
const userConfig = jsonUtils.parseJSONWithComments(userInput.config);
//Config JSON overrides hardcoded defaults
configJSON = mergeUtils.deepAssign(configJSON, userConfig);


//Env overrides config JSON, -D args override env
if(process.env.overrideFileConfig !== "false"){
  if (cluster.isMaster) {
    console.log('Environment variables:\n'+JSON.stringify(process.env, null, 2));
    console.log('\nProcessing CLI arguments:\n'+commandArgs);
  }
  const envConfig = argParser.environmentVarsToObject("ZWED_");
  if (Object.keys(envConfig).length > 0) {
    if (cluster.isMaster) {
      console.log('\nProcessed environment variables:\n'+JSON.stringify(envConfig, null, 2));
    }
    configJSON = mergeUtils.deepAssign(configJSON, envConfig);
  }
  if (userInput.D) {
    if (cluster.isMaster) {
      console.log('\nProcessed -D arguments:\n'+JSON.stringify(userInput.D, null, 2));
    }
    configJSON = mergeUtils.deepAssign(configJSON, userInput.D);
  }
} else {
  console.log("Using config JSON, discarding CLI args");
}

if (configJSON.agent) {
  if (configJSON.agent.https) {
    agentPort = configJSON.agent.https.port;
  } else if (configJSON.agent.http) {
    agentPort = configJSON.agent.http.port;
  } else {
    console.warn(`Invalid server configuration. Agent specified without http or https port`);
  }
  if(configJSON.agent.host){
    agentHost = configJSON.agent.host;
  }
} else if (configJSON.zssPort) {
  agentPort = configJSON.zssPort;
}
if(configJSON.node.noChild === true){
  delete configJSON.node.childProcesses;
}
if(configJSON.node.allowInvalidTLSProxy){
  allowInvalidTLS = true;
}

//finally, specific CLI flags override any above
if(process.env.overrideFileConfig !== "false"){
  let eUser = userInput.mlUser;
  let ePass = userInput.mlPass;
  if(eUser && ePass){
    configJSON.node.mediationLayer.enabled = true;
    configJSON.node.mediationLayer.instance.instanceId = `${configJSON.node.mediationLayer.instance.app}:${Math.floor(Math.random() * 9999)}`;
    configJSON.node.mediationLayer.eureka.serviceUrls.default = [`http://${eUser}:${ePass}@${configJSON.node.mediationLayer.server.hostname}:${configJSON.node.mediationLayer.server.port}/eureka/apps/`];
  }
  if (userInput.hostPort) {
    agentPort = userInput.hostPort;
  }
  if(userInput.noPrompt){
    noPrompt = true;
  }
  if(noPrompt){
    configJSON.node.noPrompt = true;
  }
  if (userInput.hostServer) {
    agentHost = userInput.hostServer;
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
}

const startUpConfig = {
  proxiedHost: agentHost,
  proxiedPort: agentPort,
  allowInvalidTLSProxy: allowInvalidTLS
};

const appConfig = {
  productCode: PRODUCT_CODE,
  rootRedirectURL: configJSON.node.rootRedirectURL
};

if (startUpConfig.proxiedHost && startUpConfig.proxiedPort) {
  appConfig.rootServices = configJSON.agent && Array.isArray(configJSON.agent.rootServices)
    ? configJSON.agent.rootServices
    : [{
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
      }];
}
console.log('\nInitializing with configuration:\n',JSON.stringify(configJSON, null, 2));
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

