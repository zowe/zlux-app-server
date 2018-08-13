#! /bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

export dir=`dirname "$0"`
cd $dir

export NODE_PATH=../../zlux-proxy-server/js/node_modules:$NODE_PATH
cd ../js

if [ -z "$ZLUX_NODE_LOG_DIR" ]
then
  ZLUX_NODE_LOG_DIR="../log"
fi

if [ -f "$ZLUX_NODE_LOG_DIR" ]
then
  ZLUX_NODE_LOG_FILE="$ZLUX_NODE_LOG_DIR"
  echo "Will log to file = ${ZLUX_NODE_LOG_FILE}"
elif [ ! -d "$ZLUX_NODE_LOG_DIR" ]
then
  echo "Will make log directory $ZLUX_NODE_LOG_DIR"
  mkdir -p $ZLUX_NODE_LOG_DIR
fi

if [ -d "$ZLUX_NODE_LOG_DIR" ]
then
  ZLUX_NODE_LOG_FILE="$ZLUX_NODE_LOG_DIR/nodeServer.log"
fi

if [ ! -e $ZLUX_NODE_LOG_FILE && "$ZLUX_NODE_LOG_FILE" != "/dev/null" ]
then
  touch $ZLUX_NODE_LOG_FILE
fi

echo ZLUX_NODE_LOG_FILE=${ZLUX_NODE_LOG_FILE}

if [ -n "$NODE_HOME" ]
then
  export PATH=$NODE_HOME/bin:$PATH
else
  echo WARN- NODE_HOME environment variable not defined, not setting PATH
fi

export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"
export _BPXK_AUTOCVT=ON
export minWorkers=2

echo Show Environment
env
echo Show which node
which node


echo Starting node

if [ ! -w "$ZLUX_NODE_LOG_FILE" && "$ZSS_NODE_LOG_FILE" != "/dev/null"  ]
then
  echo file "$ZLUX_NODE_LOG_FILE" is not writable. Exiting
  exit 1
else
  node --harmony zluxCluster.js --config=../deploy/instance/ZLUX/serverConfig/zluxserver.json "$@" 2>&1 | tee $ZLUX_NODE_LOG_FILE
fi


# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
