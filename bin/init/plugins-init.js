/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

import * as os from 'os';
import * as zos from 'zos';
import * as std from 'std';
import * as xplatform from 'xplatform';
import { ConfigManager } from 'Configuration';

console.log(`Started plugins-init.js, platform=${os.platform}`);

const runtimeDirectory=std.getenv('ZWE_zowe_runtimeDirectory');
const extensionDirectory=std.getenv('ZWE_zowe_extensionDirectory');
const workspaceDirectory=std.getenv('ZWE_zowe_workspaceDirectory');


const configMgr = new ConfigManager();
configMgr.setTraceLevel(0);

const installedComponentsEnv=std.getenv('ZWE_INSTALLED_COMPONENTS');
const installedComponents = installedComponentsEnv ? installedComponentsEnv.split(',') : null;

const enabledComponentsEnv=std.getenv('ZWE_ENABLED_COMPONENTS');
const enabledComponents = enabledComponentsEnv ? enabledComponentsEnv.split(',') : null;

const pluginPointerDirectory = `${workspaceDirectory}/app-server/plugins`;


const ENOENT=129;

const COMMON_SCHEMA = `${runtimeDirectory}/schemas/server-common.json`;


const MANIFEST_SCHEMA_ID = 'https://zowe.org/schemas/v2/server-component-manifest';
const MANIFEST_SCHEMAS = `${runtimeDirectory}/schemas/manifest-schema.json:${COMMON_SCHEMA}`;

const PLUGIN_DEF_SCHEMA_ID = "https://zowe.org/schemas/v2/appfw-plugin-definition";
const PLUGIN_DEF_SCHEMAS = `${runtimeDirectory}/components/app-server/schemas/plugindefinition-schema.json`;

function directoryExists(path, silenceNotFound) {
  let returnArray = os.stat(path);
  if (!returnArray[1]) { //no error
    return ((returnArray[0].mode & os.S_IFDIR) == os.S_IFDIR)
  } else {
    if ((returnArray[1] != ENOENT) && !silenceNotFound) {
      console.log(`directoryExists path=${path}, err=`+returnArray[1]);
    }
    return false;
  }
}

function fileExists(path, silenceNotFound) {
  let returnArray = zos.zstat(path);
  if (!returnArray[1]) { //no error
    const mode = returnArray[0].mode;
    return ((returnArray[0].mode & os.S_IFREG) == os.S_IFREG)
  } else {
    if ((returnArray[1] != ENOENT) && !silenceNotFound) {
      console.log(`fileExists path=${path}, err=`,returnArray[1]);
    }
    return false;
  }
}

function deleteFile(path) {
  return os.remove(path);
}

function showExceptions(e, depth) {
    let blanks = "                                                                 ";
    let subs = e.subExceptions;
    console.log(blanks.substring(0, depth * 2) + e.message);
    if (subs) {
        for (const sub of subs) {
            showExceptions(sub, depth + 1);
        }
    }
}


function findComponentDirectory(component) {
  if (directoryExists(`${runtimeDirectory}/components/${component}`)) {
    return `${runtimeDirectory}/components/${component}`;
  } else if (extensionDirectory) {
    if (directoryExists(`${extensionDirectory}/${component}`)) {
      return `${extensionDirectory}/${component}`;
    } else {
      console.log(`Component directory ${extensionDirectory}/${component} does not exist`);
      return null;
    }
  } else {
    console.log('No component directory for '+component);
    return null;
  }
}

function getManifest(componentDirectory) {
  let manifestPath;

  if (fileExists(`${componentDirectory}/manifest.yaml`)) {
    manifestPath = `${componentDirectory}/manifest.yaml`;
  } else if (fileExists(`${componentDirectory}/manifest.yml`)) {
    manifestPath = `${componentDirectory}/manifest.yml`;
  } else if (fileExists(`${componentDirectory}/manifest.yaml`)) {
    manifestPath = `${componentDirectory}/manifest.json`;
  }

  if (manifestPath) {
    let status;

    let manifestId = componentDirectory;

    if ((status = configMgr.addConfig(manifestId))) {
      console.log(`Could not add config for ${manifestPath}, status=${status}`);
      return null;
    }

    if ((status = configMgr.loadSchemas(manifestId, MANIFEST_SCHEMAS))) {
      console.log(`Could not load schemas ${MANIFEST_SCHEMAS} for manifest ${manifestPath}, status=${status}`);
      return null;
    }

    if ((status = configMgr.setConfigPath(manifestId, `FILE(${manifestPath})`))) {
      console.log(`Could not set config path for ${manifestPath}, status=${status}`);
      return null;
    }

    if ((status = configMgr.loadConfiguration(manifestId))) {
      console.log(`Could not load config for ${manifestPath}, status=${status}`);
      return null;
    }

    let validation = configMgr.validate(manifestId);
    if (validation.ok){
      if (validation.exceptionTree){
        console.log(`Validation of ${manifestPath} against schema ${MANIFEST_SCHEMA_ID} found invalid JSON Schema data`);
        showExceptions(validation.exceptionTree, 0);
        return null;
      } else {
        return configMgr.getConfigData(manifestId);
      }
    } else {
      console.log(`Error occurred on validation of ${manifestPath} against schema ${MANIFEST_SCHEMA_ID} `);
      return null;
    }
  } else {
    console.log(`Component at ${componentDirectory} has no manifest`);
    return null;
  }
}

function getPluginDefinition(pluginRootPath) {
  const pluginDefinitionPath = `${pluginRootPath}/pluginDefinition.json`;

  if (fileExists(pluginDefinitionPath)) {
    let status;
    if ((status = configMgr.addConfig(pluginRootPath))) {
      console.log(`Could not add config for ${pluginRootPath}, status=${status}`);
      return null;
    }
    
    if ((status = configMgr.loadSchemas(pluginRootPath, PLUGIN_DEF_SCHEMAS))) {
      console.log(`Could not load schemas ${PLUGIN_DEF_SCHEMAS} for plugin ${pluginRootPath}, status=${status}`);
      return null;
    }


    if ((status = configMgr.setConfigPath(pluginRootPath, `FILE(${pluginDefinitionPath})`))) {
      console.log(`Could not set config path for ${pluginDefinitionPath}, status=${status}`);
      return null;
    }
    if ((status = configMgr.loadConfiguration(pluginRootPath))) {
      console.log(`Could not load config for ${pluginDefinitionPath}, status=${status}`);
      return null;
    }

    let validation = configMgr.validate(pluginRootPath);
    if (validation.ok){
      if (validation.exceptionTree){
        console.log(`Validation of ${pluginDefinitionPath} against schema ${PLUGIN_DEF_SCHEMA_ID} found invalid JSON Schema data`);
        showExceptions(validation.exceptionTree, 0);
        return null;
      } else {
        return configMgr.getConfigData(pluginRootPath);
      }
    } else {
      console.log(`Error occurred on validation of ${pluginDefinitionPath} against schema ${PLUGIN_DEF_SCHEMA_ID} `);
      return null;
    }
  } else {
    console.log(`Plugin at ${pluginRootPath} has no pluginDefinition.json`);
    return null;
  }
}


function registerPlugin(path, pluginDefinition) {
  const filePath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`;
  if (fileExists(filePath)) {
    return true;
  } else {
    let location, relativeTo;
    const index = path.indexOf(runtimeDirectory);
    if (index != -1) {
      relativeTo = "$ZWE_zowe_runtimeDirectory";
      location = filePath.substring(index);


      return xplatform.storeFileUTF8(filePath, xplatform.AUTO_DETECT, JSON.stringify({
        "identifier": pluginDefinition.identifier,
        "pluginLocation": location,
        "relativeTo": relativeTo
      }, null, 2));
    } else {
      return xplatform.storeFileUTF8(filePath, xplatform.AUTO_DETECT, JSON.stringify({
        "identifier": pluginDefinition.identifier,
        "pluginLocation": filePath
      }, null, 2));
    }
  }
}

function deregisterPlugin(pluginDefinition) {
  const filePath = `${pluginPointerDirectory}/${pluginDefinition.identifier}.json`;
  if (fileExists(filePath, true)) {
    const rc = deleteFile(filePath);
    if (rc !== 0) {
      console.log(`Could not deregister plugin ${pluginDefinition.identifier}, delete ${filePath} failed, error=${rc}`);
    }
    return rc !== 0;
  } else {
    return true;
  }
}

if (!directoryExists(pluginPointerDirectory, true)) {
  const rc = os.mkdir(pluginPointerDirectory, 0o770);
  if (rc < 0) {
    console.log(`Could not create pluginsDir=${pluginPointerDirectory}, err=${rc}`);
    std.exit(2);
  }
}

console.log("Start iteration");

//A port of https://github.com/zowe/zlux-app-server/blob/v2.x/staging/bin/init/plugins-init.sh

installedComponents.forEach(function(installedComponent) {
  const componentDirectory = findComponentDirectory(installedComponent);
  if (componentDirectory) {
    const enabled = enabledComponents.includes(installedComponent);
    console.log(`Checking plugins for component=${installedComponent}, enabled=${enabled}`);

    const manifest = getManifest(componentDirectory);
    if (manifest.appfwPlugins) {
      manifest.appfwPlugins.forEach(function (manifestPluginRef) {
        const path = manifestPluginRef.path;
        const fullPath = `${componentDirectory}/${path}`
        const pluginDefinition = getPluginDefinition(fullPath);
        if (pluginDefinition) {
          if (enabled) {
            console.log(`Registering plugin ${fullPath}`);
            registerPlugin(fullPath, pluginDefinition);
          } else {
            console.log(`Deregistering plugin ${fullPath}`);
            deregisterPlugin(pluginDefinition);
          }
        } else {
          console.log(`Skipping plugin at ${fullPath} due to pluginDefinition missing or invalid`);
        }
      });
    }
  } else {
    console.log(`Warning: Could not remove app framework plugins for extension ${installedComponent} because its directory could not be found within ${extensionDirectory}`);
  }
});

