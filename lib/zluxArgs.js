

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
const yamlConfig = require('zlux-server-framework/utils/yamlConfig');
const cluster = require('cluster');

const MVD_ARGS = [
  new argParser.CLIArgument(null, 'D', argParser.constants.ARG_TYPE_JSON),
  new argParser.CLIArgument('config', 'c', argParser.constants.ARG_TYPE_VALUE)
];

var commandArgs = process.argv.slice(2);
var argumentParser = argParser.createParser(MVD_ARGS);
var userInput = argumentParser.parse(commandArgs);
const haInstanceId = yamlConfig.getCurrentHaInstanceId();

if (!userInput.config) {
  console.log('ZWED5018E - Missing one or more parameters required to run.\nConfig file was '+userInput.config);
  process.exit(-1);
}
//Overall config is a result of a heirarchy of overrides from defaults.
//CLI -D arg > Env vars > YAML file
//Hack for enabling debug of this process... we need to read config before config is parsed, using env var here. env var translation misses _ and . and -
let configJSON = yamlConfig.parseZoweDotYaml(userInput.config, haInstanceId, Number(process.env['ZWE_components_app_server_logLevels_zsf_bootstrap'])>3);

const REDACTED_VALUE = '(redacted)';

function isSensitiveText(text) {
  const upperCased = text.toUpperCase();
  return upperCased.indexOf('PASSWORD') != -1
    || upperCased.indexOf('PASSPHRASE') != -1
    || upperCased.indexOf('SECRET') != -1;
}

//Returns a deep copy with the values of sensitive keys replaced, so config can be logged without leaking credentials.
function redactSensitive(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }
  if (value !== null && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value)) {
      result[key] = isSensitiveText(key) ? REDACTED_VALUE : redactSensitive(value[key]);
    }
    return result;
  }
  return value;
}

//Env overrides config JSON, -D args override env
if(process.env.overrideFileConfig !== "false"){
  if (cluster.isPrimary) {
    //CLI args are logged raw, so omit them if they contain a sensitive substring (e.g. a -D override carrying a password).
    console.log('\nZWED5014I - Processing CLI arguments:\n'+(isSensitiveText(''+commandArgs) ? REDACTED_VALUE : commandArgs));
  }
  const envConfig = argParser.environmentVarsToObject("ZWED_");
  if (Object.keys(envConfig).length > 0) {
    if (cluster.isPrimary) {
      console.log('\nZWED5015I - Processed environment variables:\n'+JSON.stringify(redactSensitive(envConfig), null, 2));
    }
    configJSON = Object.assign(configJSON, {components: {"app-server": mergeUtils.deepAssign(configJSON.components['app-server'], envConfig) } });
  }
  if (userInput.D) {
    if (cluster.isPrimary) {
      //-Dkey=value args parse into an object (key-redactable), but a -D '{...}' JSON blob stays a raw string that cannot be key-redacted, so omit it if it carries a sensitive substring.
      const dArgsToPrint = (typeof userInput.D === 'object')
        ? JSON.stringify(redactSensitive(userInput.D), null, 2)
        : (isSensitiveText(''+userInput.D) ? REDACTED_VALUE : userInput.D);
      console.log('\nZWED5016I - Processed -D arguments:\n'+dArgsToPrint);
    }
    configJSON = Object.assign(configJSON, {components: {"app-server": mergeUtils.deepAssign(configJSON.components['app-server'], userInput.D) } })
  }
} else {
  console.log("ZWED5017I - Using config JSON, discarding CLI args");
}


if(configJSON.components['app-server'].node.noChild === true){
  delete configJSON.components['app-server'].node.childProcesses;
}

if (cluster.isPrimary) {
  let configJSONSafeToPrint = redactSensitive(configJSON);
  if (configJSONSafeToPrint.zowe && configJSONSafeToPrint.zowe.sysMessages) {
    delete configJSONSafeToPrint.zowe.sysMessages;
  }

  console.log('\nZWED5018I - Initializing with configuration:\n',JSON.stringify(configJSONSafeToPrint, null, 2));
}
module.exports = function() {
  return {configJSON: configJSON, configLocation: userInput.config}
}

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

