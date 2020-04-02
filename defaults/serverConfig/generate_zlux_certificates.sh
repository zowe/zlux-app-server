#!/bin/sh

#  This program and the accompanying materials are
#  made available under the terms of the Eclipse Public License v2.0 which accompanies
#  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
#  
#  SPDX-License-Identifier: EPL-2.0
#  
#  Copyright Contributors to the Zowe Project.

#
# Generates certificate for zLUX that is signed by APIML Certificate Management local CA
#
# You can execute it from any directory and it will update regenerate certificates for zLUX
# in the same directory where the script is.
#
# It assumes that the `api-layer` repository is cloned at the same directory as `zlux`.
# If it is different you need to set the `APIML_HOME` variable.
#

BASE_DIR=$(dirname "$0")
if [ -z ${APIML_HOME+x} ]; then
    APIML_HOME="${BASE_DIR}/../../../../api-layer"
fi
if [ -z ${ZOWE_INSTALL_PACKAGING_HOME+x} ]; then
    ZOWE_INSTALL_PACKAGING_HOME="${BASE_DIR}/../../../../zowe-install-packaging"
fi

SERVICE_KEYSTORE="${BASE_DIR}/zlux.keystore"
SERVICE_TRUSTSTORE="${BASE_DIR}/zlux.truststore"
SERVICE_DNAME="EMAILADDRESS=zowe-zlc@lists.openmainframeproject.org,CN=Zowe zLUX,O=Zowe,ST=California,C=US"
LOCAL_CA_FILENAME="${APIML_HOME}/keystore/local_ca/localca"

${ZOWE_INSTALL_PACKAGING_HOME}/bin/apiml_cm.sh --action new-service \
  --local-ca-filename ${LOCAL_CA_FILENAME} --service-dname "${SERVICE_DNAME}" \
  --service-keystore ${SERVICE_KEYSTORE} --service-truststore ${SERVICE_TRUSTSTORE}

rm -f ${SERVICE_KEYSTORE}_signed.cer ${SERVICE_KEYSTORE}.csr    

cp -v ${LOCAL_CA_FILENAME}.cer ${BASE_DIR}/apiml-localca.cer
