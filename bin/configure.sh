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
if [ -n "$NODE_HOME" ]
then
  NODE_BIN=${NODE_HOME}/bin/node
else
  NODE_BIN=node
fi
cd ${ROOT_DIR}/components/app-server/share/zlux-app-server/lib
export NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH
__UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js

if [[ $ZOWE_APIM_ENABLE_SSO == "true" ]]; then
  if [ ! -e "${WORKSPACE_DIR}/app-server/plugins/org.zowe.zlux.auth.apiml.json" ]
  then
    cd ../bin
    ./install-app.sh ${ROOT_DIR}/components/api-mediation/apiml-auth
    # Activate the plugin
    $NODE_BIN -e "let serverConfig = require('${WORKSPACE_DIR}/app-server/server.json');\
 if (!serverConfig.dataserviceAuthentication.implementationDefaults.apiml) {\
serverConfig.dataserviceAuthentication.implementationDefaults.apiml={plugins:['org.zowe.zlux.auth.apiml']\}; \
const fs = require('fs'); \
fs.writeFileSync('${WORKSPACE_DIR}/app-server/server.json', JSON.stringify(serverConfig, null, 2));\
}"
  fi
fi
