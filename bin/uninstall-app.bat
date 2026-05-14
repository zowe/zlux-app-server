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

REM ---- Node binary ----
if defined NODE_HOME (
  set NODE_BIN="!NODE_HOME!\node"
) else (
  set NODE_BIN=node
)

REM ---- Determine directories ----
REM SCRIPT_DIR is the absolute path of the bin/ directory containing this script.
set SCRIPT_DIR=%~dp0
if "!SCRIPT_DIR:~-1!"=="\" set SCRIPT_DIR=!SCRIPT_DIR:~0,-1!

REM ZLUX_APP_SERVER_DIR is the parent of bin/.
pushd "!SCRIPT_DIR!\.."
set ZLUX_APP_SERVER_DIR=%CD%
popd

REM ZLUX_ROOT_DIR: production = <runtimeDir>\components\app-server\share
REM                dev        = parent of zlux-app-server
if defined ZWE_zowe_runtimeDirectory (
  set ZLUX_ROOT_DIR=%ZWE_zowe_runtimeDirectory%\components\app-server\share
) else (
  pushd "!ZLUX_APP_SERVER_DIR!\.."
  set ZLUX_ROOT_DIR=%CD%
  popd
)

REM ---- Node module path ----
set NODE_PATH=!ZLUX_ROOT_DIR!;!ZLUX_ROOT_DIR!\zlux-server-framework\node_modules;%NODE_PATH%

REM ---- App input (argument 1): plugin ID or path ----
set app_input=%1

REM ---- Plugin directory ----
REM Use explicit second argument if provided; otherwise resolve from env vars.
if not [%2]==[] (
  set plugin_dir=%~f2
) else (
  if defined ZWED_pluginsDir (
    set plugin_dir=!ZWED_pluginsDir!
  ) else if defined ZWE_components_app_server_pluginsDir (
    set plugin_dir=!ZWE_components_app_server_pluginsDir!
  ) else if defined ZWE_zowe_workspaceDirectory (
    set plugin_dir=!ZWE_zowe_workspaceDirectory!\app-server\plugins
  ) else (
    set plugin_dir=%USERPROFILE%\.zowe\workspace\app-server\plugins
  )
)

if not defined plugin_dir (
  echo Error: could not find plugin directory
  echo Plugin deregistration ended with rc=1
  exit /B 1
)

REM ---- Log file setup ----
if not defined ZLUX_INSTALL_LOG_DIR (
  if defined ZWE_zowe_logDirectory (
    set ZLUX_INSTALL_LOG_DIR=!ZWE_zowe_logDirectory!
  )
)

set PLUGIN_LOG_FILE=nul
if defined ZLUX_INSTALL_LOG_DIR (
  call :makedir "!ZLUX_INSTALL_LOG_DIR!"
  for /f %%a in ('powershell -NoProfile -Command "[datetime]::Now.ToString(''yyyyMMdd-HHmmss'')"') do set PLUGIN_TIMESTAMP=%%a
  for %%a in ("%app_input%") do set PLUGIN_NICKNAME=%%~nxa
  set PLUGIN_LOG_FILE=!ZLUX_INSTALL_LOG_DIR!\uninstall-app-!PLUGIN_NICKNAME!-!PLUGIN_TIMESTAMP!.log
)

REM ---- Check node ----
echo Testing if node exists
!NODE_BIN! --version >nul 2>&1
if errorlevel 1 (
  echo Error: node not found, cannot deregister plugin
  echo Plugin deregistration ended with rc=1
  exit /B 1
)

REM ---- Run uninstaller ----
echo Running app-server plugin deregistration. Log=!PLUGIN_LOG_FILE!
echo app_input=!app_input!
echo plugin_dir=!plugin_dir!
!NODE_BIN! "!ZLUX_APP_SERVER_DIR!\lib\uninstall-app.js" -i "!app_input!" -p "!plugin_dir!" >> "!PLUGIN_LOG_FILE!" 2>&1
set rc=%ERRORLEVEL%
echo Plugin deregistration ended with rc=%rc%
endlocal
exit /B %rc%

:fail
echo Usage: uninstall-app.bat AppID^|AppPath [PluginsDir]
exit /B 1

REM Create a directory if it does not exist yet.
:makedir
if not exist %1 mkdir %1
goto :eof
