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

// Canonicalize the supplied paths and reject embedded NUL bytes so that
// path traversal / injection sequences cannot be used to read or write
// unexpected filesystem locations.
const resolvedTemplatePath = path.resolve(templatePath);
const resolvedOutputPath = path.resolve(outputPath);
if (templatePath.indexOf('\0') !== -1 || outputPath.indexOf('\0') !== -1) {
  console.error('generateApimlStaticReg - invalid characters in provided path');
  process.exit(1);
}

let template;
try {
  template = fs.readFileSync(resolvedTemplatePath, 'utf8');
} catch (e) {
  console.error(`ZWED0158E - Could not read template ${resolvedTemplatePath}: ${e.message}`);
  process.exit(1);
}

const rendered = template.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, name) => {
  const value = process.env[name];
  return value === undefined ? '' : value;
});

try {
  fs.writeFileSync(resolvedOutputPath, rendered);
  fs.chmodSync(resolvedOutputPath, 0o660);
} catch (e) {
  console.error(`generateApimlStaticReg - could not write ${resolvedOutputPath}: ${e.message}`);
  process.exit(1);
}
