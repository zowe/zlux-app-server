#!/bin/sh
# This program and the accompanying materials are
# made available under the terms of the Eclipse Public License v2.0 which accompanies
# this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Copyright Contributors to the Zowe Project.
if [ $# -eq 0 ]
  then
  echo "Usage: $0 AppID|AppPath [PluginsDir]"
  exit 1
fi

. ./plugin-utils.sh

export _CEE_RUNOPTS="FILETAG(AUTOCVT,AUTOTAG) POSIX(ON)"
export _EDC_ADD_ERRNO2=1                        # show details on error
unset ENV             # just in case, as it can cause unexpected output

dir=$(cd `dirname $0` && pwd)

if [ -d "$1" ]; then
  arg_path="true"
  app_path=$(cd "$1"; pwd)  
else
  arg_path="false"
  app_id="$1"
fi

if [ $# -gt 1 ]; then
  plugin_dir=$2
  shift
else
  getPluginsDir
  plugin_dir=$?
fi
shift

if [ -z "$plugin_dir" ]; then
  echo "Error: could not find plugin directory"
  echo "Ended with rc=1"
  exit 1
fi


if [ "$arg_path" = "true" ]; then
  getPluginID "${app_path}"
  id=$?
  
  if [ -n "${id}" ]; then
    echo "Found plugin=${id}"
    app_id=$id
  else
    echo "Error: could not find plugin id for path=${app_path}"
    echo "Ended with rc=1"
    exit 1
  fi
fi

if [ -n "${plugin_dir}" ]; then
  echo "Removing plugin ${app_id} from ${plugin_dir}"
  if [ ! -d "${plugin_dir}" ]; then
    echo "Plugins directory does not exist or is not a directory"
    exit 1
  fi
  rm "${plugin_dir}/${app_id}.json"
  result=$?
  echo "Ended with rc=$result"
  exit $result
else
  echo "Could not find plugins directory"
  echo "Ended with rc=1"
  exit 1
fi
