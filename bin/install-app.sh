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
utils_path=$(pwd)/../../zlux-server-framework/utils
start_dir=$(pwd)
cd $1
app_path=$(pwd)
cd $start_dir

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
echo "Running installer. Log location=$LOG_FILE"
node $utils_path/install-app.js -i "$app_path" -o "../../" -c "../../zlux-app-server/deploy/instance/ZLUX/serverConfig/zluxserver.json" $@ 2>&1 | tee $LOG_FILE
echo "Ended with rc=$?"
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
