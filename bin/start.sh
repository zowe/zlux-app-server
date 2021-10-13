#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.


# Required variables on shell:
# - ROOT_DIR
# - WORKSPACE_DIR
# - NODE_HOME
#
# Optional variables on shell:
# - APIML_ENABLE_SSO
# - GATEWAY_PORT
# - DISCOVERY_PORT
# - ZOWE_ZLUX_SSH_PORT
# - ZOWE_ZLUX_TELNET_PORT
# - ZOWE_ZLUX_SECURITY_TYPE

if [ -n "${ROOT_DIR}" ]
then
  #not a dev env

  COMPONENT_HOME=${ROOT_DIR}/components/app-server

  # containers only
  if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
    if [ -f "/component/manifest.yaml" ]; then
      COMPONENT_HOME=/component
    fi
  fi

  cd ${COMPONENT_HOME}/share/zlux-app-server/bin
fi
./app-server.sh
