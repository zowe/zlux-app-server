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
    echo "Usage: $0 AppPackagePath"
    exit 1
fi
utils_path=$(pwd)/../../zlux-server-framework/utils
if [ "$1" = "/*" ]
   then
   app_path=$1
else
   app_path=$(pwd)/$1
fi
shift
cd $utils_path
node install-app.js -i "$app_path" -o "../../" -c "../../zlux-app-server/deploy/instance/ZLUX/serverConfig/zluxserver.json" $@
echo "Ended with rc=$?"
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
