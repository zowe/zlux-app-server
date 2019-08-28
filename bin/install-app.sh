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
    echo "Usage: $0 AppPath"
    exit 1
fi

zlux_path=$(cd $(dirname "$0")/../..; pwd)
utils_path=$zlux_path/zlux-server-framework/utils
json_path=$zlux_path/zlux-app-server/deploy/instance/ZLUX/serverConfig/zluxserver.json
app_path=$(cd "$1"; pwd)

shift

cd $zlux_path/zlux-app-server/bin

if [ -z "$ZLUX_INSTALL_LOG_DIR" ]
    then
    ZLUX_INSTALL_LOG_DIR="$zlux_path/zlux-app-server/log"
fi

if [ ! -d "$ZLUX_INSTALL_LOG_DIR" ]
   then
   echo "Will make log directory $ZLUX_INSTALL_LOG_DIR"
   mkdir -p $ZLUX_INSTALL_LOG_DIR
fi

LOG_FILE="$ZLUX_INSTALL_LOG_DIR/install.log"
echo "utils_path=${utils_path}\napp_path=${app_path}"
echo "Checking for node"
type node
if [ $? -ne 0 ]
    then
    echo "Node required for installation. Add to PATH and try again"
    exit $?
fi
echo "Running installer. Log location=$LOG_FILE"
node ${utils_path}/install-app.js -i "$app_path" -c "$json_path" $@ 2>&1 | tee $LOG_FILE
echo "Ended with rc=$?"
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
