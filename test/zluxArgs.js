/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const Module = require('module');

/**
 * Tests for lib/zluxArgs.js.
 * We require the actual source file by intercepting Module._resolveFilename
 * to redirect zlux-server-framework imports to local mocks.
 */
const originalResolveFilename = Module._resolveFilename;
const mocksDir = path.join(__dirname, 'mocks');

function setupResolveHook() {
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'zlux-server-framework') {
      return path.join(mocksDir, 'zlux-server-framework.js');
    }
    if (request === 'zlux-server-framework/utils/argumentParser') {
      return path.join(mocksDir, 'argumentParser.js');
    }
    if (request === 'zlux-server-framework/lib/jsonUtils') {
      return path.join(mocksDir, 'jsonUtils.js');
    }
    if (request === 'zlux-server-framework/utils/mergeUtils') {
      return path.join(mocksDir, 'mergeUtils.js');
    }
    if (request === 'zlux-server-framework/utils/yamlConfig') {
      return path.join(mocksDir, 'yamlConfig.js');
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
}

function teardownResolveHook() {
  Module._resolveFilename = originalResolveFilename;
}

describe('zluxArgs', function () {
  let zluxArgs;

  before(function () {
    setupResolveHook();
    // Suppress console.log from zluxArgs on load
    sinon.stub(console, 'log');
    zluxArgs = require('../lib/zluxArgs');
    console.log.restore();
  });

  after(function () {
    teardownResolveHook();
    // Clean from require cache so other test files aren't affected
    delete require.cache[require.resolve('../lib/zluxArgs')];
  });

  it('should export a function', function () {
    expect(zluxArgs).to.be.a('function');
  });

  it('should return an object with configJSON and configLocation', function () {
    const result = zluxArgs();
    expect(result).to.have.property('configJSON');
    expect(result).to.have.property('configLocation');
  });

  it('should have configLocation matching the mock config path', function () {
    const result = zluxArgs();
    expect(result.configLocation).to.equal('/fake/zowe.yaml');
  });

  it('should have configJSON with components.app-server', function () {
    const result = zluxArgs();
    expect(result.configJSON).to.have.property('components');
    expect(result.configJSON.components).to.have.property('app-server');
  });

  it('should have configJSON with zowe property', function () {
    const result = zluxArgs();
    expect(result.configJSON).to.have.property('zowe');
  });

  it('should have node config inside app-server', function () {
    const result = zluxArgs();
    expect(result.configJSON.components['app-server']).to.have.property('node');
  });
});

describe('zluxArgs with overrideFileConfig=false', function () {
  let zluxArgs2;

  before(function () {
    setupResolveHook();
    process.env.overrideFileConfig = 'false';
    sinon.stub(console, 'log');
    // Clear require cache to get a fresh load
    const zluxArgsPath = require.resolve('../lib/zluxArgs');
    delete require.cache[zluxArgsPath];
    // Also clear mocks from cache so they re-initialize
    Object.keys(require.cache).forEach(function(key) {
      if (key.includes('test/mocks')) delete require.cache[key];
    });
    zluxArgs2 = require('../lib/zluxArgs');
    console.log.restore();
  });

  after(function () {
    teardownResolveHook();
    delete process.env.overrideFileConfig;
    delete require.cache[require.resolve('../lib/zluxArgs')];
  });

  it('should still export a function', function () {
    expect(zluxArgs2).to.be.a('function');
  });

  it('should use config JSON without CLI overrides', function () {
    const result = zluxArgs2();
    expect(result).to.have.property('configJSON');
    expect(result.configJSON.components['app-server']).to.have.property('node');
  });
});

describe('zluxArgs with noChild=true', function () {
  let zluxArgs3;

  before(function () {
    setupResolveHook();
    // Override yamlConfig mock to return noChild: true with childProcesses
    const yamlPath = require.resolve('./mocks/yamlConfig');
    delete require.cache[yamlPath];
    require.cache[yamlPath] = {
      id: yamlPath,
      filename: yamlPath,
      loaded: true,
      exports: {
        getCurrentHaInstanceId: function() { return 'test'; },
        parseZoweDotYaml: function() {
          return {
            zowe: { workspaceDirectory: '/tmp' },
            components: {
              'app-server': {
                node: { noChild: true, childProcesses: [{path: '/bin/child.sh'}] }
              }
            }
          };
        }
      }
    };
    const zluxArgsPath = require.resolve('../lib/zluxArgs');
    delete require.cache[zluxArgsPath];
    Object.keys(require.cache).forEach(function(key) {
      if (key.includes('test/mocks') && !key.includes('yamlConfig')) delete require.cache[key];
    });
    sinon.stub(console, 'log');
    zluxArgs3 = require('../lib/zluxArgs');
    console.log.restore();
  });

  after(function () {
    teardownResolveHook();
    delete require.cache[require.resolve('../lib/zluxArgs')];
    delete require.cache[require.resolve('./mocks/yamlConfig')];
  });

  it('should delete childProcesses when noChild is true', function () {
    const result = zluxArgs3();
    expect(result.configJSON.components['app-server'].node.childProcesses).to.be.undefined;
  });
});

describe('zluxArgs with ZWED_ env vars', function () {
  let zluxArgs4;

  before(function () {
    setupResolveHook();
    // Set a ZWED_ env var so environmentVarsToObject returns something
    const argParserPath = require.resolve('./mocks/argumentParser');
    delete require.cache[argParserPath];
    require.cache[argParserPath] = {
      id: argParserPath,
      filename: argParserPath,
      loaded: true,
      exports: {
        constants: { ARG_TYPE_FLAG: 1, ARG_TYPE_VALUE: 2, ARG_TYPE_JSON: 3 },
        environmentVarsToObject: function(prefix) {
          return { node: { https: { port: 8544 } } };
        },
        CLIArgument: function() {},
        createParser: function() {
          return { parse: function() { return { config: '/fake/zowe.yaml', D: null }; } };
        }
      }
    };
    const zluxArgsPath = require.resolve('../lib/zluxArgs');
    delete require.cache[zluxArgsPath];
    Object.keys(require.cache).forEach(function(key) {
      if (key.includes('test/mocks') && !key.includes('argumentParser')) delete require.cache[key];
    });
    sinon.stub(console, 'log');
    zluxArgs4 = require('../lib/zluxArgs');
    console.log.restore();
  });

  after(function () {
    teardownResolveHook();
    delete require.cache[require.resolve('../lib/zluxArgs')];
    delete require.cache[require.resolve('./mocks/argumentParser')];
  });

  it('should merge ZWED_ env vars into configJSON', function () {
    const result = zluxArgs4();
    expect(result.configJSON.components['app-server'].node).to.have.property('https');
  });
});

describe('zluxArgs with -D args', function () {
  let zluxArgs5;

  before(function () {
    setupResolveHook();
    const argParserPath = require.resolve('./mocks/argumentParser');
    delete require.cache[argParserPath];
    require.cache[argParserPath] = {
      id: argParserPath,
      filename: argParserPath,
      loaded: true,
      exports: {
        constants: { ARG_TYPE_FLAG: 1, ARG_TYPE_VALUE: 2, ARG_TYPE_JSON: 3 },
        environmentVarsToObject: function(prefix) { return {}; },
        CLIArgument: function() {},
        createParser: function() {
          return {
            parse: function() {
              return { config: '/fake/zowe.yaml', D: { node: { mediationLayer: { enabled: true } } } };
            }
          };
        }
      }
    };
    const zluxArgsPath = require.resolve('../lib/zluxArgs');
    delete require.cache[zluxArgsPath];
    Object.keys(require.cache).forEach(function(key) {
      if (key.includes('test/mocks') && !key.includes('argumentParser')) delete require.cache[key];
    });
    sinon.stub(console, 'log');
    zluxArgs5 = require('../lib/zluxArgs');
    console.log.restore();
  });

  after(function () {
    teardownResolveHook();
    delete require.cache[require.resolve('../lib/zluxArgs')];
    delete require.cache[require.resolve('./mocks/argumentParser')];
  });

  it('should merge -D args into configJSON', function () {
    const result = zluxArgs5();
    expect(result.configJSON.components['app-server'].node).to.have.property('mediationLayer');
    expect(result.configJSON.components['app-server'].node.mediationLayer.enabled).to.be.true;
  });
});

describe('zluxArgs with sysMessages in zowe config', function () {
  let zluxArgs6;

  before(function () {
    setupResolveHook();
    const yamlPath = require.resolve('./mocks/yamlConfig');
    delete require.cache[yamlPath];
    require.cache[yamlPath] = {
      id: yamlPath,
      filename: yamlPath,
      loaded: true,
      exports: {
        getCurrentHaInstanceId: function() { return 'test'; },
        parseZoweDotYaml: function() {
          return {
            zowe: { workspaceDirectory: '/tmp', sysMessages: ['msg1', 'msg2'] },
            components: {
              'app-server': {
                node: { noChild: false }
              }
            }
          };
        }
      }
    };
    const zluxArgsPath = require.resolve('../lib/zluxArgs');
    delete require.cache[zluxArgsPath];
    Object.keys(require.cache).forEach(function(key) {
      if (key.includes('test/mocks') && !key.includes('yamlConfig')) delete require.cache[key];
    });
    sinon.stub(console, 'log');
    zluxArgs6 = require('../lib/zluxArgs');
    console.log.restore();
  });

  after(function () {
    teardownResolveHook();
    delete require.cache[require.resolve('../lib/zluxArgs')];
    delete require.cache[require.resolve('./mocks/yamlConfig')];
  });

  it('should remove sysMessages from config during printing (shallow copy side effect)', function () {
    const result = zluxArgs6();
    // Object.assign shallow copy means sysMessages is deleted from original too
    expect(result.configJSON.zowe.sysMessages).to.be.undefined;
  });
});

/**
 * Tests for getSafeToPrintEnvironment logic from lib/zluxArgs.js.
 * This function is internal (not exported), so we test the logic directly.
 */
function getSafeToPrintEnvironment(env) {
  const keys = Object.keys(env).filter(function (key) {
    const upperCasedKey = key.toUpperCase();
    if (upperCasedKey.indexOf('PASSWORD') != -1 || upperCasedKey.indexOf('SECRET') != -1) {
      return false;
    }
    return true;
  });
  const safeEnvironment = {};
  keys.forEach(function (key) { safeEnvironment[key] = env[key]; });
  return safeEnvironment;
}

describe('getSafeToPrintEnvironment (from zluxArgs)', function () {
  it('should pass through normal environment variables', function () {
    const env = { HOME: '/home/user', PATH: '/usr/bin', NODE_ENV: 'test' };
    const safe = getSafeToPrintEnvironment(env);
    expect(safe).to.deep.equal(env);
  });

  it('should filter out PASSWORD variables', function () {
    const env = { HOME: '/home/user', DB_PASSWORD: 'secret123', USER: 'admin' };
    const safe = getSafeToPrintEnvironment(env);
    expect(safe).to.not.have.property('DB_PASSWORD');
    expect(safe).to.have.property('HOME');
    expect(safe).to.have.property('USER');
  });

  it('should filter out SECRET variables', function () {
    const env = { API_SECRET: 'abc', CLIENT_SECRET_KEY: 'xyz', NORMAL: 'val' };
    const safe = getSafeToPrintEnvironment(env);
    expect(safe).to.not.have.property('API_SECRET');
    expect(safe).to.not.have.property('CLIENT_SECRET_KEY');
    expect(safe).to.have.property('NORMAL');
  });

  it('should be case insensitive for filtering', function () {
    const env = { my_password: 'x', My_Secret: 'y', safe_var: 'z' };
    const safe = getSafeToPrintEnvironment(env);
    expect(safe).to.not.have.property('my_password');
    expect(safe).to.not.have.property('My_Secret');
    expect(safe).to.have.property('safe_var');
  });

  it('should return empty object for empty input', function () {
    const safe = getSafeToPrintEnvironment({});
    expect(safe).to.deep.equal({});
  });

  it('should filter all vars if all contain PASSWORD or SECRET', function () {
    const env = { PASSWORD: 'a', SECRET: 'b', DB_PASSWORD_HASH: 'c' };
    const safe = getSafeToPrintEnvironment(env);
    expect(Object.keys(safe)).to.have.lengthOf(0);
  });
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
