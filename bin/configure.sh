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
      if [ -n "${ZWE_STATIC_DEFINITIONS_DIR}" ]; then
        zss_registration_yaml=${ZWE_STATIC_DEFINITIONS_DIR}/zss.apiml_static_reg_yaml_template.${ZWE_CLI_PARAMETER_HA_INSTANCE}.yml
        awk -v   zah="$(set | sed -n 's/^ZWED_agent_host=//p' | sed 's/^"//;s/"$//')" \
          -v      zp="$(set | sed -n 's/^ZWE_components_zss_port=//p' | sed 's/^"//;s/"$//')" \
          -v     zhh="$(set | sed -n 's/^ZWE_haInstance_hostname=//p' | sed 's/^"//;s/"$//')" \
          -v   zcasp="$(set | sed -n 's/^ZWE_components_app_server_port=//p' | sed 's/^"//;s/"$//')" \ '
          BEGIN {
              RESTRICTED_ENV["ZWED_agent_host"] = zah
              RESTRICTED_ENV["ZSS_PORT"] = zp
              RESTRICTED_ENV["ZWE_haInstance_hostname"] = zhh
              RESTRICTED_ENV["ZWE_components_app_server_port"] = zcasp
          }
          {
            for (v in RESTRICTED_ENV) {
              gsub("\\$[{]" v "[}]", RESTRICTED_ENV[v])
            }
            print
          }' "${zss_def_template}" > "${zss_registration_yaml}"
        chmod 660 "${zss_registration_yaml}"
      fi
    fi
  fi
fi


. ./init/node-init.sh
cd ../lib
CONFIG_FILE=$ZWE_CLI_PARAMETER_CONFIG $NODE_BIN initInstance.js
