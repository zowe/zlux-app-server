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
if [ -n "${ZWE_zowe_workspaceDirectory}" -a -n "${ZWE_zowe_runtimeDirectory}" ]
then
  COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

  # containers only
  if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
    # these files may exist in other containers where this script is run from, rather than just zlux
    if [ -f "/component/manifest.yaml" -o -f "/component/manifest.json" -o -f "/component/manifest.yml" ]; then
      COMPONENT_HOME=/component
      ZLUX_CONTAINER_MODE=1  
      INSTALL_NO_NODE=1  
    fi
  fi

  if [ -z "$INSTALL_NO_NODE" ]; then
    zlux_path="$COMPONENT_HOME/share"
    setVars
    if [ ! -d "${ZWE_zowe_workspaceDirectory}/app-server" ]
    then
      cd ${zlux_path}/zlux-app-server/lib
      __UNTAGGED_READ_MODE=V6 $NODE_BIN initInstance.js
    fi
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

if [ -z "$plugin_dir" ]; then
  if [ "$ZLUX_CONTAINER_MODE" = "1" ]; then
    #container, plugins folder in fixed location
  elif [ -d "${ZWE_zowe_workspaceDirectory}/app-server/plugins}" ]; then
    plugin_dir="${ZWE_zowe_workspaceDirectory}/app-server/plugins}"
  elif [ -e "${ZWE_zowe_workspaceDirectory}/app-server/serverConfig/zowe.yaml" ]; then
    yaml_path=${ZWE_zowe_workspaceDirectory}/app-server/serverConfig/zowe.yaml  
  elif [ -e "${HOME}/.zowe/workspace/app-server/serverConfig/zowe.yaml" ]; then
    if [ -z "${ZWE_zowe_workspaceDirectory}" ]; then
      ZWE_zowe_workspaceDirectory=${HOME}/.zowe/workspace
    fi
    yaml_path=${ZWE_zowe_workspaceDirectory}/app-server/serverConfig/zowe.yaml
  else
    yaml_path=$zlux_path/zlux-app-server/defaults/serverConfig/zowe.yaml
  fi
fi


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

    if [ "$ZLUX_CONTAINER_MODE" = "1" ]
    then
      # install script expected to copy the plugin into this location. could be done manually too.
      app_path=${ZWE_zowe_workspaceDirectory}/app-server/pluginDirs/${id}
    fi

cat <<EOF >${ZWE_zowe_workspaceDirectory}/app-server/plugins/${id}.json
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
  cd $zlux_path/zlux-app-server/bin

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
  if [ -d "${ZWE_zowe_logDirectory}" ]
  then
    ZLUX_INSTALL_LOG_DIR="$ZWE_zowe_logDirectory"
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
{ __UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -p "$plugin_dir" $@ 2>&1 ; echo "Ended with rc=$?" ; } | tee -a $PLUGIN_LOG_FILE
else
  echo "yaml_path=${yaml_path}"
{ __UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -c "$yaml_path" $@ 2>&1 ; echo "Ended with rc=$?" ; } | tee -a $PLUGIN_LOG_FILE
fi

fi
fi
