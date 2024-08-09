#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.


# Required variables on shell:
# - ZWE_zowe_runtimeDirectory
# - ZWE_zowe_workspaceDirectory
# - NODE_HOME

if [ -n "${ZWE_zowe_runtimeDirectory}" ]; then
  # not a dev env
  COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

  # containers only
  if [ "${ZWE_RUN_ON_ZOS}" != "true" ]; then
    if [ -f "/component/manifest.yaml" ]; then
      COMPONENT_HOME=/component
    fi
  fi

  # used for relativeTo plugins
  export ZLUX_ROOT_DIR=$COMPONENT_HOME/share
else
 # dev env
 . ./validate.sh
 COMPONENT_HOME=$(cd ../..; pwd)

  # used for relativeTo plugins
  export ZLUX_ROOT_DIR=$COMPONENT_HOME
fi

ZLUX_APP_SERVER_DIR=${ZLUX_ROOT_DIR}/zlux-app-server
cd ${ZLUX_APP_SERVER_DIR}/bin

. ./init/node-init.sh
. ./utils/setup-logs.sh

# Get config path or fail
if [ -z "${ZWE_CLI_PARAMETER_CONFIG}" ]; then
  echo "ZWE_CLI_PARAMETER_CONFIG is not defined. Only defaults will be used."
  echo "To customize, rerun script with it defined to a list of paths to zowe.yaml files such as ZWE_CLI_PARAMETER_CONFIG=FILE(/yaml1.yaml):FILE(/path/to/yaml2.yaml)"
  echo "FILE items specified on the right of the list will have properties overridden by FILE items on the left of the list, resulting in one merged configuration"
  if [ -e "${HOME}/.zowe/zowe.yaml" ]; then
    echo "Found and using ${HOME}/.zowe/zowe.yaml"
  else
    mkdir -p ${HOME}/.zowe
    cp ${ZLUX_APP_SERVER_DIR}/defaults/serverConfig/defaults.yaml ${HOME}/.zowe/zowe.yaml
  fi
  CONFIG_FILE="FILE(${HOME}/.zowe/zowe.yaml):FILE(${ZLUX_APP_SERVER_DIR}/defaults/serverConfig/defaults.yaml)"
else
  # Note in production, ZWE_CLI_PARAMETER_CONFIG is already a merged file, so no concern about PARMLIB here.
  CONFIG_FILE="FILE(${ZWE_CLI_PARAMETER_CONFIG}):FILE(${ZLUX_APP_SERVER_DIR}/defaults/serverConfig/defaults.yaml)"
fi

if [ -z "${ZWE_zowe_runtimeDirectory}" ]; then
  # dev env or backwards compat, do late configure
  if [ -z "${ZWE_zowe_workspaceDirectory}" ]; then
    export ZWE_zowe_workspaceDirectory="${HOME}/.zowe/workspace"
  fi
  if [ ! -e "${ZWE_zowe_workspaceDirectory}/app-server/plugins/org.zowe.zlux.json}" ]; then
    cd ${ZLUX_APP_SERVER_DIR}/lib
    $NODE_BIN initInstance.js
  fi
fi

if [ -z "$ZLUX_NO_CLUSTER" ]; then
  ZLUX_SERVER_FILE=zluxCluster.js
  export ZLUX_MIN_WORKERS=${ZLUX_MIN_WORKERS:-2}
else
  ZLUX_SERVER_FILE=zluxServer.js
fi

if [ "$ZWE_zowe_verifyCertificates" = "DISABLED" ]; then
  export NODE_TLS_REJECT_UNAUTHORIZED=0
fi

# set production mode if applicable
export NODE_ENV=${NODE_ENV:-production}

echo Show Environment
env

cd ${ZLUX_APP_SERVER_DIR}/lib
echo Starting node

# Tells node whether to prefer ipv4 or ipv6 results to DNS lookups
ZLUX_DNS_ORDER="--dns-result-order=ipv4first"
if [ "$ZWE_components_app_server_dns_lookupOrder" = "ipv6" ]; then
  ZLUX_DNS_ORDER="--dns-result-order=verbatim"
fi

if [ -z "${ZWED_FLAGS}" ]; then
  ZWED_FLAGS="${ZLUX_DNS_ORDER} --harmony "
fi

if [ -z "$ZLUX_NO_LOGFILE" ]; then
    _BPX_JOBNAME=${ZWE_zowe_job_prefix}DS \
    ${NODE_BIN} \
    ${ZWED_FLAGS} \
    ${ZLUX_APP_SERVER_DIR}/lib/${ZLUX_SERVER_FILE} \
    --config="${CONFIG_FILE}" "$@" 2>&1 | tee $ZWED_NODE_LOG_FILE
else
    _BPX_JOBNAME=${ZWE_zowe_job_prefix}DS \
    ${NODE_BIN} \
    ${ZWED_FLAGS} \
    ${ZLUX_APP_SERVER_DIR}/lib/${ZLUX_SERVER_FILE} \
    --config="${CONFIG_FILE}" "$@"
    echo "Ended with rc=$?"
fi
