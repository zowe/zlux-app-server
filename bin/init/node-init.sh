#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

if [ -n "$NODE_HOME" ]; then
  export NODE_BIN=${NODE_HOME}/bin/node
  export PATH=${NODE_HOME}/bin:$PATH
else
  export NODE_BIN=node
fi

# These are used on z/OS and ignored elsewhere.
# Some are already applied by zwe, but in dev, we add them.
# They control text encoding primarily.
export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"
export _BPXK_AUTOCVT=ON
export __UNTAGGED_READ_MODE=V6
export _TAG_REDIR_ERR=txt
export _TAG_REDIR_IN=txt
export _TAG_REDIR_OUT=txt

export NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH

