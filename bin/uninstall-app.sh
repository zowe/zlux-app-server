#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

if [ $# -eq 0 ]; then
  echo "Usage: $0 AppID|AppPath [PluginsDir]"
  exit 1
fi

setVars() {
  export _CEE_RUNOPTS="FILETAG(AUTOCVT,AUTOTAG) POSIX(ON)"
  export _EDC_ADD_ERRNO2=1                        # show details on error
  unset ENV             # just in case, as it can cause unexpected output
  umask 0002                                       # similar to chmod 755
  . ${zlux_path}/zlux-app-server/bin/init/node-init.sh
}

if [ -n "${ZWE_zowe_workspaceDirectory}" -a -n "${ZWE_zowe_runtimeDirectory}" ]; then
  COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

  # containers only
  if [ "${ZWE_RUN_ON_ZOS}" != "true" ]; then
    if [ -f "/component/manifest.yaml" -o -f "/component/manifest.json" -o -f "/component/manifest.yml" ]; then
      COMPONENT_HOME=/component
      ZLUX_CONTAINER_MODE=1
    fi
    if [ ! -d "${COMPONENT_HOME}/share/zlux-app-server" ]; then
      COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server
    fi
  fi
  zlux_path="$COMPONENT_HOME/share"

  if [ -z "$ZLUX_CONTAINER_MODE" ]; then
    setVars
  fi
else
  zlux_path=$(cd $(dirname "$0")/../..; pwd)
  setVars
fi

. ${zlux_path}/zlux-app-server/bin/utils/plugin-utils.sh

app_input=$1
if [ $# -gt 1 ]; then
  plugin_dir=$2
  shift
else
  plugin_dir=$(getPluginsDir)
fi
shift

if [ -z "$plugin_dir" ]; then
  echo "Error: could not find plugin directory"
  echo "Plugin deregistration ended with rc=1"
  exit 1
fi


# Deregisters a zowe plugin by removing its locator JSON WITHOUT using Node.js.
# Used in container mode where Node is not available.
uninstallNojs() {
  # Determine identifier: if a directory was given, extract from pluginDefinition.json;
  # otherwise treat the argument as a bare identifier.
  if [ -d "${app_input}" ]; then
    id=$(getPluginID "${app_input}")
    if [ -z "${id}" ]; then
      echo "Error: could not find plugin id for path=${app_input}"
      echo "Plugin deregistration ended with rc=1"
      exit 1
    fi
  else
    id="${app_input}"
  fi

  echo "Deregistering plugin=${id}"
  if [ -e "${plugin_dir}/${id}.json" ]; then
    rm "${plugin_dir}/${id}.json"
    echo "Plugin deregistration ended with rc=$?"
  else
    echo "Plugin pointer ${plugin_dir}/${id}.json not found, nothing to remove"
    echo "Plugin deregistration ended with rc=0"
  fi

  # Remove app2app actions from desktop plugin storages
  # TODO: recognizer deregistration not yet implemented (matches initUtils deregisterApp2App TODO)
  CONTAINER_INSTANCE_DIR="${ZWED_instanceDir:-${ZWE_zowe_workspaceDirectory}/app-server}"
  if [ -n "${CONTAINER_INSTANCE_DIR}" ]; then
    for desktop_plugin in ng2desktop ivydesktop; do
      actions_file="${CONTAINER_INSTANCE_DIR}/ZLUX/pluginStorage/org.zowe.zlux.${desktop_plugin}/actions/${id}"
      if [ -f "${actions_file}" ]; then
        rm "${actions_file}"
      fi
    done
  else
    echo "Warning: could not determine instance directory, skipping app2app deregistration"
  fi
}


if [ -n "$ZLUX_CONTAINER_MODE" ]; then
  uninstallNojs
else
  echo "Testing if node exists"
  type ${NODE_BIN}
  if [ $? -ne 0 ]; then
    echo "Error: node not found, cannot deregister plugin"
    echo "Plugin deregistration ended with rc=1"
    exit 1
  fi

  # normal case follows
  if [ -z "$ZLUX_INSTALL_LOG_DIR" ]; then
    if [ -d "${ZWE_zowe_logDirectory}" ]; then
      ZLUX_INSTALL_LOG_DIR="$ZWE_zowe_logDirectory"
    fi
  fi

  PLUGIN_LOG_FILE=/dev/null
  if [ ! -z "$ZLUX_INSTALL_LOG_DIR" ]; then
    if [ ! -d "$ZLUX_INSTALL_LOG_DIR" ]; then
      echo "Will make log directory $ZLUX_INSTALL_LOG_DIR"
      mkdir -p $ZLUX_INSTALL_LOG_DIR
    fi
    PLUGIN_NICKNAME=$(basename "$app_input")
    PLUGIN_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    PLUGIN_LOG_FILE="$ZLUX_INSTALL_LOG_DIR/uninstall-app-${PLUGIN_NICKNAME}-${PLUGIN_TIMESTAMP}.log"
  fi

  echo "Running app-server plugin deregistration. Log=$PLUGIN_LOG_FILE"
  echo "app_input=${app_input}"
  echo "plugin_dir=${plugin_dir}"
  { ${NODE_BIN} ${zlux_path}/zlux-app-server/lib/uninstall-app.js -i "$app_input" -p "$plugin_dir" $@ 2>&1 ; echo "Plugin deregistration ended with rc=$?" ; } | tee -a $PLUGIN_LOG_FILE
fi

