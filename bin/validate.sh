#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

if [ "${ZWE_RUN_ON_ZOS}" = "true" ]; then
  if [ "${ZWED_SKIP_VALIDATE_CERT}" = "true"]; then
    exit 0
  else
    cert_type=$ZWE_zowe_certificate_keystore_type
    cert_file=$ZWE_zowe_certificate_keystore_file
    cert_alias=$ZWE_zowe_certificate_keystore_alias
    eku=

    if [ "${ZWE_components_gateway_enabled}" = "true" ]; then
      eku=" -e"  
    elif [ "${ZWE_components_discovery_enabled}" = "true" ]; then
      eku=" -e"
    fi

    COMPONENT_HOME=${ZWE_zowe_runtimeDirectory}/components/app-server

    cd ${COMPONENT_HOME}/share/zlux-app-server/bin
    . ./init/node-init.sh
    cd ${COMPONENT_HOME}/share/zlux-server-framework/utils
    $NODE_BIN certificateChecker -c "${cert_file}" -t "${cert_type}" -a "${cert_alias}"${eku}
  fi
fi
