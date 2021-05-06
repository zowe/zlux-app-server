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
cd ${ROOT_DIR}/components/app-server/share/zlux-app-server/bin
. ./convert-env.sh
. ./internal-node-init.sh
cd ${ROOT_DIR}/components/app-server/share/zlux-app-server/lib
__UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
OSNAME=$(uname)

# conditionally set up static reg file for zss if app-server is remote to zss
# if apiml isnt in this environment, this is harmless but does nothing, otherwise zss is attached
if [ "${OSNAME}" != "OS/390" ]; then
  if [ "$ZWED_agent_mediationLayer_enabled" = "true" ]; then
    cp ${ROOT_DIR}/components/app-server/share/zlux-app-server/zss_static_registration.yaml.template ${INSTANCE_DIR}/workspace/api-mediation/api-defs/zss_static_registration_template.yml
  elif [ -e "${INSTANCE_DIR}/workspace/api-mediation/api-defs/container-zss-static-reg.yaml.template.yml" ]; then
    rm ${INSTANCE_DIR}/workspace/api-mediation/api-defs/zss_static_registration_template.yml
  fi
fi
