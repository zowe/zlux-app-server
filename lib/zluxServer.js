/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

'use strict';
import type { ProxyServer } from 'zlux-server-framework';

import { configJSON, configLocation } from './zluxArgs';
const proxyServer = new ProxyServer(configJSON, configLocation);
proxyServer.start().then(() => {
  console.log("ZWED5019I - Started")
}).catch(e => {
  console.log("ZWED5019E - Could not start the server: ", e)
});

//run with start.sh
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

