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
# - WORKSPACE_DIR
# - NODE_HOME
COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

# containers only
if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
  if [ -f "/component/manifest.yaml" ]; then
    COMPONENT_HOME=/component
  fi
fi

cd ${COMPONENT_HOME}/share/zlux-app-server/bin
. ./convert-env.sh
. ./internal-node-init.sh
cd ${COMPONENT_HOME}/share/zlux-app-server/lib
__UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js

. ./internal-plugins-init.sh
