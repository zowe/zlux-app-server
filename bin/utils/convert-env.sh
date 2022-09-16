#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project.

OSNAME=$(uname)

convert_v2_to_v1() {
  while read old_name new_name; do
    old_val=$(eval echo "\$${old_name}")
    new_val=$(eval echo "\$${new_name}")
    if [ -z "${old_val}" -a -n "${new_val}" ]; then
      export "${old_name}=${new_val}"
    fi
  done <<EOF
CATALOG_PORT ZWE_components_api_catalog_port 
DISCOVERY_PORT ZWE_components_discovery_port
GATEWAY_HOST ZWE_haInstance_hostname
GATEWAY_PORT ZWE_components_gateway_port
KEY_ALIAS ZWE_zowe_certificate_keystore_alias
KEYSTORE ZWE_zowe_certificate_keystore_file
KEYSTORE_CERTIFICATE ZWE_zowe_certificate_pem_certificate
KEYSTORE_CERTIFICATE_AUTHORITY ZWE_zowe_certificate_pem_certificateAuthority
KEYSTORE_CERTIFICATE_AUTHORITY ZWE_zowe_certificate_pem_certificateAuthorities
KEYSTORE_DIRECTORY ZWE_zowe_setup_certificate_pkcs12_directory
KEYSTORE_KEY ZWE_zowe_certificate_pem_key
KEYSTORE_PASSWORD ZWE_zowe_certificate_keystore_password
KEYSTORE_TYPE ZWE_zowe_certificate_keystore_type
ROOT_DIR ZWE_zowe_runtimeDirectory
TRUSTSTORE ZWE_zowe_certificate_truststore_file
VERIFY_CERTIFICATES ZWE_zowe_verifyCertificates
WORKSPACE_DIR ZWE_zowe_workspaceDirectory
ZOWE_EXPLORER_HOST ZWE_haInstance_hostname
ZOWE_PREFIX ZWE_zowe_job_prefix
ZOWE_ZLUX_SERVER_HTTPS_PORT ZWE_components_app_server_port
ZOWE_ZSS_XMEM_SERVER_NAME ZWE_components_zss_crossMemoryServerName
ZWED_node_https_port ZWE_components_app_server_port
ZWES_SERVER_PORT ZWE_components_zss_port
ZWES_SERVER_TLS ZWE_components_zss_tls
ZWES_ZIS_LOADLIB ZWE_zowe_setup_mvs_authLoadlib
ZWES_ZIS_PLUGINLIB ZWE_zowe_setup_mvs_authPluginLib
ZWES_ZIS_PARMLIB ZWE_zowe_setup_mvs_parmlib
EOF
}
convert_v2_to_v1

export ZWES_ZIS_PARMLIB_MEMBER="ZWESIP00"




# For backwards compatible behavior
if [ -n "$ZWE_zowe_rbacProfileIdentifier" ]
then
  export ZWED_instanceID=$ZWE_zowe_rbacProfileIdentifier
fi

if [ -n "$ZWE_zowe_cookieIdentifier" ]
then
  export ZWED_cookieIdentifier=$ZWE_zowe_cookieIdentifier
fi

# shape old env vars into app-server compatible ones
# mediation layer
if [ -z "$ZWED_node_mediationLayer_server_gatewayPort" ]
then
  if [ -n "$GATEWAY_PORT" ]
  then
    export ZWED_node_mediationLayer_server_gatewayPort=$GATEWAY_PORT
  fi
fi

if [ -z "$ZWED_node_mediationLayer_server_port" ]
then
  if [ -n "$DISCOVERY_PORT" ]
  then
    export ZWED_node_mediationLayer_server_port=$DISCOVERY_PORT
  fi
fi

if [ -z "$ZWED_node_mediationLayer_server_hostname" ]; then
  if [ -n "$GATEWAY_HOST" ]; then
    export ZWED_node_mediationLayer_server_hostname=$GATEWAY_HOST
  elif [ -n "$ZOWE_EXPLORER_HOST" ]; then
    export ZWED_node_mediationLayer_server_hostname=$ZOWE_EXPLORER_HOST
  fi
fi

if [ -n "$ZWED_node_mediationLayer_server_port" -a -n "$ZWED_node_mediationLayer_server_hostname" ]; then
  if [ "${ZWE_components_gateway_enabled}" = "true" ]; then
    export ZWED_node_mediationLayer_enabled="true"
  fi
fi

if [ -z "$ZWED_node_mediationLayer_enabled" ]; then
  export ZWED_node_mediationLayer_enabled="false"
elif [ -z "$ZWED_agent_mediationLayer_enabled" ]; then
  if [[ "${OSNAME}" == "OS/390" ]]; then
    export ZWED_agent_mediationLayer_enabled="true";
  else
    zss_def_template="zss.apiml_static_reg.yaml.template"
    zss_configured=false
    if [ -n "${ZWED_agent_https_port}" ]; then
      export ZSS_PORT="${ZWED_agent_https_port}"
      export ZSS_PROTOCOL=https
      zss_configured=true
    elif [ -n "${ZWED_agent_http_port}" ]; then 
      export ZSS_PORT="${ZWED_agent_http_port}"
      export ZSS_PROTOCOL=http
      zss_configured=true
    fi

    if [ "${zss_configured}" = "true" ] && [ -n "${STATIC_DEF_CONFIG_DIR}" ]; then
      zss_registration_yaml=${STATIC_DEF_CONFIG_DIR}/zss.apiml_static_reg_yaml_template.${ZWELS_HA_INSTANCE_ID}.yml
      zss_def="../../${zss_def_template}"
      zss_parsed_def=$( ( echo "cat <<EOF" ; cat "${zss_def}" ; echo ; echo EOF ) | sh 2>&1)
      echo "${zss_parsed_def}" > "${zss_registration_yaml}"
      chmod 770 "${zss_registration_yaml}"
      export ZWED_agent_mediationLayer_enabled="true"
    else
      export ZWED_agent_mediationLayer_enabled="false"
    fi
  
    unset ZSS_PORT
    unset ZSS_PROTOCOL
  fi
fi

# Check if Caching Service is enabled
if [ "$ZWED_node_mediationLayer_enabled" = "true" -a "${ZWE_components_caching_service_enabled}" = "true" ]; then
  export ZWED_node_mediationLayer_cachingService_enabled="true"
fi

# eureka hostname handling
if [ -z "$ZWED_node_hostname" ]; then
  if [ -n "$ZWE_INTERNAL_HOST" ]; then
    export ZWED_node_hostname=$ZWE_INTERNAL_HOST
  elif [ -n "$ZOWE_EXPLORER_HOST" ]; then
    export ZWED_node_hostname=$ZOWE_EXPLORER_HOST
  fi
fi

if [ -n "$ZOWE_LOOPBACK_ADDRESS" ]
then
  if [ -n "$ZOWE_IP_ADDRESS" ]
  then
    if [ "$BIND_TO_LOOPBACK" = "true" ]
    then
      export ZWED_node_https_ipAddresses="${ZOWE_LOOPBACK_ADDRESS},${ZOWE_IP_ADDRESS}",
    fi
  fi
  export ZWED_node_loopbackAddress=$ZOWE_LOOPBACK_ADDRESS
fi

if [ -z "$ZWED_node_https_ipAddresses" ]
then
  if [ -n "$ZOWE_IP_ADDRESS" ]
    then
      export ZWED_node_https_ipAddresses="${ZOWE_IP_ADDRESS}",
  fi
fi

# certificates
if [ "$ZWE_zowe_verifyCertificates" = "DISABLED" ]; then
  export ZWED_node_allowInvalidTLSProxy=true
  export NODE_TLS_REJECT_UNAUTHORIZED=0
fi

if [ -z "$ZWED_node_https_certificates" ]
then
  if [ "$KEYSTORE_TYPE" = "JCERACFKS" ]
  then
    #, at end turns it into an array
    export ZWED_node_https_certificates="${KEYSTORE}&${KEY_ALIAS}",
  elif [ -n "$KEYSTORE_CERTIFICATE" ]
  then
    #, at end turns it into an array
    export ZWED_node_https_certificates=$KEYSTORE_CERTIFICATE,
  fi
fi

if [ -z "$ZWED_node_https_certificateAuthorities" ]
then
  if [ "$KEYSTORE_TYPE" = "JCERACFKS" ]
  then
    #, at end turns it into an array
    if [ -n "$EXTERNAL_ROOT_CA" ]
    then
      export ZWED_node_https_certificateAuthorities="${ZWE_zowe_certificate_pem_certificateAuthorities}","${TRUSTSTORE}&${EXTERNAL_ROOT_CA}"
    else
      export ZWED_node_https_certificateAuthorities="${ZWE_zowe_certificate_pem_certificateAuthorities}",
    fi
  elif [ -n "$KEYSTORE_CERTIFICATE_AUTHORITY" ]
  then
    #, at end turns it into an array
    if [ -n "$EXTERNAL_CERTIFICATE_AUTHORITIES" ]
    then
      export ZWED_node_https_certificateAuthorities=${KEYSTORE_CERTIFICATE_AUTHORITY},${EXTERNAL_ROOT_CA},$(echo "$EXTERNAL_CERTIFICATE_AUTHORITIES" | tr " " ",")
    else
      export ZWED_node_https_certificateAuthorities=${KEYSTORE_CERTIFICATE_AUTHORITY},${EXTERNAL_ROOT_CA},
    fi
  fi
fi

if [ -z "$ZWED_node_https_keys" ]
then
  if [ "$KEYSTORE_TYPE" = "JCERACFKS" ]
  then
    #, at end turns it into an array
    export ZWED_node_https_keys="${KEYSTORE}&${KEY_ALIAS}",
  elif [ -n "$KEYSTORE_KEY" ]
  then
    #, at end turns it into an array
    export ZWED_node_https_keys=$KEYSTORE_KEY,
  fi
fi

#SSO
if [ -z "$ZWED_agent_jwt_fallback" ]
then
  if [ -n "$SSO_FALLBACK_TO_NATIVE_AUTH" ]
  then
    export ZWED_agent_jwt_fallback=$SSO_FALLBACK_TO_NATIVE_AUTH
  fi
fi

# app server
if [ -z "$ZWED_SERVER_HTTPS_PORT" -a -n "$ZOWE_ZLUX_SERVER_HTTPS_PORT" ]
then
  export ZWED_SERVER_HTTPS_PORT="${ZOWE_ZLUX_SERVER_HTTPS_PORT}"
fi
if [ -z "$ZWED_node_https_port" ] 
then
  if [ -n "$ZWED_SERVER_HTTPS_PORT" ]
  then
    export ZWED_node_https_port=$ZWED_SERVER_HTTPS_PORT
  fi
fi
if [ -z "$ZWED_productDir" ]
then
  if [ -n "$ROOT_DIR" ]
  then
    COMPONENT_HOME=${ROOT_DIR}/components/app-server

    # containers only
    if [ "${ZWE_RUN_ON_ZOS}" != "true" ]; then
      if [ -f "/component/manifest.yaml" ]; then
        COMPONENT_HOME=/component
        if [ -z "$ZWED_node_pluginScanIntervalSec" ]; then  
          # container needs plugin scanning logic on  
          export ZWED_node_pluginScanIntervalSec=60
        fi
      fi
    fi    
    export ZWED_productDir=$COMPONENT_HOME/share/zlux-app-server/defaults
  fi
fi

# v2 alias mapping
if [ -z "$ZWED_NODE_LOG_FILE" -a -n "$ZLUX_NODE_LOG_FILE" ]
then
  export ZWED_NODE_LOG_FILE="${ZLUX_NODE_LOG_FILE}"
fi
if [ -z "$ZWED_NODE_LOG_DIR" -a -n "$ZLUX_NODE_LOG_DIR" ]
then
  export ZWED_NODE_LOG_DIR="${ZLUX_NODE_LOG_DIR}"
fi
if [ -z "$ZWED_NODE_LOGS_TO_KEEP" -a -n "$ZLUX_NODE_LOGS_TO_KEEP" ]
then
  export ZWED_NODE_LOGS_TO_KEEP="${ZLUX_NODE_LOGS_TO_KEEP}"
fi
if [ -z "$ZWED_SSH_PORT" -a -n "$ZOWE_ZLUX_SSH_PORT" ]
then
  export ZWED_SSH_PORT="${ZOWE_ZLUX_SSH_PORT}"
fi
if [ -z "$ZWED_TN3270_PORT" -a -n "$ZOWE_ZLUX_TELNET_PORT" ]
then
  export ZWED_TN3270_PORT="${ZOWE_ZLUX_TELNET_PORT}"
fi
if [ -z "$ZWED_TN3270_SECURITY" -a -n "$ZOWE_ZLUX_SECURITY_TYPE" ]
then
  export ZWED_TN3270_SECURITY="${ZOWE_ZLUX_SECURITY_TYPE}"
fi
if [ -z "$ZWED_SSH_HOST" -a -n "$ZOWE_ZLUX_SSH_HOST" ]
then
  export ZWED_SSH_HOST="${ZOWE_ZLUX_SSH_HOST}"
fi
if [ -z "$ZWED_TN3270_HOST" -a -n "$ZOWE_ZLUX_TELNET_HOST" ]
then
  export ZWED_TN3270_HOST="${ZOWE_ZLUX_TELNET_HOST}"
fi
if [ -z "$ZWED_TN3270_ROW" -a -n "$ZOWE_ZLUX_TN3270_ROW" ]
then
  export ZWED_TN3270_ROW="${ZOWE_ZLUX_TN3270_ROW}"
fi
if [ -z "$ZWED_TN3270_COL" -a -n "$ZOWE_ZLUX_TN3270_COL" ]
then
  export ZWED_TN3270_COL="${ZOWE_ZLUX_TN3270_COL}"
fi
if [ -z "$ZWED_TN3270_MOD" -a -n "$ZOWE_ZLUX_TN3270_MOD" ]
then
  export ZWED_TN3270_MOD="${ZOWE_ZLUX_TN3270_MOD}"
fi
if [ -z "$ZWED_TN3270_CODEPAGE" -a -n "$ZOWE_ZLUX_TN3270_CODEPAGE" ]
then
  export ZWED_TN3270_CODEPAGE="${ZOWE_ZLUX_TN3270_CODEPAGE}"
fi
# zss
if [ -z "$ZWES_SERVER_PORT" -a -n "$ZOWE_ZSS_SERVER_PORT" ]
then
  export ZWES_SERVER_PORT="${ZOWE_ZSS_SERVER_PORT}"
fi
if [ -z "$ZWES_SERVER_TLS" -a -n "$ZOWE_ZSS_SERVER_TLS" ]
then
  export ZWES_SERVER_TLS="${ZOWE_ZSS_SERVER_TLS}"
fi
if [ "$ZWES_SERVER_TLS" = "false" ]
then
  # HTTP
  if [ -z "$ZWED_agent_http_port" -a -n "$ZWES_SERVER_PORT" ]
  then
    export ZWED_agent_http_port="${ZWES_SERVER_PORT}"
  fi
else
  # HTTPS
  if [ -z "$ZWED_agent_https_port" -a -n "$ZWES_SERVER_PORT" ]
  then
    export ZWED_agent_https_port="${ZWES_SERVER_PORT}"
  fi
  if [ -z "$ZWED_agent_host" -a -n "$ZOWE_EXPLORER_HOST" ]
  then
    export ZWED_agent_host="${ZOWE_EXPLORER_HOST}"
  fi
fi
if [ -z "$ZWES_XMEM_SERVER_NAME" -a -n "$ZOWE_ZSS_XMEM_SERVER_NAME" ]
then
  export ZWES_XMEM_SERVER_NAME="${ZOWE_ZSS_XMEM_SERVER_NAME}"
fi
if [ -z "$ZWED_privilegedServerName" ]
then
  if [ -n "$ZWES_XMEM_SERVER_NAME" ]
  then
    export ZWED_privilegedServerName=$ZWES_XMEM_SERVER_NAME
  fi 
fi
if [ -z "$ZWES_LOG_FILE" -a -n "$ZSS_LOG_FILE" ]
then
  export ZWES_LOG_FILE="${ZSS_LOG_FILE}"
fi
if [ -z "$ZWES_LOG_DIR" -a -n "$ZSS_LOG_DIR" ]
then
  export ZWES_LOG_DIR="${ZSS_LOG_DIR}"
fi
if [ -z "$ZWES_LOGS_TO_KEEP" -a -n "$ZSS_LOGS_TO_KEEP" ]
then
  export ZWES_LOGS_TO_KEEP="${ZSS_LOGS_TO_KEEP}"
fi
# cert verification
if [ -z "$ZWED_node_allowInvalidTLSProxy" -a -n "$VERIFY_CERTIFICATES" ]; then
  if [ "$VERIFY_CERTIFICATES" = "false" ]; then
    export ZWED_node_allowInvalidTLSProxy="true"
  fi
fi

# set production mode if applicable
if [ -n "$ROOT_DIR" -a -z "$NODE_ENV" ]; then
  export NODE_ENV=production
fi

# v2 logging
if [ -n "$ZWE_zowe_logDirectory" ]; then
  if [ -z "$ZWED_NODE_LOG_DIR" ]; then
    export ZWED_NODE_LOG_DIR="$ZWE_zowe_logDirectory"
  fi
  if [ -z "$ZWES_LOG_DIR" ]; then
    export ZWES_LOG_DIR="$ZWE_zowe_logDirectory"
  fi
fi

if [ -n "$ZWE_zowe_workspaceDirectory" ]
then
  WORKSPACE_LOCATION=$ZWE_zowe_workspaceDirectory
else
  WORKSPACE_LOCATION="$HOME/.zowe/workspace"
fi
DESTINATION="$WORKSPACE_LOCATION/app-server"


if [ -z "$ZWE_components_app_server_productDir" ]; then
  if [ -n "${ZWE_zowe_runtimeDirectory}" ]; then
    export ZWED_productDir=$(cd "$ZWE_zowe_runtimeDirectory/components/app-server/share/zlux-app-server/defaults" && pwd)
  else
    export ZWED_productDir=$(cd "$PWD/../defaults" && pwd)
  fi
fi
if [ -z "$ZWE_components_app_server_siteDir" ]; then
  export ZWED_siteDir="$DESTINATION/site"
fi
if [ -z "$ZWE_components_app_server_groupsDir" ]; then
  export ZWED_groupsDir="$DESTINATION/groups"
fi
if [ -z "$ZWE_components_app_server_usersDir" ]; then
  export ZWED_usersDir="$DESTINATION/users"
fi
if [ -z "$ZWE_components_app_server_pluginsDir" ]; then
  export ZWED_pluginsDir="$DESTINATION/plugins"
fi
if [ -z "$ZWE_components_app_server_instanceDir" ]; then
  export ZWED_instanceDir="$DESTINATION"
fi
