# $1=whether to use nodejs or not for installing (affects app2app installation)
# $2=whether to check pc bit of zss services

# ZWE_zowe_runtimeDirectory
# ZWE_zowe_extensionDirectory
# ZWE_INSTALLED_COMPONENTS=api-catalog,apiml-common-lib,app-server,caching-service,common-java-lib,discovery,explorer-jes,explorer-mvs,explorer-uss,files-api,gateway,jobs-api,launcher,metrics-service,zss,process-manager
# ZWE_ENABLED_COMPONENTS=api-catalog,app-server,caching-service,discovery,explorer-jes,explorer-mvs,explorer-uss,gateway,zss

echo "Using runtime=${ZWE_zowe_runtimeDirectory} and extensions=${ZWE_zowe_extensionDirectory}"
echo "Checking installed=${ZWE_INSTALLED_COMPONENTS}"
echo "Checking enabled=${ZWE_ENABLED_COMPONENTS}"

. ../utils/plugin-utils.sh

plugins_dir=$(getPluginsDir)

for installed_component in $(echo "${ZWE_INSTALLED_COMPONENTS}" | sed "s/,/ /g"); do
  extension_path=$(find_component_directory ${installed_component})
  if [ -d "${extension_path}" ]; then
    is_enabled=false
    for enabled_component in $(echo "${ZWE_ENABLED_COMPONENTS}" | sed "s/,/ /g"); do
      if [ "${enabled_component}" = "${installed_component}" ]; then
        is_enabled=true
      fi
    done

    echo "Checking plugins for component=${installed_component}, enabled=${is_enabled}"
    
    # HERE: can we do this without any nodejs? probably no, but lets use the zowe install packaging utils.
    # init-plugins.js $is_enabled "${extension_path}"
    
    iterator=0
    plugin_folder=$(read_component_manifest "${extension_path}" .appfwPlugins.[${iterator}].path)
    while [ -n "${plugin_folder}" ]; do
      fullpath="$extension_path/${plugin_folder}"
      if [ "$is_enabled" = "true" ]; then
        echo "Registering plugin ${fullpath}"
        # NOTE: relativeTo does not need to be handled here because this process occurs every start so the results should be "portable" by update on restart

        INSTALL_NO_NODE=$1 ../install-app.sh "$fullpath" "${plugins_dir}"
      else
        echo "Deregistering plugin ${fullpath}"
        ../uninstall-app.sh "$fullpath" "${plugins_dir}"
      fi
      iterator=`expr $iterator + 1`
      plugin_folder=$(read_component_manifest "${extension_path}" .appfwPlugins.[${iterator}].path)
    done
  else
    echo "Warning: Could not remove app framework plugins for extension ${installed_component} because its directory could not be found within ${ZWE_zowe_extensionDirectory}"
  fi
done



