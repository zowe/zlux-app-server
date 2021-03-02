

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
const mkdirp = require('mkdirp');
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
      "keys": ["../defaults/serverConfig/zlux.keystore.key"],
      "certificates": ["../defaults/serverConfig/zlux.keystore.cer"]
    }
  },
  "dataserviceAuthentication": {
    "rbac": false,
    "defaultAuthentication": "fallback"
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

var config;
let agentHost = undefined;
let agentPort = undefined;
var commandArgs = process.argv.slice(2);
var argumentParser = argParser.createParser(MVD_ARGS);
var userInput = argumentParser.parse(commandArgs);
var noPrompt = false;
var allowInvalidTLS = false;

if (!userInput.config) {
  console.log('ZWED5018E - Missing one or more parameters required to run.\nConfig file was '+userInput.config);
  process.exit(-1);
}
let configJSON = DEFAULT_CONFIG;
//Overall config is a result of a heirarchy of overrides from defaults.
//CLI args > CLI -D arg > Env vars > JSON file > builtin defaults
const userConfig = jsonUtils.parseJSONWithComments(userInput.config);
//Config JSON overrides hardcoded defaults
configJSON = mergeUtils.deepAssign(configJSON, userConfig);

function getSafeToPrintEnvironment(env) {
  const keys = Object.keys(env).filter(key => {
    const upperCasedKey = key.toUpperCase();
    if (upperCasedKey.indexOf('PASSWORD') != -1 || upperCasedKey.indexOf('SECRET') != -1) {
      return false;
    }
    return true;
  });
  const safeEnvironment = {};
  keys.forEach(key => safeEnvironment[key] = env[key]);
  return safeEnvironment;
}

//Env overrides config JSON, -D args override env
if(process.env.overrideFileConfig !== "false"){
  if (cluster.isMaster) {
    const safeEnvironment = getSafeToPrintEnvironment(process.env);
    console.log('ZWED5013I - Environment variables:\n'+JSON.stringify(safeEnvironment, null, 2));
    console.log('\nZWED5014I - Processing CLI arguments:\n'+commandArgs);
  }
  const envConfig = argParser.environmentVarsToObject("ZWED_");
  if (Object.keys(envConfig).length > 0) {
    if (cluster.isMaster) {
      console.log('\nZWED5015I - Processed environment variables:\n'+JSON.stringify(envConfig, null, 2));
    }
    configJSON = mergeUtils.deepAssign(configJSON, envConfig);
  }
  if (userInput.D) {
    if (cluster.isMaster) {
      console.log('\nZWED5016I - Processed -D arguments:\n'+JSON.stringify(userInput.D, null, 2));
    }
    configJSON = mergeUtils.deepAssign(configJSON, userInput.D);
  }
} else {
  console.log("ZWED5017I - Using config JSON, discarding CLI args");
}

if (configJSON.agent) {
  if (configJSON.agent.https) {
    agentPort = configJSON.agent.https.port;
  } else if (configJSON.agent.http) {
    agentPort = configJSON.agent.http.port;
  } else {
    console.warn(`ZWED5006W - Invalid server configuration. Agent specified without http or https port`);
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
  if (userInput.allowInvalidTLSProxy !== undefined) {
    allowInvalidTLS = (userInput.allowInvalidTLSProxy === 'true');
  }
}

if (agentHost && agentPort) {
  configJSON.agent = configJSON.agent || {};
  configJSON.agent.host = agentHost;
  configJSON.agent.http = configJSON.agent.http || {};
  configJSON.agent.http.port = agentPort;
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
        url: '/logout',
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
        url: '/datasetEnqueue'
      },
      {
        method: '*',
        url: '/datasetHeartbeat'
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
      },
      {
        method: '*',
        url: '/password',
        requiresAuth: false
      }
    ];
}
console.log('\nZWED5018I - Initializing with configuration:\n',JSON.stringify(configJSON, null, 2));
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

