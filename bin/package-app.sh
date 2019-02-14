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

utils_path=$(pwd)/../../zlux-server-framework/utils
cd $1
app_path=$(pwd)
cd $utils_path
shift
node package-app.js -i "$app_path" -o "../../zlux-app-server/bin" $@
echo "Ended with rc=$?"
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
