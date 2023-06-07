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
#
# Optional variables on shell:
# - APIML_ENABLE_SSO
# - GATEWAY_PORT
# - DISCOVERY_PORT
# - ZWED_SSH_PORT
# - ZWED_TN3270_PORT
# - ZWED_TN3270_SECURITY

if [ -z "${ZWE_zowe_runtimeDirectory}" ]
then
 #this may be a dev environment, or backward compat, so stay in current dir and check node
 . ./validate.sh
fi

if [ ! -e "${dir}/utils/convert-env.sh" ]
then
  if [ -n "$CONDA_PREFIX" ]
  then
    dir="$CONDA_PREFIX/share/zowe/app-server/zlux-app-server/bin"
    cd $dir
  fi
fi

. ./utils/convert-env.sh
. ./init/node-init.sh

if [ -e "$ZLUX_CONFIG_FILE" ]
then
    CONFIG_FILE=$ZLUX_CONFIG_FILE
elif [ -e "$ZWE_CLI_PARAMETER_CONFIG" ]
then
  CONFIG_FILE="$ZWE_CLI_PARAMETER_CONFIG"
elif [ -z "${ZWE_zowe_runtimeDirectory}" ]
then
  #dev env or backwards compat, do late configure
  # should we also export ZWE_zowe_workspaceDirectory=~/.zowe/zowe.yaml?
  # potentially zowe.yaml in there could point workspaceDirectory elsewhere to cause further confusion
  cd init
  . ./workspace-init.sh
  cd ..
  CONFIG_FILE=~/.zowe/zowe.yaml
fi

# Will skip log trimming if ZWED_NODE_LOG_FILE already defined (such as by start.sh)
. ./utils/setup-logs.sh

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

export ZWED_NODE_LOG_FILE=$ZWED_NODE_LOG_FILE

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

# Tells node whether to prefer ipv4 or ipv6 results to DNS lookups
ZLUX_DNS_ORDER="--dns-result-order=ipv4first"
if [ "$ZWE_components_app_server_dns_lookupOrder" = "ipv6" ]; then
  ZLUX_DNS_ORDER="--dns-result-order=verbatim"
fi

# not all versions of node support the above (14.18+ generally) so we can just try it to see what happens.
v4_check=$(${NODE_BIN} ${ZLUX_DNS_ORDER} -e "console.log('success');")
if [ "${v4_check}" != "success" ]; then
  ZLUX_DNS_ORDER=
fi

if [ -z "$ZLUX_NO_LOGFILE" ]; then
    __UNTAGGED_READ_MODE=V6 \
    _BPX_JOBNAME=${ZOWE_PREFIX}DS \
    ${NODE_BIN} \
    --harmony \
    ${ZLUX_DNS_ORDER} \
    ${ZOWE_LIB_DIR}/${ZLUX_SERVER_FILE} \
    --config="${CONFIG_FILE}" "$@" 2>&1 | tee $ZWED_NODE_LOG_FILE
else
    __UNTAGGED_READ_MODE=V6 \
    _BPX_JOBNAME=${ZOWE_PREFIX}DS \
    ${NODE_BIN} \
    --harmony \
    ${ZLUX_DNS_ORDER} \
    ${ZOWE_LIB_DIR}/${ZLUX_SERVER_FILE} \
    --config="${CONFIG_FILE}" "$@"
    echo "Ended with rc=$?"
fi


