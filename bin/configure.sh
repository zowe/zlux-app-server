#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.


# Required variables on shell:
# - ZWE_zowe_runtimeDirectory
# - ZWE_zowe_workspaceDirectory
# - NODE_HOME
COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

# containers only
if [ "${ZWE_RUN_ON_ZOS}" != "true" ]; then
  if [ -f "/component/manifest.yaml" ]; then
    COMPONENT_HOME=/component
  fi
fi

cd ${COMPONENT_HOME}/share/zlux-app-server/bin

apiml_enabled=false
if [ "$ZWE_components_gateway_enabled" = "true" ]; then
  apiml_enabled=true
elif [ "$ZWE_components_apiml_enabled" = "true" ]; then
  apiml_enabled=true
fi

if [ "$apiml_enabled" = "true" ]; then
  app_server_static="${ZWE_components_app_server_node_mediationLayer_static:-false}"
  app_server_registration_yaml=${ZWE_STATIC_DEFINITIONS_DIR}/app-server.apiml_static_reg_yaml_template.${ZWE_CLI_PARAMETER_HA_INSTANCE}.yml
  if [ "$app_server_static" = "true" ] && [ -n "${ZWE_STATIC_DEFINITIONS_DIR}" ]; then
    app_server_def_template="app-server.apiml_static_reg.yaml.template"
    app_server_def="../${app_server_def_template}"
    export APP_SERVER_VERSION=$(grep '^version:' "${COMPONENT_HOME}/manifest.yaml" | head -1 | sed 's/^version: *//; s/"//g')
    app_server_parsed_def=$( ( echo "cat <<EOF" ; cat "${app_server_def}" ; echo ; echo EOF ) | sh 2>&1)
    echo "${app_server_parsed_def}" > "${app_server_registration_yaml}.1047"
    iconv -f 1047 -t 819 "${app_server_registration_yaml}.1047" "${app_server_registration_yaml}"
    rm "${app_server_registration_yaml}.1047"
    chmod 770 "${app_server_registration_yaml}"
    unset APP_SERVER_VERSION
  elif [ -n "${ZWE_STATIC_DEFINITIONS_DIR}" ] && [ -f "${app_server_registration_yaml}" ]; then
    rm -f "${app_server_registration_yaml}"
  fi

  if [ "$ZWE_components_zss_enabled" = "true" ]; then
    if [ "${ZWE_RUN_ON_ZOS}" != "true" ]; then
      zss_def_template="zss.apiml_static_reg.yaml.template"
      export ZSS_PORT="${ZWE_components_zss_port}"
  
      if [ -n "${ZWE_STATIC_DEFINITIONS_DIR}" ]; then
        zss_registration_yaml=${ZWE_STATIC_DEFINITIONS_DIR}/zss.apiml_static_reg_yaml_template.${ZWE_CLI_PARAMETER_HA_INSTANCE}.yml
        zss_def="../${zss_def_template}"
        zss_parsed_def=$( ( echo "cat <<EOF" ; cat "${zss_def}" ; echo ; echo EOF ) | sh 2>&1)
        echo "${zss_parsed_def}" > "${zss_registration_yaml}"
        chmod 770 "${zss_registration_yaml}"
      fi
    
      unset ZSS_PORT
    fi
  fi
fi


. ./init/node-init.sh
cd ../lib
CONFIG_FILE=$ZWE_CLI_PARAMETER_CONFIG $NODE_BIN initInstance.js
