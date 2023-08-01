#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

if [ -n "$ZWED_NODE_LOG_FILE" ]
then
  if [ -n "$ZWED_NODE_LOG_DIR" ]
  then
    echo "ZWED_NODE_LOG_FILE set (value $ZWED_NODE_LOG_FILE).  Ignoring ZWED_NODE_LOG_DIR."
  fi
else
  # _FILE was not specified; default filename, and check and maybe default _DIR
  if [ -z "$ZWED_NODE_LOG_DIR" ]
  then
    if [ -d "$ZWE_zowe_logDirectory" ]
    then
        ZWED_NODE_LOG_DIR=${ZWE_zowe_logDirectory}
    elif [ -n "${HOME}" ]; then
      ZWED_NODE_LOG_DIR="${HOME}/.zowe/logs"  
    else
      ZWED_NODE_LOG_DIR="../log"
    fi
  fi
  
  if [ -f "$ZWED_NODE_LOG_DIR" ]
  then
    ZWED_NODE_LOG_FILE=$ZWED_NODE_LOG_DIR
  elif [ ! -d "$ZWED_NODE_LOG_DIR" ]
  then
    echo "Will make log directory $ZWED_NODE_LOG_DIR"
    mkdir -p $ZWED_NODE_LOG_DIR
    if [ $? -ne 0 ]
    then
      echo "Cannot make log directory.  Logging disabled."
      ZWED_NODE_LOG_FILE=/dev/null
    fi
  fi
  
  ZLUX_ROTATE_LOGS=0
  if [ -d "$ZWED_NODE_LOG_DIR" ] && [ -z "$ZWED_NODE_LOG_FILE" ]
  then
    ZWED_NODE_LOG_FILE="$ZWED_NODE_LOG_DIR/appServer-`date +%Y-%m-%d-%H-%M`.log"
    if [ -z "$ZWED_NODE_LOGS_TO_KEEP" ]
    then
      ZWED_NODE_LOGS_TO_KEEP=5
    fi
    echo $ZWED_NODE_LOGS_TO_KEEP|egrep '^\-?[0-9]+$' >/dev/null
    if [ $? -ne 0 ]
    then
      echo "ZWED_NODE_LOGS_TO_KEEP not a number.  Defaulting to 5."
      ZWED_NODE_LOGS_TO_KEEP=5
    fi
    if [ $ZWED_NODE_LOGS_TO_KEEP -ge 0 ]
    then
      ZLUX_ROTATE_LOGS=1
    fi 
  fi
  
  #Clean up excess logs, if appropriate.
  if [ $ZLUX_ROTATE_LOGS -ne 0 ]
  then
    for f in `ls -r -1 $ZWED_NODE_LOG_DIR/appServer-*.log 2>/dev/null | tail +$ZWED_NODE_LOGS_TO_KEEP`
    do
      echo nodeServer.sh removing $f
      rm -f $f
    done
  fi
fi

ZLUX_NODE_CHECK_DIR="$(dirname "$ZWED_NODE_LOG_FILE")"
if [ ! -d "$ZLUX_NODE_CHECK_DIR" ]
then
  echo "ZWED_NODE_LOG_FILE contains nonexistent directories.  Creating $ZLUX_NODE_CHECK_DIR"
  mkdir -p $ZLUX_NODE_CHECK_DIR
  if [ $? -ne 0 ]
  then
    echo "Cannot make log directory.  Logging disabled."
    ZWED_NODE_LOG_FILE=/dev/null
  fi
fi
#Now sanitize final log filename: if it is relative, make it absolute before cd to js
if [ "$ZWED_NODE_LOG_FILE" != "/dev/null" ]
then
  ZLUX_NODE_CHECK_DIR=$(cd "$(dirname "$ZWED_NODE_LOG_FILE")"; pwd)
  ZWED_NODE_LOG_FILE=$ZLUX_NODE_CHECK_DIR/$(basename "$ZWED_NODE_LOG_FILE")
fi


echo ZWED_NODE_LOG_FILE=${ZWED_NODE_LOG_FILE}

if [ ! -e $ZWED_NODE_LOG_FILE ]
then
  touch $ZWED_NODE_LOG_FILE
  if [ $? -ne 0 ]
  then
    echo "Cannot make log file.  Logging disabled."
    ZWED_NODE_LOG_FILE=/dev/null
  fi
else
  if [ -d $ZWED_NODE_LOG_FILE ]
  then
    echo "ZWED_NODE_LOG_FILE is a directory.  Must be a file.  Logging disabled."
    ZWED_NODE_LOG_FILE=/dev/null
  fi
fi

if [ ! -w "$ZWED_NODE_LOG_FILE" ]
then
  echo file "$ZWED_NODE_LOG_FILE" is not writable. Logging disabled.
  ZWED_NODE_LOG_FILE=/dev/null
fi

export ZWED_NODE_LOG_FILE
