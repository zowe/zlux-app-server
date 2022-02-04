# ZWE_zowe_runtimeDirectory
# ZWE_zowe_extensionDirectory
# ZWE_INSTALLED_COMPONENTS=api-catalog,apiml-common-lib,app-server,caching-service,common-java-lib,discovery,explorer-jes,explorer-mvs,explorer-uss,files-api,gateway,jobs-api,launcher,metrics-service,zss,process-manager
# ZWE_ENABLED_COMPONENTS=api-catalog,app-server,caching-service,discovery,explorer-jes,explorer-mvs,explorer-uss,gateway,zss

#INSTALL_NO_NODE=$1

echo "Using runtime=${ZWE_zowe_runtimeDirectory and extensions=${ZWE_zowe_extensionDirectory}"
echo "Checking installed=${ZWE_INSTALLED_COMPONENTS}"
echo "Checking enabled=${ZWE_ENABLED_COMPONENTS}"

. ./plugin_utils.sh

plugins_dir=getPluginsDir

for installed_component in $(echo "${ZWE_INSTALLED_COMPONENTS}" | sed "s/,/ /g"); do
  extension_location="${ZWE_zowe_extensionDirectory}/${installed_component}"
  if [ -d "${extension_location}" ]; then
    is_enabled=false
    for enabled_component in $(echo "${ZWE_ENABLED_COMPONENTS}" | sed "s/,/ /g"); do
      if [ "${enabled_component}" = "${installed_component}" ]; then
        is_enabled=true
      fi
    done

    echo "Checking plugins for component=${installed_component}, enabled=${is_enabled}"
    
    # HERE: can we do this without any nodejs? probably no, but lets use the zowe install packaging utils.
    # init-plugins.js $is_enabled "${extension_location}"
    plugin_folders=getPluginsInComponent "${extension_location}"
    
    for folder in $(echo "${plugin_folders}" | sed "s/,/ /g"); do
      folder_path="${extension_location}/${folder}"
      if [ "$is_enabled" = "true" ]; then
        echo "Registering plugin ${folder_path}"
        INSTALL_NO_NODE=$1 ./install-app.sh "${folder_path}" "${plugin_dir}"
      else
        echo "Deregistering plugin ${folder_path}"
        ./uninstall-app.sh "${folder_path}" "${plugin_dir}"
      fi
    done
  else
    echo "Warning: Could not remove app framework plugins for extension ${installed_component} because its directory could not be found within ${ZWE_zowe_extensionDirectory}"
  fi
done



