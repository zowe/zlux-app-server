#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.

#This file is for installing the pax file of zlux. It lives here so it is covered by source control. It is not called from this location

SCRIPT_DIR=`pwd`
cd ../files
umask 0002
pax -r -w -px ZLUX.pax $ZOE_ROOT_DIR
cd $ZOE_ROOT_DIR
pax -r -px -f ZLUX.pax

chmod -R a-w tn3270-ng2/ vt-ng2/ zlux-app-manager/ zlux-example-server/ zlux-ng2/ zlux-proxy-server/ zlux-shared/ zos-subsystems/ 2>/dev/null
chmod ug+w zlux-example-server/
mkdir zlux-example-server/log
chmod ug-w zlux-example-server/

cd zlux-example-server
chmod -R a-w bin/ build/ config/ js/ plugins/ .gitattributes .gitignore README.md 2>/dev/null
chmod ug+w bin/zssServer

if extattr bin/zssServer | grep "APF authorized = NO"; then
  echo "zssServer does not have the proper extattr values"
  echo "Please run extattr +a zlux-example-server/bin/zssServer"
  cd $SCRIPT_DIR
  return 1
fi

cd $SCRIPT_DIR
return 0


# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
