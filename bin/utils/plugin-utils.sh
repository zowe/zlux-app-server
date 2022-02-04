pluginDefExists() {
  if [ -e "$1/pluginDefinition.json" ]; then
    return "true"
  else
    return "false"
  fi
}

getPluginsDir() {
  if [ -n "${ZWED_pluginsDir}" ]; then
    return "${ZWED_pluginsDir}"
  elif [ -n "${ZWE_components_app_server_pluginsDir}" ]; then
    return "${ZWE_components_app_server_pluginsDir}"
  elif [ -n "${ZWE_zowe_workspaceDirectory}" ]; then
    return "${ZWE_zowe_workspaceDirectory}/app-server/plugins"
  fi
}

getPluginsInComponent() {
    if [ -e "$1/manifest.yaml" ]; then
      plugin_folders=$(read_yaml $1/manifest.yaml .appfwPlugins | tr '\n' ',')
    else
      plugin_folders=$(read_json $1/manifest.json .appfwPlugins | tr '\n' ',')
    fi
}

getPluginID() {
  verifyPluginDef $1
  if [ "$?" = "true" ]; then
    return `grep "identifier" $1/pluginDefinition.json |  sed -e 's/"//g' | sed -e 's/.*: *//g' | sed -e 's/,.*//g'`
  fi
}

# app2app needs zlux, which needs nodejs, no need to process in shell
hasApp2App() {
  if [ -d "$1/config/recognizers" -o -d "$1/config/actions" ]; then
    return "true"
  else
    return "false"
  fi
}
