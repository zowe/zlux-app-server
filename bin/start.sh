#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.


# Required variables on shell:
# - ROOT_DIR
# - WORKSPACE_DIR
# - NODE_HOME
#
# Optional variables on shell:
# - APIML_ENABLE_SSO
# - GATEWAY_PORT
# - DISCOVERY_PORT
# - ZWED_SSH_PORT
# - ZWED_TN3270_PORT
# - ZWED_TN3270_SECURITY

convert_v2_to_v1() {
  while read old_name new_name; do
    old_val=$(eval echo "\$${old_name}")
    new_val=$(eval echo "\$${new_name}")
    if [ -z "${old_val}" -a -n "${new_val}" ]; then
      export "${old_name}=${new_val}"
    fi
  done <<EOF
ROOT_DIR ZWE_zowe_runtimeDirectory
ZOWE_PREFIX ZWE_zowe_job_prefix
WORKSPACE_DIR ZWE_zowe_workspaceDirectory
KEYSTORE_DIRECTORY ZWE_zowe_setup_certificate_pkcs12_directory
KEY_ALIAS ZWE_zowe_certificate_keystore_alias
KEYSTORE_PASSWORD ZWE_zowe_certificate_keystore_password
KEYSTORE ZWE_zowe_certificate_keystore_file
KEYSTORE_TYPE ZWE_zowe_certificate_keystore_type
TRUSTSTORE ZWE_zowe_certificate_truststore_file
KEYSTORE_CERTIFICATE_AUTHORITY ZWE_zowe_certificate_truststore_certificateAuthorities
KEYSTORE_CERTIFICATE_AUTHORITY ZWE_zowe_certificate_pem_certificateAuthority
KEYSTORE_CERTIFICATE ZWE_zowe_certificate_pem_certificate
KEYSTORE_KEY ZWE_zowe_certificate_pem_key
VERIFY_CERTIFICATES ZWE_zowe_verifyCertificates
ZWED_node_https_port ZWE_components_app_server_port
ZWED_agent_https_port ZWE_components_zss_port
GATEWAY_PORT ZWE_components_gateway_port
DISCOVERY_PORT ZWE_components_discovery_port
ZOWE_EXPLORER_HOST ZWE_haInstance_hostname
GATEWAY_HOST ZWE_haInstance_hostname
ZWES_SERVER_TLS ZWE_components_zss_tls
ZWED_agent_https_keyring ZWE_zowe_certificate_keystore_file
ZWED_agent_https_password ZWE_zowe_certificate_keystore_password
EOF
}
convert_v2_to_v1

if [ -n "${ROOT_DIR}" ]
then
  #not a dev env

  COMPONENT_HOME=${ROOT_DIR}/components/app-server

  # containers only
  if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
    if [ -f "/component/manifest.yaml" ]; then
      COMPONENT_HOME=/component
    fi
  fi

  cd ${COMPONENT_HOME}/share/zlux-app-server/bin
fi
./app-server.sh
