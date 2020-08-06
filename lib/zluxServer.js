

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

'use strict';
const ProxyServer = require('zlux-server-framework');

const {appConfig, configJSON, startUpConfig, configLocation} = require('./zluxArgs')();
const proxyServer = new ProxyServer(appConfig, configJSON, startUpConfig, configLocation);
proxyServer.start().then(() => {
  const process = require('process');
  const fs = require('fs');

  fs.writeFile('./process.pid', process.pid, (err) => {
    if (err) console.log ('Could not write PID', err);
  });
  console.log("ZWED5019I - Started")
}).catch(e => {
  console.log("ZWED5019E - Could not start the server: ", e)
});

// run as:
// node --harmony mvdServer.js --config=../config/zluxserver.json [--hostServer=<z/os system>] [--hostPort=#]



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

