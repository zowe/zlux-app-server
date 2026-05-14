/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

'use strict';

const fs = require('fs');
const path = require('path');
const initUtils = require('./initUtils');

// --- Argument parsing ---
// Accepted flags: -i <appIdOrPath>  -p <pluginsDir>  -v
const args = process.argv.slice(2);
let input;
let pluginsDir;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-i': input      = args[++i]; break;
    case '-p': pluginsDir = args[++i]; break;
    case '-v': verbose    = true;      break;
    default:
      console.error(`Unknown argument: ${args[i]}`);
      console.error('Usage: uninstall-app.js -i <appIdOrPath> -p <pluginsDir> [-v]');
      process.exit(1);
  }
}

if (!input || !pluginsDir) {
  console.error('Usage: uninstall-app.js -i <appIdOrPath> -p <pluginsDir> [-v]');
  process.exit(1);
}

pluginsDir = path.resolve(pluginsDir);

// --- Resolve app identifier ---
// If input resolves to a directory, read identifier from pluginDefinition.json.
// Otherwise treat the string as a bare plugin identifier.
let appId;
const resolvedInput = path.resolve(input);
try {
  if (fs.statSync(resolvedInput).isDirectory()) {
    const pluginDef = JSON.parse(
      fs.readFileSync(path.join(resolvedInput, 'pluginDefinition.json'), 'utf8')
    );
    if (!pluginDef.identifier) {
      console.error(`Error: pluginDefinition.json in ${resolvedInput} is missing 'identifier' field.`);
      process.exit(1);
    }
    appId = pluginDef.identifier;
  } else {
    appId = input;
  }
} catch (e) {
  // statSync failed or JSON parse failed — treat input as a bare identifier
  appId = input;
}

// --- Resolve instanceDir (required for actions storage) ---
const instanceDir = process.env.ZWED_instanceDir;
if (!instanceDir) {
  console.error('Error: ZWED_instanceDir environment variable is not set. Cannot determine plugin storage location.');
  process.exit(1);
}

// --- Build actions storage directory arrays (mirrors initInstance.js lines 63-66) ---
const desktopPlugins = ['ng2desktop', 'ivydesktop'];
const actionsPluginStorages = desktopPlugins.map(
  plugin => path.join(instanceDir, 'ZLUX', 'pluginStorage', `org.zowe.zlux.${plugin}`, 'actions')
);

if (verbose) {
  console.log(`Deregistering plugin ${appId}`);
  console.log(`  pluginsDir: ${pluginsDir}`);
  console.log(`  instanceDir: ${instanceDir}`);
}

// --- Remove pointer JSON and actions ---
// deregisterPlugin removes the pointer JSON; it falls back to deregisterApp2App only
// when the pointer file is not found. Call deregisterApp2App explicitly afterwards so
// actions are always cleaned up regardless.
initUtils.deregisterPlugin({ identifier: appId }, pluginsDir, actionsPluginStorages);
initUtils.deregisterApp2App(appId, actionsPluginStorages);

console.log(`Plugin ${appId} deregistered successfully.`);
console.log(`Plugin deregistration ended with rc=0`);
