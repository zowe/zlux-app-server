/*
 This program and the accompanying materials are
 made available under the terms of the Eclipse Public License v2.0 which accompanies
 this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

 SPDX-License-Identifier: EPL-2.0

 Copyright Contributors to the Zowe Project.
*/

const fs = require('fs');
const path = require('path');

const [, , templatePath, outputPath] = process.argv;

if (!templatePath || !outputPath) {
  console.error('generateApimlStaticReg - usage: node generateApimlStaticReg.js <templatePath> <outputPath>');
  process.exit(1);
}

if (templatePath.includes('\0') || outputPath.includes('\0')) {
  console.error('generateApimlStaticReg - invalid path argument');
  process.exit(1);
}

const resolvedTemplatePath = path.resolve(templatePath);
const resolvedOutputPath = path.resolve(outputPath);

let template;
try {
  template = fs.readFileSync(templatePath, 'utf8');
} catch (e) {
  console.error(`ZWED0158E - Could not read template ${templatePath}: ${e.message}`);
  process.exit(1);
}

const rendered = template.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
  const value = process.env[name];
  return value === undefined ? '' : value;
});

try {
  fs.writeFileSync(outputPath, rendered);
  fs.chmodSync(outputPath, 0o660);
} catch (e) {
  console.error(`generateApimlStaticReg - could not write ${outputPath}: ${e.message}`);
  process.exit(1);
}
