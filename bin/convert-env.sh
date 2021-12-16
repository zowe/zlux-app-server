#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project.

OSNAME=$(uname)

# For backwards compatible behavior, only set the instance ID if it is non-default
if [ -n "$ZOWE_INSTANCE" ]
then
    if [ "$ZOWE_INSTANCE" != "1" ]
    then
        export ZWED_instanceID=$ZOWE_INSTANCE
    fi
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
      zss_def="../${zss_def_template}"
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
    if [ -z "$LOCAL_CA" ]
    then
      LOCAL_CA=localca
    fi
    #, at end turns it into an array
    if [ -n "$EXTERNAL_ROOT_CA" ]
    then
      export ZWED_node_https_certificateAuthorities="${TRUSTSTORE}&${LOCAL_CA}","${TRUSTSTORE}&${EXTERNAL_ROOT_CA}"
    else
      export ZWED_node_https_certificateAuthorities="${TRUSTSTORE}&${LOCAL_CA}",
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
  if [ -n $SSO_FALLBACK_TO_NATIVE_AUTH ]
  then
    export ZWED_agent_jwt_fallback=$SSO_FALLBACK_TO_NATIVE_AUTH
  fi
fi
if [ -z "$ZWED_agent_jwt_token_name" ]
then
  if [ -n $PKCS11_TOKEN_NAME ]
  then
    export ZWED_agent_jwt_token_name=$PKCS11_TOKEN_NAME
  fi
fi
if [ -z "$ZWED_agent_jwt_token_label" ]
then
  if [ -n $PKCS11_TOKEN_LABEL ]
  then
    export ZWED_agent_jwt_token_label=$PKCS11_TOKEN_LABEL
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
    if [ ! -f "${COMPONENT_HOME}/manifest.yaml" ]; then
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
