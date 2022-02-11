@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
setlocal EnableDelayedExpansion

if defined NODE_HOME (
  set NODE_BIN="%NODE_HOME%\node"
) else (
  set NODE_BIN=node
)

if not exist "..\lib\zluxArgs.js" (
  if defined CONDA_PREFIX (
    cd "%CONDA_PREFIX%\share\zowe\app-server\zlux-app-server\bin"
  )
)
set temp_cd=%CD%

set NODE_PATH=../..;../../zlux-server-framework/node_modules;%NODE_PATH%

REM ZLUX_CONFIG_FILE, WORKSPACE_DIR, and INSTANCE_DIR are for official Zowe environment use.
REM If none found, will assume dev environment and consider ~/.zowe as INSTANCE_DIR
if exist "%ZLUX_CONFIG_FILE%" (
  set CONFIG_FILE=%ZLUX_CONFIG_FILE%
) else (
  if exist "%ZWE_CLI_PARAMETER_CONFIG%" (
    set CONFIG_FILE=%ZWE_CLI_PARAMETER_CONFIG%
  ) else (
    if exist "%WORKSPACE_DIR%" (
      if exist "%WORKSPACE_DIR%\app-server\serverConfig\zowe.yaml" (
        set CONFIG_FILE=%WORKSPACE_DIR%\app-server\serverConfig\zowe.yaml
      ) else (
        cd ..\lib
        !NODE_BIN! initInstance.js
        cd ..\bin
      )
    ) else (
      if exist "%INSTANCE_DIR%" (
        if exist "%INSTANCE_DIR%\workspace\app-server\serverConfig\zowe.yaml" (
          set CONFIG_FILE=%INSTANCE_DIR%\workspace\app-server\serverConfig\zowe.yaml
        ) else (
          cd ..\lib
          !NODE_BIN! initInstance.js
          cd ..\bin        
        )
      ) else (
        if exist "%USERPROFILE%\.zowe\workspace\app-server\serverConfig\zowe.yaml" (
          set CONFIG_FILE=%USERPROFILE%\.zowe\workspace\app-server\serverConfig\zowe.yaml
          set INSTANCE_DIR=%USERPROFILE%\.zowe
        ) else (
          echo No config file found, initializing
          set INSTANCE_DIR=%USERPROFILE%\.zowe
          call :makedir "!INSTANCE_DIR!\logs"
          cd ..\lib
          !NODE_BIN! initInstance.js
          set CONFIG_FILE=%USERPROFILE%\.zowe\workspace\app-server\serverConfig\zowe.yaml
          cd ..\bin
        )
      )
    )
  )
)


if defined ZLUX_NODE_LOG_FILE (
  FOR /F %%i IN ("%ZLUX_NODE_LOG_FILE%") DO set ZLUX_LOG_PATH=%%~fi
  if defined ZLUX_NODE_LOG_DIR (
    echo "ZLUX_NODE_LOG_FILE set (value %ZLUX_NODE_LOG_FILE%). Ignoring ZLUX_NODE_LOG_DIR."
  )
) else (
  if not defined ZLUX_NODE_LOG_DIR (
    if exist "!INSTANCE_DIR!" (
      set ZLUX_NODE_LOG_DIR=!INSTANCE_DIR!\logs
    ) else (
      set ZLUX_NODE_LOG_DIR="..\log"
    )
  )
  call :makedir "!ZLUX_NODE_LOG_DIR!"
  cd "!ZLUX_NODE_LOG_DIR!"
  for %%I in (.) do set ZLUX_LOG_PATH="%%~dpfI\appServer.log"
)

cd %temp_cd%

cd ..\lib
set ZOWE_LIB_DIR=%CD%

if not defined ZLUX_MIN_WORKERS (
  set ZLUX_MIN_WORKERS=2
)
set NODE_CLUSTER_SCHED_POLICY=none

if "%ZLUX_NO_CLUSTER%" == "1" (
  set ZLUX_SERVER_FILE=zluxServer.js
) else (
  set ZLUX_SERVER_FILE=zluxCluster.js
)

if not defined ZOWE_WORKING_DIR (
  set ZOWE_WORKING_DIR=!ZOWE_LIB_DIR!
) else (
   echo Server is about to start with a non default working directory. Working dir=!ZOWE_WORKING_DIR!
)

REM Check if print to terminal argument exists
echo.%* | findstr /C:"--logToTerminal" 1>nul
cd !ZOWE_WORKING_DIR!
if errorlevel 1 (
  echo Server startup. Log location=!ZLUX_LOG_PATH!
  !NODE_BIN! --harmony !ZOWE_LIB_DIR!\!ZLUX_SERVER_FILE! --config="!CONFIG_FILE!" %* > "!ZLUX_LOG_PATH!" 2>&1
) ELSE (
  echo Server startup. Logging to terminal...
  !NODE_BIN! --harmony !ZOWE_LIB_DIR!\!ZLUX_SERVER_FILE! --config="!CONFIG_FILE!" %*
)
set rc=%ERRORLEVEL%
echo Ended with rc=%rc%
endlocal
exit %rc%


rem Create a directory if it does not exist yet
:makedir
if not exist %1 mkdir %1
goto :eof
