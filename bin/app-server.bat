@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
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

REM ---- Environment settings ----
if not defined NODE_ENV set NODE_ENV=production

if "%ZWE_zowe_verifyCertificates%"=="DISABLED" (
  set NODE_TLS_REJECT_UNAUTHORIZED=0
)

REM ---- Determine config file ----
REM ZWE_CLI_PARAMETER_CONFIG is the canonical variable in a Zowe production environment.
REM In dev, fall back to %USERPROFILE%\.zowe\zowe.yaml, copying defaults if absent.
if defined ZWE_CLI_PARAMETER_CONFIG (
  set CONFIG_FILE=FILE(!ZWE_CLI_PARAMETER_CONFIG!):FILE(!ZLUX_APP_SERVER_DIR!\defaults\serverConfig\defaults.yaml)
) else (
  if not exist "%USERPROFILE%\.zowe\zowe.yaml" (
    echo No config file found at %USERPROFILE%\.zowe\zowe.yaml, copying defaults
    call :makedir "%USERPROFILE%\.zowe"
    copy "!ZLUX_APP_SERVER_DIR!\defaults\serverConfig\defaults.yaml" "%USERPROFILE%\.zowe\zowe.yaml" >nul
  )
  set CONFIG_FILE=FILE(%USERPROFILE%\.zowe\zowe.yaml):FILE(!ZLUX_APP_SERVER_DIR!\defaults\serverConfig\defaults.yaml)
)

REM ---- Workspace initialization (dev env or when ZWE_zowe_runtimeDirectory is not set) ----
if not defined ZWE_zowe_runtimeDirectory (
  if not defined ZWE_zowe_workspaceDirectory (
    set ZWE_zowe_workspaceDirectory=%USERPROFILE%\.zowe\workspace
  )
  if not exist "!ZWE_zowe_workspaceDirectory!\app-server\plugins\org.zowe.zlux.json" (
    cd "!ZLUX_APP_SERVER_DIR!\lib"
    !NODE_BIN! initInstance.js
    cd "!SCRIPT_DIR!"
  )
)

REM ---- Log file setup ----
REM Uses ZWED_NODE_LOG_FILE / ZWED_NODE_LOG_DIR.  When neither is set, logs default to
REM %USERPROFILE%\.zowe\logs with a timestamped filename and automatic rotation.
if defined ZWED_NODE_LOG_FILE (
  FOR /F %%i IN ("!ZWED_NODE_LOG_FILE!") DO set ZWED_LOG_PATH=%%~fi
  if defined ZWED_NODE_LOG_DIR (
    echo ZWED_NODE_LOG_FILE set ^(value !ZWED_NODE_LOG_FILE!^). Ignoring ZWED_NODE_LOG_DIR.
  )
) else (
  if not defined ZWED_NODE_LOG_DIR (
    set ZWED_NODE_LOG_DIR=%USERPROFILE%\.zowe\logs
  )
  call :makedir "!ZWED_NODE_LOG_DIR!"

  REM Generate a timestamp-based log filename matching the Unix format (YYYY-MM-DD-HH-MM).
  for /f %%a in ('powershell -NoProfile -Command "[datetime]::Now.ToString(''yyyy-MM-dd-HH-mm'')"') do set LOGDATE=%%a
  set ZWED_LOG_PATH=!ZWED_NODE_LOG_DIR!\appServer-!LOGDATE!.log

  REM Rotate logs: keep only the ZWED_NODE_LOGS_TO_KEEP most recent files (default 5).
  if not defined ZWED_NODE_LOGS_TO_KEEP set ZWED_NODE_LOGS_TO_KEEP=5
  call :rotate_logs "!ZWED_NODE_LOG_DIR!" !ZWED_NODE_LOGS_TO_KEEP!
)

REM ---- Server file and working directory ----
cd "!ZLUX_APP_SERVER_DIR!\lib"
set ZOWE_LIB_DIR=%CD%

if not defined ZLUX_MIN_WORKERS set ZLUX_MIN_WORKERS=2
set NODE_CLUSTER_SCHED_POLICY=none

if "%ZLUX_NO_CLUSTER%"=="1" (
  set ZLUX_SERVER_FILE=zluxServer.js
) else (
  set ZLUX_SERVER_FILE=zluxCluster.js
)

if not defined ZOWE_WORKING_DIR (
  set ZOWE_WORKING_DIR=!ZOWE_LIB_DIR!
) else (
  echo Server is about to start with a non default working directory. Working dir=!ZOWE_WORKING_DIR!
)

REM ---- DNS lookup order ----
set ZLUX_DNS_ORDER=--dns-result-order=ipv4first
if "%ZWE_components_app_server_dns_lookupOrder%"=="ipv6" (
  set ZLUX_DNS_ORDER=--dns-result-order=verbatim
)

REM ---- Node flags ----
REM ZWED_FLAGS can be set externally; if not, default to the DNS order flag.
if not defined ZWED_FLAGS (
  set ZWED_FLAGS=!ZLUX_DNS_ORDER!
)

REM ---- Start server ----
cd !ZOWE_WORKING_DIR!
echo Show Environment
set

REM Logging to terminal when ZLUX_NO_LOGFILE is set or --logToTerminal is passed.
set LOG_TO_TERMINAL=0
if defined ZLUX_NO_LOGFILE set LOG_TO_TERMINAL=1
echo.%* | findstr /C:"--logToTerminal" 1>nul
if not errorlevel 1 set LOG_TO_TERMINAL=1

if "!LOG_TO_TERMINAL!"=="1" (
  echo Server startup. Logging to terminal...
  !NODE_BIN! !ZWED_FLAGS! "!ZOWE_LIB_DIR!\!ZLUX_SERVER_FILE!" --config="!CONFIG_FILE!" %*
) else (
  echo Server startup. Log location=!ZWED_LOG_PATH!
  !NODE_BIN! !ZWED_FLAGS! "!ZOWE_LIB_DIR!\!ZLUX_SERVER_FILE!" --config="!CONFIG_FILE!" %* > "!ZWED_LOG_PATH!" 2>&1
)
set rc=%ERRORLEVEL%
echo Ended with rc=%rc%
endlocal
exit /b %rc%


REM Create a directory if it does not exist yet.
:makedir
if not exist %1 mkdir %1
goto :eof


REM Rotate logs: keep only the N most recent appServer-*.log files, deleting older ones.
REM Usage: call :rotate_logs "logDir" keepCount
:rotate_logs
set _RL_DIR=%~1
set _RL_KEEP=%~2
set _RL_COUNT=0
for /f "delims=" %%f in ('dir /b /o-d /a-d "!_RL_DIR!\appServer-*.log" 2^>nul') do (
  set /a _RL_COUNT+=1
  if !_RL_COUNT! gtr !_RL_KEEP! (
    echo Removing old log: !_RL_DIR!\%%f
    del "!_RL_DIR!\%%f"
  )
)
goto :eof
