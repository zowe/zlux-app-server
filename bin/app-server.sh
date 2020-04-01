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
#
# Optional variables on shell:
# - APIML_ENABLE_SSO
# - GATEWAY_PORT
# - DISCOVERY_PORT
# - ZOWE_ZLUX_SSH_PORT
# - ZOWE_ZLUX_TELNET_PORT
# - ZOWE_ZLUX_SECURITY_TYPE

if [ -n "$NODE_HOME" ]
then
  NODE_BIN=${NODE_HOME}/bin/node
  export PATH=${NODE_HOME}/bin:$PATH
elif [ -n "$ZOWE_NODE_HOME" ]
then
  NODE_BIN=${ZOWE_NODE_HOME}/bin/node
  export PATH=${ZOWE_NODE_HOME}/bin:$PATH
else
  NODE_BIN=node
fi
export _BPXK_AUTOCVT=ON

nodeVersion="$(${NODE_BIN} --version)"
nodeMajorVersion=$(echo ${nodeVersion} | cut -c2-3)
if [ $nodeMajorVersion = "12" ]
then
  export _TAG_REDIR_ERR=txt
  export _TAG_REDIR_IN=txt
  export _TAG_REDIR_OUT=txt
fi

dir=$(cd `dirname $0` && pwd)
if [ ! -e "${dir}/convert-env.sh" ]
then
  if [ -n "$CONDA_PREFIX" ]
  then
    dir="$CONDA_PREFIX/share/zowe/app-server/zlux-app-server/bin"
    cd $dir
  fi
fi

. ./convert-env.sh

#ZLUX_CONFIG_FILE, WORKSPACE_DIR, and INSTANCE_DIR are for official Zowe environment use.
#If none found, will assume dev environment and consider ~/.zowe as INSTANCE_DIR
if [ -e "$ZLUX_CONFIG_FILE" ]
then
    CONFIG_FILE=$ZLUX_CONFIG_FILE
elif [ -n "${WORKSPACE_DIR}" ]
then
  if [ -e "${WORKSPACE_DIR}/app-server/serverConfig/server.json" ]
  then
    CONFIG_FILE="${WORKSPACE_DIR}/app-server/serverConfig/server.json"
  else
    cd ../lib
    NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
    CONFIG_FILE="${WORKSPACE_DIR}/app-server/serverConfig/server.json"
    cd ../bin
  fi
elif [ -n "${INSTANCE_DIR}" ]
then
  if [ -e "${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json" ]
  then
    CONFIG_FILE="${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json"
  else
    cd ../lib
    NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
    CONFIG_FILE="${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json"
    cd ../bin
  fi
elif [ -e "${HOME}/.zowe/workspace/app-server/serverConfig/server.json" ]
then
  CONFIG_FILE="${HOME}/.zowe/workspace/app-server/serverConfig/server.json"
  mkdir -p ${INSTANCE_DIR}/logs
  export INSTANCE_DIR="${HOME}/.zowe"
elif [ -e "../deploy/instance/ZLUX/serverConfig/zluxserver.json" ]
then
  echo "WARNING: Using old configuration present in ${dir}/../deploy\n\
This configuration should be migrated for use with future versions. See documentation for more information.\n"
  CONFIG_FILE="../deploy/instance/ZLUX/serverConfig/zluxserver.json"
else
  echo "No config file found, initializing..."
  export INSTANCE_DIR="${HOME}/.zowe"
  mkdir -p ${INSTANCE_DIR}/logs
  cd ../lib
  NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
  CONFIG_FILE="${HOME}/.zowe/workspace/app-server/serverConfig/server.json"
  cd ../bin
fi

if [ -n "$ZLUX_NODE_LOG_FILE" ]
then
  if [ -n "$ZLUX_NODE_LOG_DIR" ]
  then
    echo "ZLUX_NODE_LOG_FILE set (value $ZLUX_NODE_LOG_FILE).  Ignoring ZLUX_NODE_LOG_DIR."
  fi
else
  # _FILE was not specified; default filename, and check and maybe default _DIR
  if [ -z "$ZLUX_NODE_LOG_DIR" ]
  then
    if [ -d "$INSTANCE_DIR" ]
    then
      ZLUX_NODE_LOG_DIR=${INSTANCE_DIR}/logs
    else
      ZLUX_NODE_LOG_DIR="../log"
    fi
  fi
  
  if [ -f "$ZLUX_NODE_LOG_DIR" ]
  then
    ZLUX_NODE_LOG_FILE=$ZLUX_NODE_LOG_DIR
  elif [ ! -d "$ZLUX_NODE_LOG_DIR" ]
  then
    echo "Will make log directory $ZLUX_NODE_LOG_DIR"
    mkdir -p $ZLUX_NODE_LOG_DIR
    if [ $? -ne 0 ]
    then
      echo "Cannot make log directory.  Logging disabled."
      ZLUX_NODE_LOG_FILE=/dev/null
    fi
  fi
  
  ZLUX_ROTATE_LOGS=0
  if [ -d "$ZLUX_NODE_LOG_DIR" ] && [ -z "$ZLUX_NODE_LOG_FILE" ]
  then
    ZLUX_NODE_LOG_FILE="$ZLUX_NODE_LOG_DIR/appServer-`date +%Y-%m-%d-%H-%M`.log"
    if [ -z "$ZLUX_NODE_LOGS_TO_KEEP" ]
    then
      ZLUX_NODE_LOGS_TO_KEEP=5
    fi
    echo $ZLUX_NODE_LOGS_TO_KEEP|egrep '^\-?[0-9]+$' >/dev/null
    if [ $? -ne 0 ]
    then
      echo "ZLUX_NODE_LOGS_TO_KEEP not a number.  Defaulting to 5."
      ZLUX_NODE_LOGS_TO_KEEP=5
    fi
    if [ $ZLUX_NODE_LOGS_TO_KEEP -ge 0 ]
    then
      ZLUX_ROTATE_LOGS=1
    fi 
  fi
  
  #Clean up excess logs, if appropriate.
  if [ $ZLUX_ROTATE_LOGS -ne 0 ]
  then
    for f in `ls -r -1 $ZLUX_NODE_LOG_DIR/appServer-*.log 2>/dev/null | tail +$ZLUX_NODE_LOGS_TO_KEEP`
    do
      echo nodeServer.sh removing $f
      rm -f $f
    done
  fi
fi

ZLUX_NODE_CHECK_DIR="$(dirname "$ZLUX_NODE_LOG_FILE")"
if [ ! -d "$ZLUX_NODE_CHECK_DIR" ]
then
  echo "ZLUX_NODE_LOG_FILE contains nonexistent directories.  Creating $ZLUX_NODE_CHECK_DIR"
  mkdir -p $ZLUX_NODE_CHECK_DIR
  if [ $? -ne 0 ]
  then
    echo "Cannot make log directory.  Logging disabled."
    ZLUX_NODE_LOG_FILE=/dev/null
  fi
fi
#Now sanitize final log filename: if it is relative, make it absolute before cd to js
if [ "$ZLUX_NODE_LOG_FILE" != "/dev/null" ]
then
  ZLUX_NODE_CHECK_DIR=$(cd "$(dirname "$ZLUX_NODE_LOG_FILE")"; pwd)
  ZLUX_NODE_LOG_FILE=$ZLUX_NODE_CHECK_DIR/$(basename "$ZLUX_NODE_LOG_FILE")
fi


echo ZLUX_NODE_LOG_FILE=${ZLUX_NODE_LOG_FILE}
export ZLUX_LOG_PATH=$ZLUX_NODE_LOG_FILE

if [ ! -e $ZLUX_NODE_LOG_FILE ]
then
  touch $ZLUX_NODE_LOG_FILE
  if [ $? -ne 0 ]
  then
    echo "Cannot make log file.  Logging disabled."
    ZLUX_NODE_LOG_FILE=/dev/null
  fi
else
  if [ -d $ZLUX_NODE_LOG_FILE ]
  then
    echo "ZLUX_NODE_LOG_FILE is a directory.  Must be a file.  Logging disabled."
    ZLUX_NODE_LOG_FILE=/dev/null
  fi
fi

if [ ! -w "$ZLUX_NODE_LOG_FILE" ]
then
  echo file "$ZLUX_NODE_LOG_FILE" is not writable. Logging disabled.
  ZLUX_NODE_LOG_FILE=/dev/null
fi

#Determined log file.  Run node appropriately.
cd $dir
export NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH
cd ../lib

export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"

echo Show Environment
env
echo Show location of node
type node


echo Starting node
if [ -z "$ZLUX_NO_CLUSTER" ]
then
  ZLUX_SERVER_FILE=zluxCluster.js
  if [ -z "$ZLUX_MIN_WORKERS" ]
  then
    export ZLUX_MIN_WORKERS=2
  fi
else
  ZLUX_SERVER_FILE=zluxServer.js
fi

if [ -z "$ZOWE_PREFIX" ]
then
  ZOWE_PREFIX="ZWE"
fi
if [ -z "$ZOWE_INSTANCE" ]
then
    ZOWE_INSTANCE="1"
fi
JOBNAME=${ZOWE_PREFIX}DS${ZOWE_INSTANCE}

{ __UNTAGGED_READ_MODE=V6 _BPX_JOBNAME=${JOBNAME} ${NODE_BIN} --harmony --title "${JOBNAME}" ${ZLUX_SERVER_FILE} --config="${CONFIG_FILE}" "$@" 2>&1 ; echo "Ended with rc=$?" ; } | tee $ZLUX_NODE_LOG_FILE

