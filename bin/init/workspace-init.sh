#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

#ZLUX_CONFIG_FILE and ZWE_zowe_workspaceDirectory are for official Zowe environment use.
#If none found, will assume dev environment and consider ~/.zowe/workspace as ZWE_zowe_workspaceDirectory

if [ -n "${ZWE_zowe_workspaceDirectory}" ]
then
  if [ -e "${ZWE_zowe_workspaceDirectory}/app-server/serverConfig/zowe.yaml" ]
  then
    export CONFIG_FILE="${ZWE_zowe_workspaceDirectory}/app-server/serverConfig/zowe.yaml"
  else
    cd ../../lib
    __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
    export CONFIG_FILE="${ZWE_zowe_workspaceDirectory}/app-server/serverConfig/zowe.yaml"
  fi
elif [ -e "${HOME}/.zowe/workspace/app-server/serverConfig/zowe.yaml" ]
then
  export CONFIG_FILE="${HOME}/.zowe/workspace/app-server/serverConfig/zowe.yaml"
  if [ -z "${ZWE_zowe_logDirectory}" ]; then
    export ZWE_zowe_logDirectory="${HOME}/.zowe/logs"
  fi
  mkdir -p ${ZWE_zowe_logDirectory}
  export WORKSPACE_DIR="${HOME}/.zowe/workspace"
else
  echo "No config file found, initializing..."
  export WORKSPACE_DIR="${HOME}/.zowe/workspace"
  if [ -z "${ZWE_zowe_logDirectory}" ]; then
    export ZWE_zowe_logDirectory="${HOME}/.zowe/logs"
  fi
  mkdir -p ${ZWE_zowe_logDirectory}
  cd ../lib
  __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
  cd ../bin
  export CONFIG_FILE="${HOME}/.zowe/workspace/app-server/serverConfig/zowe.yaml"
fi
