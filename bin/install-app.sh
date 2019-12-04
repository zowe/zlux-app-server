#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
if [ $# -eq 0 ]
    then
    echo "Usage: $0 AppPath [PluginsDir]"
    exit 1
fi

if [ -n "$NODE_HOME" ]
then
  NODE_BIN=${NODE_HOME}/bin/node
else
  NODE_BIN=node
fi

zlux_path=$(cd $(dirname "$0")/../..; pwd)
utils_path=$zlux_path/zlux-server-framework/utils
if [ -z $2 ]
then
  if [ -n $WORKSPACE_DIR ]
  then
    json_path=$WORKSPACE_DIR/app-server/serverConfig/server.json
  else
    json_path=$zlux_path/zlux-app-server/defaults/serverConfig/server.json
  fi
fi

app_path=$(cd "$1"; pwd)

shift

cd $zlux_path/zlux-app-server/bin

if [ -z "$ZLUX_INSTALL_LOG_DIR" ]
then
  if [ -n $INSTANCE_DIR ]
  then
    ZLUX_INSTALL_LOG_DIR="$INSTANCE_DIR/logs"
  else
    ZLUX_INSTALL_LOG_DIR="$zlux_path/zlux-app-server/log"
  fi
fi

if [ ! -d "$ZLUX_INSTALL_LOG_DIR" ]
   then
   echo "Will make log directory $ZLUX_INSTALL_LOG_DIR"
   mkdir -p $ZLUX_INSTALL_LOG_DIR
fi

LOG_FILE="$ZLUX_INSTALL_LOG_DIR/install-app.log"
echo "utils_path=${utils_path}\napp_path=${app_path}"
echo "Checking for node"
type node
rc=$?
if [ $rc -ne 0 ]
    then
    echo "Node required for installation. Add to PATH and try again"
    exit $rc
fi
echo "Running installer. Log location=$LOG_FILE"
if [ -n $2 ]
then
__UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -p "$2" $@ 2>&1 | tee $LOG_FILE
else
__UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -c "$json_path" $@ 2>&1 | tee $LOG_FILE
fi
rc=$?
echo "Ended with rc=${rc}"
exit $rc
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
