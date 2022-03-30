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

check_zss_pc_bit() {
  appfw_plugin_path=${1}

  services=$(read_json "${appfw_plugin_path}/pluginDefinition.json" ".dataServices" 2>/dev/null)
  if [ -n "${services}" ]; then
    echo "Checking ZSS services in plugin path=${1}"
    service_iterator_index=0
    service_type=$(read_json "${appfw_plugin_path}/pluginDefinition.json" ".dataServices[${service_iterator_index}].type" 2>/dev/null)
    while [ -n "${service_type}" ]; do
      if [ "${service_type}" = "service" ]; then
        libraryName31=$(read_json "${appfw_plugin_path}/pluginDefinition.json" ".dataServices[${service_iterator_index}].libraryName31" 2>/dev/null)
        libraryName64=$(read_json "${appfw_plugin_path}/pluginDefinition.json" ".dataServices[${service_iterator_index}].libraryName64" 2>/dev/null)
        libraryName=$(read_json "${appfw_plugin_path}/pluginDefinition.json" ".dataServices[${service_iterator_index}].libraryName" 2>/dev/null)
        if [ -n "${libraryName31}" ]; then
          test_or_set_pc_bit "${appfw_plugin_path}/lib/${libraryName31}"
          if [ "$?" = "1" ]; then
            break
          fi
        fi
        if [ -n "${libraryName64}" ]; then
          test_or_set_pc_bit "${appfw_plugin_path}/lib/${libraryName64}"
          if [ "$?" = "1" ]; then
            break
          fi
        fi
        if [ -n "${libraryName}" ]; then
          test_or_set_pc_bit "${appfw_plugin_path}/lib/${libraryName}"
          if [ "$?" = "1" ]; then
            break
          fi
        fi
      fi
      service_iterator_index=`expr $service_iterator_index + 1`
      service_type=$(read_json "${appfw_plugin_path}/pluginDefinition.json" ".dataServices[${service_iterator_index}].type 2>/dev/null")
    done
  fi
}



test_or_set_pc_bit() {
  path="${1}"

  testpc=`extattr $path | sed -n '3 p'`
  if [ "$testpc" = "Program controlled = YES" ]; then
    # normal
    return 0
  else
    echo "Plugin ZSS API not program controlled. Attempting to add PC bit." 
    extattr +p $path
    testpc2=$(extattr $path | sed -n '3 p')
    if [ "$testpc2" = "Program controlled = YES" ]; then
      echo "PC bit set successfully."
      return 0
    else
      echo "PC bit not set. This must be set such as by executing 'extattr +p $COMPONENT_HOME/lib/sys.so' as a user with sufficient privilege."
      return 1
    fi
  fi
}
