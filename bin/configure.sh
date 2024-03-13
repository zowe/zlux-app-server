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

if [ "$ZWE_components_gateway_enabled" = "true" ]; then
  if [ "$ZWE_components_zss_enabled" = "true" ]; then
    if [ "${ZWE_RUN_ON_ZOS}" != "true" ]; then
      zss_def_template="zss.apiml_static_reg.yaml.template"
      export ZSS_PORT="${ZWE_components_zss_port}"
      if [ "${ZWE_components_zss_tls}" != "false" ]; then
        export ZSS_PROTOCOL=https
      else
        export ZSS_PROTOCOL=http
      fi
  
      if [ -n "${ZWE_STATIC_DEFINITIONS_DIR}" ]; then
        zss_registration_yaml=${ZWE_STATIC_DEFINITIONS_DIR}/zss.apiml_static_reg_yaml_template.${ZWE_CLI_PARAMETER_HA_INSTANCE}.yml
        zss_def="../${zss_def_template}"
        zss_parsed_def=$( ( echo "cat <<EOF" ; cat "${zss_def}" ; echo ; echo EOF ) | sh 2>&1)
        echo "${zss_parsed_def}" > "${zss_registration_yaml}"
        chmod 770 "${zss_registration_yaml}"
      fi
    
      unset ZSS_PORT
      unset ZSS_PROTOCOL
    fi
  fi
fi


. ./init/node-init.sh
cd ../lib
CONFIG_FILE=$ZWE_CLI_PARAMETER_CONFIG $NODE_BIN initInstance.js

cd ${COMPONENT_HOME}/share/zlux-app-server/bin/init
if [ "${ZWE_components_app_server_zowe_useConfigmgr}" = "false" ]; then
  . ./plugins-init.sh  
elif [ "${ZWE_zowe_useConfigmgr}" = "true" ]; then
  _CEE_RUNOPTS="XPLINK(ON),HEAPPOOLS(OFF)" ${ZWE_zowe_runtimeDirectory}/bin/utils/configmgr -script "${ZWE_zowe_runtimeDirectory}/components/app-server/share/zlux-app-server/bin/init/plugins-init.js"
else
  . ./plugins-init.sh
fi
