# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.


pluginDefExists() {
  if [ -e "$1/pluginDefinition.json" ]; then
    return 0
  else
    return 1
  fi
}

getPluginsDir() {
  if [ -n "${ZWED_pluginsDir}" ]; then
    echo "${ZWED_pluginsDir}"
  elif [ -n "${ZWE_components_app_server_pluginsDir}" ]; then
    echo "${ZWE_components_app_server_pluginsDir}"
  elif [ -n "${ZWE_zowe_workspaceDirectory}" ]; then
    echo "${ZWE_zowe_workspaceDirectory}/app-server/plugins"
  fi
}

getPluginID() {
  pluginDefExists $1
  if [ $? -eq 0 ]; then
    pluginId=$(grep "identifier" $1/pluginDefinition.json |  sed -e 's/"//g' | sed -e 's/.*: *//g' | sed -e 's/,.*//g')
    echo "$pluginId"
  fi
}

# app2app needs zlux, which needs nodejs, no need to process in shell
hasApp2App() {
  if [ -d "$1/config/recognizers" -o -d "$1/config/actions" ]; then
    return 0
  else
    return 1
  fi
}

