#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

if [ $# -eq 0 ]; then
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
    if [ ! -e "${ZWE_zowe_workspaceDirectory}/app-server/plugins/org.zowe.zlux.json" ]; then
      cd ${zlux_path}/zlux-app-server/lib
      CONFIG_FILE=$ZWE_CLI_PARAMETER_CONFIG $NODE_BIN initInstance.js
    fi
  fi
else
  zlux_path=$(cd $(dirname "$0")/../..; pwd)
  setVars
fi

. ${zlux_path}/zlux-app-server/bin/utils/plugin-utils.sh

#app_path=$(cd "$1"; pwd)
app_path=$1
if [ $# -gt 1 ]; then
  plugin_dir=$2
  shift
else
  plugin_dir=$(getPluginsDir)
fi
shift

if [ -z "$plugin_dir" ]; then
  echo "Error: could not find plugin directory"
  echo "Plugin registration ended with rc=1"
  exit 1
fi
mkdir -p $plugin_dir


# Installs a zowe plugin by finding its ID and writing the locator json WITHOUT using Node.js.
# Used in container mode where Node is not available.
# Note: unlike the Node path, metadata enrichment and recognizer merging are not
# performed here as JSON processing is not available in shell. Recognizer registration
# is skipped entirely; actions are copied as-is without metadata or merge.
# TODO: recognizer registration is not implemented in the container path. Shell-based
# JSON merging is not feasible without external tooling (e.g. jq). A future improvement
# would invoke a minimal Node.js script for this step if Node becomes available in containers.
installNojs() {
  id=$(getPluginID "${app_path}")
  if [ -n "${id}" ]; then
    echo "Found plugin=${id}"

cat <<EOF >${plugin_dir}/${id}.json
{
  "identifier": "${id}",
  "pluginLocation": "${app_path}"
}
EOF

    echo "Plugin registration ended with rc=$?"
    if [ -f "${plugin_dir}/${id}.json" ]; then
      chmod 0771 "${plugin_dir}/${id}.json"
    fi

    # Copy app2app actions and recognizers to desktop plugin storages
    CONTAINER_INSTANCE_DIR="${ZWED_instanceDir:-${ZWE_zowe_workspaceDirectory}/app-server}"
    if [ -n "${CONTAINER_INSTANCE_DIR}" ]; then
      for desktop_plugin in ng2desktop ivydesktop; do
        if [ -f "${app_path}/config/actions/${id}" ]; then
          actions_dir="${CONTAINER_INSTANCE_DIR}/ZLUX/pluginStorage/org.zowe.zlux.${desktop_plugin}/actions"
          mkdir -p "${actions_dir}"
          cp "${app_path}/config/actions/${id}" "${actions_dir}/${id}"
        fi
      done
    else
      echo "Warning: could not determine instance directory, skipping app2app registration"
    fi
    # TODO: recognizer registration is not performed in container mode (see comment above)
    if [ -d "${app_path}/config/recognizers" ]; then
      echo "Warning: plugin ${id} contains recognizers but recognizer registration is not supported in container mode. Recognizers will not be active until the server is restarted in a non-container environment."
    fi
  else
    echo "Error: could not find plugin id for path=${app_path}"
    exit 1
  fi
}


if [ -n "$ZLUX_CONTAINER_MODE" ]; then
  installNojs
else
  echo "Testing if node exists"
  type ${NODE_BIN}
  if [ $? -ne 0 ]; then
    echo "Error: node not found, cannot register plugin"
    echo "Plugin registration ended with rc=1"
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
    PLUGIN_NICKNAME=$(basename "$app_path")
    PLUGIN_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    PLUGIN_LOG_FILE="$ZLUX_INSTALL_LOG_DIR/install-app-${PLUGIN_NICKNAME}-${PLUGIN_TIMESTAMP}.log"
  fi

  echo "Running app-server plugin registration. Log=$PLUGIN_LOG_FILE"
  echo "app_path=${app_path}"
  echo "plugin_dir=${plugin_dir}"
  { ${NODE_BIN} ${zlux_path}/zlux-app-server/lib/install-app.js -i "$app_path" -p "$plugin_dir" $@ 2>&1 ; echo "Plugin registration ended with rc=$?" ; } | tee -a $PLUGIN_LOG_FILE
fi
