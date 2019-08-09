@echo off
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.

if [%1]==[] goto :fail
setlocal
set app_path="%~f1"
if "%ZLUX_INSTALL_LOG_DIR%" == "" (
  set ZLUX_INSTALL_LOG_DIR=..\log
)
call :makedir %ZLUX_INSTALL_LOG_DIR%
call :abspath %ZLUX_INSTALL_LOG_DIR%\install.log
set LOG_PATH=%RETVAL%
echo Running installer. Log location=%LOG_PATH%
node "%~dp0..\..\zlux-server-framework\utils\install-app.js" -i "%app_path%"  -o "%~dp0..\..\\" -c "%~dp0..\..\zlux-app-server\deploy\instance\ZLUX\serverConfig\zluxserver.json" %2 > %LOG_PATH% 2>&1
endlocal
goto :finished

:fail
echo Usage: install-app.bat AppPath
goto :eof

rem Create a directory if it does not exist yet
:makedir
if not exist %1 mkdir %1
goto :eof

:abspath
set RETVAL=%~dpfn1
exit /B

:finished
echo Ended with rc=%ERRORLEVEL%
REM This program and the accompanying materials are
REM made available under the terms of the Eclipse Public License v2.0 which accompanies
REM this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
REM 
REM SPDX-License-Identifier: EPL-2.0
REM 
REM Copyright Contributors to the Zowe Project.
