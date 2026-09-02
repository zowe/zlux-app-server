/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');

const [, , templatePath, outputPath] = process.argv;

if (!templatePath || !outputPath) {
  console.error('generateZssApimlStaticReg - usage: node generateZssApimlStaticReg.js <templatePath> <outputPath>');
  process.exit(1);
}

const ENV_ALIASES = {
  ZSS_PORT: 'ZWE_components_zss_port'
};

let template;
try {
  template = fs.readFileSync(templatePath, 'utf8');
} catch (e) {
  console.error(`ZWED0158E - Could not read template ${templatePath}: ${e.message}`);
  process.exit(1);
}

const rendered = template.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
  const envName = ENV_ALIASES[name] || name;
  const value = process.env[envName];
  return value === undefined ? '' : value;
});

try {
  fs.writeFileSync(outputPath, rendered);
  fs.chmodSync(outputPath, 0o660);
} catch (e) {
  console.error(`generateZssApimlStaticReg - could not write ${outputPath}: ${e.message}`);
  process.exit(1);
}
