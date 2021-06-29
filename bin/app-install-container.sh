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

# This script is placholder from server-bundle install apps, based on apps mountpoint
if [ -d "${apps_dir}" ]; then
  export ZLUX_SHARE=/home/zowe/install/components/app-server/share
  cd ${apps_dir}
  for D in */;
   do
    if test -f "$D/autoinstall.sh"; then
      app=$(cd $D && pwd)
      ZLUX_SHARE=$ZLUX_SHARE APP_PLUGIN_DIR=app ./$D/autoinstall.sh
    elif test -f "$D/pluginDefinition.json"; then
        $INSTANCE_DIR/bin/install-app.sh ${apps_dir}/$D
    elif test -f "$D/manifest.yaml"; then
        $ROOT_DIR/bin/zowe-install-component.sh -o ${apps_dir}/$D -i $INSTANCE_DIR
    elif test -f "$D/manifest.yml"; then
        $ROOT_DIR/bin/zowe-install-component.sh -o ${apps_dir}/$D -i $INSTANCE_DIR
    elif test -f "$D/manifest.json"; then
        $ROOT_DIR/bin/zowe-install-component.sh -o ${apps_dir}/$D -i $INSTANCE_DIR
    fi
  done
fi