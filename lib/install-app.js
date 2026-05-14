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
// Accepted flags: -i <inputApp>  -p <pluginsDir>  -v
const args = process.argv.slice(2);
let inputApp;
let pluginsDir;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-i': inputApp   = args[++i]; break;
    case '-p': pluginsDir = args[++i]; break;
    case '-v': verbose    = true;      break;
    default:
      console.error(`Unknown argument: ${args[i]}`);
      console.error('Usage: install-app.js -i <inputApp> -p <pluginsDir> [-v]');
      process.exit(1);
  }
}

if (!inputApp || !pluginsDir) {
  console.error('Usage: install-app.js -i <inputApp> -p <pluginsDir> [-v]');
  process.exit(1);
}

inputApp   = path.resolve(inputApp);
pluginsDir = path.resolve(pluginsDir);

// --- Resolve instanceDir (required for actions/recognizers) ---
const instanceDir = process.env.ZWED_instanceDir;
if (!instanceDir) {
  console.error('Error: ZWED_instanceDir environment variable is not set. Cannot determine plugin storage location.');
  process.exit(1);
}

// --- Resolve runtimeDirectory (optional; used for relative pointer paths) ---
const runtimeDirectory = process.env.ZWE_zowe_runtimeDirectory || '';

// --- Build storage directory arrays (mirrors initInstance.js lines 63-66) ---
const desktopPlugins = ['ng2desktop', 'ivydesktop'];
const recognizersPluginStorages = desktopPlugins.map(
  plugin => path.join(instanceDir, 'ZLUX', 'pluginStorage', `org.zowe.zlux.${plugin}`, 'recognizers')
);
const actionsPluginStorages = desktopPlugins.map(
  plugin => path.join(instanceDir, 'ZLUX', 'pluginStorage', `org.zowe.zlux.${plugin}`, 'actions')
);

// Ensure storage directories exist before writing
recognizersPluginStorages.forEach(d => initUtils.mkdirp(d, initUtils.FOLDER_MODE));
actionsPluginStorages.forEach(d => initUtils.mkdirp(d, initUtils.FOLDER_MODE));

// --- Read pluginDefinition.json ---
const pluginDefPath = path.join(inputApp, 'pluginDefinition.json');
let pluginDefinition;
try {
  pluginDefinition = JSON.parse(fs.readFileSync(pluginDefPath, 'utf8'));
} catch (e) {
  console.error(`Error: Could not read pluginDefinition.json from ${inputApp}. ${e.message}`);
  process.exit(1);
}

if (!pluginDefinition.identifier) {
  console.error(`Error: pluginDefinition.json in ${inputApp} is missing 'identifier' field.`);
  process.exit(1);
}

if (verbose) {
  console.log(`Registering plugin ${pluginDefinition.identifier} from ${inputApp}`);
  console.log(`  pluginsDir: ${pluginsDir}`);
  console.log(`  instanceDir: ${instanceDir}`);
  console.log(`  runtimeDirectory: ${runtimeDirectory || '(none)'}`);
}

// --- Register the plugin (pointer JSON + actions + recognizers) ---
try {
  initUtils.registerPlugin(inputApp, pluginDefinition, pluginsDir,
    actionsPluginStorages, recognizersPluginStorages, runtimeDirectory);
} catch (e) {
  console.error(`Error: Failed to register plugin ${pluginDefinition.identifier}. ${e.message}`);
  process.exit(1);
}

console.log(`Plugin ${pluginDefinition.identifier} registered successfully.`);
console.log(`Plugin registration ended with rc=0`);
