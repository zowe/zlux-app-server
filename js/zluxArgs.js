

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

'use strict';
const ProxyServer = require('../../zlux-proxy-server/js/index');
const argParser = require('../../zlux-proxy-server/js/argumentParser.js');
const jsonUtils = require('../../zlux-proxy-server/js/jsonUtils.js');

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
        url: '/logout',
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
        url: '/config'
      },
      {
        method: '*',
        url: '/ras'
      },
      {
        method: '*',
        url: '/security-mgmt'
      }  
   ]
};

const DEFAULT_CONFIG = {
  "rootDir":"../deploy",
  "productDir":"../deploy/product",
  "siteDir":"../deploy/site",
  "instanceDir":"../deploy/instance",
  "groupsDir":"../deploy/instance/groups",
  "usersDir":"../deploy/instance/users",
  "pluginsDir":"../deploy/instance/"+PRODUCT_CODE+"/plugins",

  "node": {
    "http": {
      "port": 8543
    },
    "eureka": {
      "hostname": "localhost",
      "port": 10011
    }
  },
  "dataserviceAuthentication": {
    "defaultAuthentication": "fallback",
    "implementationDefaults": {
      "fallback": {
        "plugins": ["com.rs.auth.trivialAuth"]
      }
    }
  },
  "zssPort":8542
};

const MVD_ARGS = [
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
var zssHost = '127.0.0.1';
var commandArgs = process.argv.slice(2);
var argumentParser = argParser.createParser(MVD_ARGS);
var userInput = argumentParser.parse(commandArgs);
var noPrompt = false;

if (userInput.noPrompt) {
  noPrompt = true;
}
if (!userInput.config) {
  console.log('Missing one or more parameters required to run.');
  console.log('config file was '+userInput.config);
  process.exit(-1);
}
const configJSON = DEFAULT_CONFIG;
const userConfig = jsonUtils.parseJSONWithComments(userInput.config);
for (const attribute in userConfig) { 
  configJSON[attribute] = userConfig[attribute]; 
}
let hostPort = userInput.hostPort;
let eUser = userInput.mlUser;
let ePass = userInput.mlPass;
if(eUser && ePass){
  configJSON.node.mediationLayer.enabled = true;
  configJSON.node.mediationLayer.instance.instanceId = `${configJSON.node.mediationLayer.instance.app}:${Math.floor(Math.random() * 9999)}`;
  configJSON.node.mediationLayer.eureka.serviceUrls.default = [`http://${eUser}:${ePass}@${configJSON.node.mediationLayer.server.hostname}:${configJSON.node.mediationLayer.server.port}/eureka/apps/`];
}
if (!hostPort) {
  hostPort = configJSON.zssPort;
}
if (userInput.hostServer) {
  zssHost = userInput.hostServer;
}
if (userInput.port) {
  configJSON.node.http.port = userInput.port;
}
if (userInput.securePort && configJSON.https) {
  configJSON.node.https.port = userInput.securePort;
}
if (userInput.noChild) {
  delete configJSON.node.childProcesses;
}
const startUpConfig = {
  proxiedHost: zssHost,
  proxiedPort: hostPort,
  allowInvalidTLSProxy: (userInput.allowInvalidTLSProxy === 'true')
};

module.exports = function() {
  return {appConfig: appConfig, configJSON: configJSON, startUpConfig: startUpConfig}
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

