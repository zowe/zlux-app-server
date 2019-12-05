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
    echo "Usage: $0 AppPath [PluginsDir]"
    exit 1
fi
if [ -n "$NODE_HOME" ]
then
  NODE_BIN=${NODE_HOME}/bin/node
else
  NODE_BIN=node
fi

dir=$(cd `dirname $0` && pwd)
if [ -e "${dir}/../instance.env" ]
then
  . ${dir}/../instance.env
  zlux_path="$ROOT_DIR/components/app-server/share"
elif [ -d "${dir}/../../zlux-server-framework" ]
then
  zlux_path=$(cd $(dirname "$0")/../..; pwd)
elif [ -n "$CONDA_PREFIX" ]
then
  zlux_path="$CONDA_PREFIX/lib/zowe/zlux"
fi

utils_path=$zlux_path/zlux-server-framework/utils
app_path=$(cd "$1"; pwd)
if [ $# -gt 1 ]
then
  plugin_dir=$2
  shift
fi
shift

if [ -z "$plugin_dir" ]
then
  if [ -e "${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json" ]
  then
    json_path=${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json
  else
    json_path=$zlux_path/zlux-app-server/defaults/serverConfig/server.json
  fi
fi


cd $zlux_path/zlux-app-server/bin

if [ -z "$ZLUX_INSTALL_LOG_DIR" ]
then
  if [ -d "${INSTANCE_DIR}/logs" ]
  then
    ZLUX_INSTALL_LOG_DIR="$INSTANCE_DIR/logs"
  fi
fi

PLUGIN_LOG_FILE=/dev/null
if [ ! -z "$ZLUX_INSTALL_LOG_DIR" ]
then
  if [ ! -d "$ZLUX_INSTALL_LOG_DIR" ]
  then
     echo "Will make log directory $ZLUX_INSTALL_LOG_DIR"
     mkdir -p $ZLUX_INSTALL_LOG_DIR
  fi
  PLUGIN_LOG_FILE="$ZLUX_INSTALL_LOG_DIR/install-app.log"
fi


echo "Verifying node exists"
type ${NODE_BIN}
rc=$?
if [ $rc -ne 0 ]
    then
    echo "Node required for installation. Add to PATH and try again"
    exit $rc
fi
echo "Running app-server plugin installer. Log=$PLUGIN_LOG_FILE"
echo "utils_path=${utils_path}\napp_path=${app_path}"
if [ -d "$plugin_dir" ]
then
  echo "plugin_dir=${plugin_dir}"
__UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -p "$plugin_dir" $@ 2>&1 | tee $PLUGIN_LOG_FILE
else
  echo "json_path=${json_path}"
__UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -c "$json_path" $@ 2>&1 | tee $PLUGIN_LOG_FILE
fi
rc=$?
echo "Plugin install completed with rc=${rc}"
exit $rc
