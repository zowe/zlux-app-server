#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

type node
if [ "$?" -ne "0" ]; then
  if [ -e "${NODE_HOME}/bin/node" ]; then
    exit 0
  elif [ -e "${ZOWE_NODE_HOME}/bin/node" ]; then
    exit 0
  else 
    echo "Error: node not found, app-server cannot run"
    exit 1
  fi
fi
