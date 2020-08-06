
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
'use strict';

const clusterManager = require('zlux-server-framework/lib/clusterManager').clusterManager;
const {appConfig, configJSON, startUpConfig, configLocation} = require('./zluxArgs')();

const process = require('process');
const fs = require('fs');

fs.writeFile('./process.pid', process.pid, (err) => {
  if (err) console.log ('Could not write PID', err);
});

clusterManager.start(appConfig, configJSON, startUpConfig, configLocation);

//run as:
//node --harmony zluxCluster.js --config=../deploy/instance/ZLUX/serverConfig/zluxserver.json -h <z/os system> -P <zssPort>
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/
