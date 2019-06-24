#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
start_script=$0
start_path=$(pwd)
script_path=`dirname "${start_script}"`
cd $script_path
script_path=$(pwd)
if [ $# -eq 0 ]
    then
    echo "Usage: $0 AppPath"
    exit 1
fi

utils_path=${script_path}/../../zlux-server-framework/utils
json_path=${script_path}/../../zlux-app-server/deploy/instance/ZLUX/serverConfig/zluxserver.json
cd $start_path
cd $1
app_path=$(pwd)
cd $script_path

shift

if [ -z "$ZLUX_INSTALL_LOG_DIR" ]
    then
    ZLUX_INSTALL_LOG_DIR="../log"
fi

if [ ! -d "$ZLUX_INSTALL_LOG_DIR" ]
   then
   echo "Will make log directory $ZLUX_INSTALL_LOG_DIR"
   mkdir -p $ZLUX_INSTALL_LOG_DIR
fi

LOG_FILE="$ZLUX_INSTALL_LOG_DIR/install.log"
echo "start_path=${start_path}\nutils_path=${utils_path}\napp_path=${app_path}"
echo "Running installer. Log location=$LOG_FILE"
node ${utils_path}/install-app.js -i "$app_path" -c "$json_path" $@ 2>&1 | tee $LOG_FILE
cd $start_path

# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
