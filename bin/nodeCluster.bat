@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
setlocal
if defined ZLUX_NODE_LOG_FILE (
  FOR /F %%i IN ("%ZLUX_NODE_LOG_FILE%") DO set ZLUX_LOG_PATH=%%~fi  
) else (
  if not defined ZLUX_NODE_LOG_DIR (
    set ZLUX_NODE_LOG_DIR = "../log"
  )
  call :makedir
  FOR /F %%i IN ("%ZLUX_NODE_LOG_DIR%\nodeServer.log") DO set ZLUX_LOG_PATH=%%~fi  
)
if not defined ZLUX_CONFIG_FILE  (
  set ZLUX_CONFIG_FILE = "../deploy/instance/ZLUX/serverConfig/zluxserver.json"
)
set NODE_PATH=../..;../../zlux-server-framework/node_modules;%NODE_PATH%
cd ../lib
set minWorkers=2
set NODE_CLUSTER_SCHED_POLICY=rr
REM Check if print to terminal argument exists
echo.%* | findstr /C:"--logToTerminal" 1>nul
if errorlevel 1 (
  echo Server startup. Log location=%ZLUX_LOG_PATH%
  node --harmony zluxCluster.js --config="%ZLUX_CONFIG_FILE%" %* > "%ZLUX_LOG_PATH%" 2>&1
) ELSE (
  echo Server startup. Logging to terminal...
  node --harmony zluxCluster.js --config="%ZLUX_CONFIG_FILE%" %*
)
set rc=%ERRORLEVEL%
echo Ended with rc=%rc%
endlocal
exit %rc%


rem Create a directory if it does not exist yet
:makedir
if not exist "%ZLUX_NODE_LOG_DIR%" mkdir "%ZLUX_NODE_LOG_DIR%"
goto :eof
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
