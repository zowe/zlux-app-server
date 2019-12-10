@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
if [%1]==[] goto :fail
setlocal EnableDelayedExpansion

set app_path="%~f1"
set temp_cd=%CD%
if not defined ZLUX_INSTALL_LOG_DIR (
  if exist "%INSTANCE_DIR%" (
    set ZLUX_INSTALL_LOG_DIR=%INSTANCE_DIR%\logs
  ) else (
    set ZLUX_INSTALL_LOG_DIR="..\log"
  )
)
call :makedir "!ZLUX_INSTALL_LOG_DIR!"
cd "!ZLUX_INSTALL_LOG_DIR!"
for %%I in (.) do set ZLUX_LOG_PATH="%%~dpfI\install-app.log"

cd %temp_cd%

if exist "%INSTANCE_DIR%\workspace\app-server\serverConfig\server.json" (
  set ZLUX_CONFIG_FILE="%INSTANCE_DIR%\workspace\app-server\serverConfig\server.json"
) else (
  if exist "%USERPROFILE%\.zowe\workspace\app-server\serverConfig\server.json" (
    set ZLUX_CONFIG_FILE="%USERPROFILE%\.zowe\workspace\app-server\serverConfig\server.json"
  ) else (
    if exist "..\deploy\instance\ZLUX\serverConfig\zluxserver.json" (
      echo WARNING: Using old configuration present in "%temp_cd%\..\deploy"
      echo This configuration should be migrated for use with future versions. See documentation for more information.\n
      set ZLUX_CONFIG_FILE="..\deploy\instance\ZLUX\serverConfig\zluxserver.json"
    ) else (
      set ZLUX_CONFIG_FILE="..\defaults\serverConfig\server.json"
    )
  )
)

echo Checking for node
where node
if %ERRORLEVEL% neq 0 goto :nonode
echo Running installer. Log location=!ZLUX_LOG_PATH!
node "%~dp0..\..\zlux-server-framework\utils\install-app.js" -i "!app_path!"  -o "%~dp0..\..\\" -c "!ZLUX_CONFIG_FILE!" %2 > !ZLUX_LOG_PATH! 2>&1
set rc=%ERRORLEVEL%
echo Ended with rc=%rc%
endlocal
exit /B %rc%

:nonode
set rc=%ERRORLEVEL%
echo Node required for installation. Add to PATH and try again
echo Ended with rc=%rc%
exit /B %rc%

:fail
echo Usage: install-app.bat AppPath
exit /B 1

rem Create a directory if it does not exist yet
:makedir
if not exist %1 mkdir %1
goto :eof

