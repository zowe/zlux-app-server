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

if [ -z "${ROOT_DIR}" ]
then
 #this may be a dev environment, or backward compat, so stay in current dir and check node
 . ./validate.sh
fi

if [ ! -e "${dir}/convert-env.sh" ]
then
  if [ -n "$CONDA_PREFIX" ]
  then
    dir="$CONDA_PREFIX/share/zowe/app-server/zlux-app-server/bin"
    cd $dir
  fi
fi

. ./convert-env.sh
. ./internal-node-init.sh

if [ -e "$ZLUX_CONFIG_FILE" ]
then
    CONFIG_FILE=$ZLUX_CONFIG_FILE
elif [ -z "${ROOT_DIR}" ]
then
  #dev env or backwards compat, do late configure
  . ./internal-inst-init.sh
else
  CONFIG_FILE="${WORKSPACE_DIR}/app-server/serverConfig/server.json"
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
cd ../lib

export ZOWE_LIB_DIR=$(pwd)
export ZLUX_ROOT_DIR=$(cd ../..; pwd)

export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"

echo Show Environment
env

if [ -z "$ZOWE_WORKING_DIR" ]
then
  export ZOWE_WORKING_DIR=$ZOWE_LIB_DIR
else
  echo "Server is about to start with a non default working directory. Working dir=$ZOWE_WORKING_DIR"
fi

cd $ZOWE_WORKING_DIR

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

# Weird bug in recent releases has app-server not having the same jobname prefix as other services.
# This only happens when LAUNCH_COMPONENT_GROUPS includes GATEWAY.
# Possibly due to hacks elsewhere that we weren't notified of https://github.com/zowe/zowe-install-packaging/commit/0ccb77afca8f6dd8e2782c25490283739ab2791c
if [ -n "${ZOWE_INSTANCE}" ]; then
  if [[ "${ZOWE_PREFIX}" != *"${ZOWE_INSTANCE}" ]]; then
    export ZOWE_PREFIX=${ZOWE_PREFIX}${ZOWE_INSTANCE}
  fi
fi

{ __UNTAGGED_READ_MODE=V6 _BPX_JOBNAME=${ZOWE_PREFIX}DS1 ${NODE_BIN} --require "${ZOWE_LIB_DIR}/otelTracing.js" --harmony ${ZOWE_LIB_DIR}/${ZLUX_SERVER_FILE} --config="${CONFIG_FILE}" "$@" 2>&1 ; echo "Ended with rc=$?" ; } | tee $ZLUX_NODE_LOG_FILE

