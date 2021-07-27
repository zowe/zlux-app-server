#!/bin/bash

#########################################################################################
#                                                                                       #
# This program and the accompanying materials are made available under the terms of the #
# Eclipse Public License v2.0 which accompanies this distribution, and is available at  #
# https://www.eclipse.org/legal/epl-v20.html                                            #
#                                                                                       #
# SPDX-License-Identifier: EPL-2.0                                                      #
#                                                                                       #
# Copyright IBM Corporation 2021                                                        #
#                                                                                       #
#########################################################################################

# This script borrowed from zowe-configure-container.sh
LOG_DIR=${INSTANCE_DIR}/logs
mkdir -p ${LOG_DIR}
chmod 777 ${LOG_DIR}
export LOG_FILE=${LOG_DIR}/"configure-app-server`date +%Y-%m-%d-%H-%M-%S`.log"

# cd ${ZOWE_ROOT_DIR}/components/app-server/share/zlux-app-server/bin
./internal-install.sh