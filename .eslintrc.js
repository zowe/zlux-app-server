/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  globals: {
    describe: 'readonly',
    it: 'readonly',
    before: 'readonly',
    after: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
  },
  ignorePatterns: ['.github/**/*.yml', '**/.build', '**/build', '**/dist', '**/node_modules', '**/release', '**/lib','**/test/yaml-loader'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['header'],
  rules: {
    'header/header': [
      2,         // Error level
      'block',   // Location
     [
        '\n  This program and the accompanying materials are' +
       '\n  made available under the terms of the Eclipse Public License v2.0 which accompanies' +
       '\n  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html' +
       '\n  \n  SPDX-License-Identifier: EPL-2.0\n  \n  Copyright Contributors to the Zowe Project.\n'
     ],
      2,
    ],
  },
}
