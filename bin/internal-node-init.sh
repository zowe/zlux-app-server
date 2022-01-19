if [ -n "$NODE_HOME" ]
then
  NODE_BIN=${NODE_HOME}/bin/node
  export PATH=${NODE_HOME}/bin:$PATH
elif [ -n "$ZOWE_NODE_HOME" ]
then
  NODE_BIN=${ZOWE_NODE_HOME}/bin/node
  export PATH=${ZOWE_NODE_HOME}/bin:$PATH
else
  NODE_BIN=node
fi

export NODE_BIN

if [ ! -e "${ZWE_zowe_runtimeDirectory}/bin/internal/zowe-set-env.sh" ]; then
  RUN_ON_ZOS=$(test `uname` = "OS/390" && echo "true")
  if [ "${RUN_ON_ZOS}" = "true" ]; then
    export "_CEE_RUNOPTS=XPLINK(ON),HEAPPOOLS(ON)"
    export _BPXK_AUTOCVT=ON
    export __UNTAGGED_READ_MODE=V6

    nodeVersion="$(${NODE_BIN} --version)"
    nodeMajorVersion=$(echo ${nodeVersion} | cut -c2-3)
    if [ $nodeMajorVersion -ge "12" ]
    then
      export _TAG_REDIR_ERR=txt
      export _TAG_REDIR_IN=txt
      export _TAG_REDIR_OUT=txt
    fi

  fi
else
  . ${ZWE_zowe_runtimeDirectory}/bin/internal/zowe-set-env.sh
fi

export NODE_PATH=../..:../../zlux-server-framework/node_modules:$NODE_PATH

