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
    echo "Usage: $0 AppDir"
    exit 1
fi
start_path=$(pwd)
utils_path=$(pwd)/../../zlux-server-framework/utils
cd $1
app_path=$(pwd)
cd $start_path
shift

if [ -z "$ZLUX_PKG_LOG_DIR" ]
    then
    ZLUX_PKG_LOG_DIR="../log"
fi

if [ ! -d "$ZLUX_PKG_LOG_DIR" ]
   then
   echo "Will make log directory $ZLUX_PKG_LOG_DIR"
   mkdir -p $ZLUX_PKG_LOG_DIR
fi

LOG_FILE="$ZLUX_PKG_LOG_DIR/package.log"
echo "Running packager. Log location=$LOG_FILE"
node $utils_path/package-app.js -i "$app_path" -o "../../zlux-app-server/bin" $@ 2>&1 | tee $LOG_FILE
echo "Ended with rc=$?"
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
