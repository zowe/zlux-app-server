@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.

setlocal
if "%ZLUX_NODE_LOG_DIR%" == "" (
  set ZLUX_NODE_LOG_DIR=..\log
)
call :makedir %ZLUX_NODE_LOG_DIR%
set NODE_PATH=../..;../../zlux-server-framework/node_modules;%NODE_PATH%
cd ../lib
call :abspath %ZLUX_NODE_LOG_DIR%\nodeServer.log
set LOG_PATH=%RETVAL%

REM Check if print to terminal argument exists
echo.%* | findstr /C:"--logToTerminal" 1>nul
if errorlevel 1 (
  echo Server startup. Log location=%LOG_PATH%
  node --harmony zluxServer.js --config=../deploy/instance/ZLUX/serverConfig/zluxserver.json %* > %LOG_PATH% 2>&1
) ELSE (
  echo Server startup. Logging to terminal...
  node --harmony zluxServer.js --config=../deploy/instance/ZLUX/serverConfig/zluxserver.json %*
)
echo Ended with rc=%ERRORLEVEL%
endlocal
goto :eof

REM Create a directory if it does not exist yet
:makedir
if not exist %1 mkdir %1
goto :eof

:abspath
set RETVAL=%~dpfn1
exit /B
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
