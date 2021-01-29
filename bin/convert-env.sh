#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
#
# SPDX-License-Identifier: EPL-2.0
#
# Copyright Contributors to the Zowe Project.

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

if [ -z "$ZWED_node_mediationLayer_server_hostname" ]
then
  if [ -n "$ZOWE_EXPLORER_HOST" ]
  then
    export ZWED_node_mediationLayer_server_hostname=$ZOWE_EXPLORER_HOST
    if [ -n "$ZWED_node_mediationLayer_server_port" ]
    then
      case "$LAUNCH_COMPONENT_GROUPS" in
        *GATEWAY*)
          #All conditions met for app-server behind gateway: hostname, port, and component
          export ZWED_node_mediationLayer_enabled="true"
          ;;
      esac
    fi
  fi
fi
if [ -z "$ZWED_node_mediationLayer_enabled" ]
then
    export ZWED_node_mediationLayer_enabled="false"
fi

# certificates
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
if [ -z "$ZWED_node_https_port" ] 
then
  if [ -n "$ZOWE_ZLUX_SERVER_HTTPS_PORT" ]
  then
    export ZWED_node_https_port=$ZOWE_ZLUX_SERVER_HTTPS_PORT
  fi
fi
if [ -z "$ZWED_productDir" ]
then
  if [ -n "$ROOT_DIR" ]
  then
  export ZWED_productDir=$ROOT_DIR/components/app-server/share/zlux-app-server/defaults
  fi
fi

# zss
if [ -z "$ZWED_agent_http_port" ]
then
  if [ -n "$ZOWE_ZSS_SERVER_PORT" ]
  then
    export ZWED_agent_http_port=$ZOWE_ZSS_SERVER_PORT
  fi
fi
if [ -z "$ZWED_privilegedServerName" ]
then
  if [ -n "$ZOWE_ZSS_XMEM_SERVER_NAME" ]
  then
    export ZWED_privilegedServerName=$ZOWE_ZSS_XMEM_SERVER_NAME
  fi 
fi
