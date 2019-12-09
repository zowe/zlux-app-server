#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
dir=$(cd `dirname $0` && pwd)

if [ -n "$ZLUX_CONFIG_FILE" ]
then
    CONFIG_FILE=$ZLUX_CONFIG_FILE
else
    echo "No config file specified, using default"
    CONFIG_FILE="${dir}/../deploy/instance/ZLUX/serverConfig/zluxserver.json"
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
    ZLUX_NODE_LOG_DIR="../log"
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
    ZLUX_NODE_LOG_FILE="$ZLUX_NODE_LOG_DIR/nodeServer-`date +%Y-%m-%d-%H-%M`.log"
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
    for f in `ls -r -1 $ZLUX_NODE_LOG_DIR/nodeServer-*.log 2>/dev/null | tail +$ZLUX_NODE_LOGS_TO_KEEP`
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
export dir=`dirname "$0"`
cd $dir
export NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH
cd ../lib

if [ -n "$NODE_HOME" ]
then
  export PATH=$NODE_HOME/bin:$PATH
else
  echo WARN- NODE_HOME environment variable not defined, not setting PATH
fi

if [ -z `command -v node` ]
then
  echo "Node not found in path. Please ensure NODE_HOME variable is properly set"
  exit 1
fi

export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"
export _BPXK_AUTOCVT=ON

echo Show Environment
env
echo Show location of node
type node

echo Starting node

__UNTAGGED_READ_MODE=V6 _BPX_JOBNAME=${ZOWE_PREFIX}DS1 node --harmony zluxServer.js --config="${CONFIG_FILE}" "$@" 2>&1 | tee $ZLUX_NODE_LOG_FILE
echo "Ended with rc=$?"


# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
