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
  . ${zlux_path}/zlux-app-server/bin/init/node-init.sh
}
echo "**** install-app.sh stderr ****" >&2
echo "**** install-app.sh stdout ****"

dir=$(cd `dirname $0` && pwd)
. ${dir}/utils/plugin-utils.sh
. ${dir}/utils/convert-env.sh

if [ -n "${ZWE_zowe_workspaceDirectory}" -a -n "${ZWE_zowe_runtimeDirectory}" ]
then
  COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

  # containers only
  if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
    if [ -f "/component/manifest.yaml" -o -f "/component/manifest.json" -o -f "/component/manifest.yml" ]; then
      COMPONENT_HOME=/component
      ZLUX_CONTAINER_MODE=1
      #INSTALL_NO_NODE=1  
    fi
  fi

  if [ -z "$INSTALL_NO_NODE" ]; then
    zlux_path="$COMPONENT_HOME/share"
    echo "**** INSTALL_NO_NODE=$INSTALL_NO_NODE zlux_path=$zlux_path" >&2
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

echo "**** utils_path=$utils_path app_path=$app_path" >&2

if [ $# -gt 1 ]
then
  echo "**** plugin_dir 1" >&2
  plugin_dir=$2
  shift
else
  echo "**** plugin_dir 2" >&2
  plugin_dir=$(getPluginsDir)
fi
shift

if [ -z "$plugin_dir" ]; then
  echo "Error: could not find plugin directory"
  echo "Plugin registration ended with rc=1"
  exit 1
fi
echo "**** plugin_dir=$plugin_dir" >&2

mkdir -p $plugin_dir

# Installs a zowe plugin by finding its ID and writing the locator json WITHOUT using install-app.js
# This is to be used in cases where there are issues using JS, or nodejs is not found.
# Input: relative or fully qualified path to a directory containing a plugindir=$(cd `dirname $0` && pwd)
installNojs() {
  echo "**** inside installNojs" >&2

  id=$(getPluginID "${app_path}")
  if [ -n "${id}" ]
  then
    echo "Found plugin=${id}"
    echo "**** id=$id" >&2
    ls ${plugin_dir} >&2
cat <<EOF >${plugin_dir}/${id}.json
{
  "identifier": "${id}",
  "pluginLocation": "${app_path}"
}
EOF
    echo "Plugin registration ended with rc=$?" >&2
    chmod 0750 "${plugin_dir}/${id}.json"
  else
      echo "Error: could not find plugin id for path=${app_path}"
      exit 1
  fi
}

if [ -n "$INSTALL_NO_NODE" ]
then
 echo "**** INSTALL_NO_NODE1=$INSTALL_NO_NODE" >&2
 installNojs
else  
  cd $zlux_path/zlux-app-server/bin

  echo "Testing if node exists"
  type ${NODE_BIN}
  rc=$?
  if [ $rc -ne 0 ]
  then
    echo "**** INSTALL_NO_NODE2" >&2
    installNojs
  else
# normal case follows
echo "**** Normal case" >&2

if [ -z "$ZLUX_INSTALL_LOG_DIR" ]
then
  if [ -d "${ZWE_zowe_logDirectory}" ]
  then
    ZLUX_INSTALL_LOG_DIR="$ZWE_zowe_logDirectory"
  fi
fi
echo "**** ZLUX_INSTALL_LOG_DIR=$ZLUX_INSTALL_LOG_DIR" >&2

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

echo "**** PLUGIN_LOG_FILE=$PLUGIN_LOG_FILE" >&2

echo "Running app-server plugin registration. Log=$PLUGIN_LOG_FILE"
echo "utils_path=${utils_path}\napp_path=${app_path}"
echo "plugin_dir=${plugin_dir}"
{ __UNTAGGED_READ_MODE=V6 ${NODE_BIN} ${utils_path}/install-app.js -i "$app_path" -p "$plugin_dir" $@ 2>&1 ; echo "Plugin registration ended with rc=$?" ; } | tee -a $PLUGIN_LOG_FILE
fi
fi
