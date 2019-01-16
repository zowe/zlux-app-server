
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
setlocal
if "%ZLUX_NODE_LOG_DIR%" == "" (
  set ZLUX_NODE_LOG_DIR="../log"
)
call :makedir %ZLUX_NODE_LOG_DIR%
set NODE_PATH=../../zlux-server-framework/node_modules;%NODE_PATH%
cd ../lib
set minWorkers=2
set NODE_CLUSTER_SCHED_POLICY=rr
node --harmony zluxCluster.js --config=../deploy/instance/ZLUX/serverConfig/zluxserver.json %* > %ZLUX_NODE_LOG_DIR%\nodeServer.log 2>&1
endlocal

rem Create a directory if it does not exist yet
:makedir
if not exist %ZLUX_NODE_LOG_DIR% mkdir %ZLUX_NODE_LOG_DIR%
goto :eof
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
