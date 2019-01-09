

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

'use strict';
const ProxyServer = require('zlux-proxy-server');

const {appConfig, configJSON, startUpConfig} = require('./zluxArgs')();
const proxyServer = new ProxyServer(appConfig, configJSON, startUpConfig);
proxyServer.start().then(() => {
  console.log("started")
}).catch(e => {
  console.log("could not start the server: ", e)
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

