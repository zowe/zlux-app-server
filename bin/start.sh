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
#
# Optional variables on shell:
# - APIML_ENABLE_SSO
# - GATEWAY_PORT
# - DISCOVERY_PORT
# - ZWED_SSH_PORT
# - ZWED_TN3270_PORT
# - ZWED_TN3270_SECURITY

if [ -n "${ZWE_zowe_runtimeDirectory}" ]
then
  #not a dev env

  COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

  # containers only
  if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
    if [ -f "/component/manifest.yaml" ]; then
      COMPONENT_HOME=/component
    fi
  fi

  cd ${COMPONENT_HOME}/share/zlux-app-server/bin
fi

. ./utils/setup-logs.sh

# Done to prevent app-server from making a logfile since we will be making one here instead.
export ZLUX_NO_LOGFILE=1

./app-server.sh 2>&1 | tee $ZWED_NODE_LOG_FILE
