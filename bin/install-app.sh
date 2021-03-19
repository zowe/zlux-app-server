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

setVars() {
  export _CEE_RUNOPTS="FILETAG(AUTOCVT,AUTOTAG) POSIX(ON)"
  export _EDC_ADD_ERRNO2=1                        # show details on error
  unset ENV             # just in case, as it can cause unexpected output
  umask 0002                                       # similar to chmod 755
  . ${zlux_path}/zlux-app-server/bin/internal-node-init.sh
}

dir=$(cd `dirname $0` && pwd)
if [ -e "${dir}/internal/read-essential-vars.sh" -o -e "${dir}/../instance.env" ]
then
  if [ -z "$INSTANCE_DIR" ]
  then
     export INSTANCE_DIR=$(cd "${dir}/.." && pwd)
  fi
  if [ -e "${dir}/internal/read-essential-vars.sh" ]
  then
    # this function will load proper environment from either instance.env or zowe.yaml
    . ${dir}/internal/read-essential-vars.sh
  elif [ -e "${dir}/../instance.env" ]
  then
    . "${dir}/../instance.env"
  fi
  zlux_path="$ROOT_DIR/components/app-server/share"
  setVars
  if [ ! -e "${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json" ]
  then
    cd ${zlux_path}/zlux-app-server/lib
    __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
  fi
elif [ -d "${dir}/../../zlux-server-framework" ]
then
  zlux_path=$(cd $(dirname "$0")/../..; pwd)
  setVars
elif [ -n "$CONDA_PREFIX" ]
then
  zlux_path="$CONDA_PREFIX/share/zowe/app-server"
  setVars
fi

utils_path=$zlux_path/zlux-server-framework/utils
app_path=$(cd "$1"; pwd)
if [ $# -gt 1 ]
then
  plugin_dir=$2
  mkdir -p $plugin_dir
  shift
fi
shift

if [ -z "$plugin_dir" ]
then
  if [ -e "${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json" ]
  then
    json_path=${INSTANCE_DIR}/workspace/app-server/serverConfig/server.json
    fallback_inst=${INSTANCE_DIR}  
  elif [ -e "${HOME}/.zowe/workspace/app-server/serverConfig/server.json" ]
  then
    json_path=${HOME}/.zowe/workspace/app-server/serverConfig/server.json
    fallback_inst=${HOME}/.zowe  
  elif [ -e "../deploy/instance/ZLUX/serverConfig/zluxserver.json" ]
  then
    echo "WARNING: Using old configuration present in ${dir}/../deploy\n\
This configuration should be migrated for use with future versions. See documentation for more information.\n"
    json_path="../deploy/instance/ZLUX/serverConfig/zluxserver.json"
  else
    json_path=$zlux_path/zlux-app-server/defaults/serverConfig/server.json
  fi
fi


cd $zlux_path/zlux-app-server/bin

installNojs() {
 echo "NodeJS not found or not requested, attempting fallback plugin install behavior"
  # Installs a zowe plugin by finding its ID and writing the locator json WITHOUT using install-app.js
  # This is to be used in cases where there are issues using JS, or nodejs is not found.
  # Input: relative or fully qualified path to a directory containing a plugindir=$(cd `dirname $0` && pwd)
  #
  # a little bit of node
  # id=`node -e "const fs=require('fs'); const content=require('${app_path}/pluginDefinition.json'); console.log(content.identifier);"`
  #
  # works with gnu sed
  # id=`sed -nE '/identifier/{s/.*:\s*"(.*)",/\1/p;q}' ${app_path}/pluginDefinition.json`
  #
  # works with posix sed
  id=`grep "identifier" ${app_path}/pluginDefinition.json |  sed -e 's/"//g' | sed -e 's/.*: *//g' | sed -e 's/,.*//g'`

  if [ -n "${id}" ]
  then
    echo "Found plugin=${id}"

cat <<EOF >${fallback_inst}/workspace/app-server/plugins/${id}.json
{
  "identifier": "${id}",
  "pluginLocation": "${app_path}"
}
EOF
  echo "Ended with rc=$?"
  else
      echo "Error: could not find plugin id for path=${app_path}"
      exit 1
  fi
}

if [ -n "$INSTALL_NO_NODE" ]
then
 installNojs
else  
  echo "Testing if node exists"
  type ${NODE_BIN}
  rc=$?
  if [ $rc -ne 0 ]
  then
    installNojs
  else
# normal case follows
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


echo "Running app-server plugin installer. Log=$PLUGIN_LOG_FILE"
echo "utils_path=${utils_path}\napp_path=${app_path}"
if [ -d "$plugin_dir" ]
then
  echo "plugin_dir=${plugin_dir}"
{ __UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -p "$plugin_dir" $@ 2>&1 ; echo "Ended with rc=$?" ; } | tee $PLUGIN_LOG_FILE
else
  echo "json_path=${json_path}"
{ __UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -c "$json_path" $@ 2>&1 ; echo "Ended with rc=$?" ; } | tee $PLUGIN_LOG_FILE
fi

fi
fi
