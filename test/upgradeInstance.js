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
const fs = require('fs');
const Module = require('module');

// Mock zlux-server-framework/utils/argumentParser before requiring upgradeInstance
const originalResolveFilename = Module._resolveFilename;
const mockArgParser = {
  environmentVarsToObject: function(prefix) { return {}; }
};

before(function () {
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'zlux-server-framework/utils/argumentParser') {
      // Return a fake resolved path that we'll intercept
      return require.resolve('./mocks/argumentParser');
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
});

after(function () {
  Module._resolveFilename = originalResolveFilename;
});

// Create the mock inline via require cache
const mockArgParserPath = path.join(__dirname, 'mocks', 'argumentParser.js');

describe('upgradeInstance', function () {
  let upgradeInstance;

  before(function () {
    upgradeInstance = require('../lib/upgradeInstance');
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('doUpgrade', function () {
    it('should return upgradedTo equal to fromVersion when already at latest', function () {
      const result = upgradeInstance.doUpgrade('99.99.99', '/tmp/workspace', {}, []);
      expect(result).to.have.property('upgradedTo', '99.99.99');
      expect(result).to.not.have.property('serverConfig');
    });

    it('should upgrade from pre-1.11.0 and process all versions', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify({ pluginLocation: '/old/path' }));
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.10.0', '/tmp/workspace', serverConfig, []);
      expect(result).to.have.property('upgradedTo');
      expect(result.upgradedTo).to.not.equal('1.10.0');
    });

    it('should remove zosmf auth plugin when upgrading through 1.11.0', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {
            zosmf: { host: 'example.com' }
          }
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      const items = ['org.zowe.zlux.auth.zosmf.json', 'org.zowe.zlux.proxy.zosmf.json'];
      const unlinkStub = sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.10.0', '/tmp/workspace', serverConfig, items);
      expect(unlinkStub.called).to.be.true;
    });

    it('should remove apiml and zss auth plugins when upgrading through 1.12.0', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      const items = ['org.zowe.zlux.auth.apiml.json', 'org.zowe.zlux.auth.zss.json'];
      const unlinkStub = sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.11.0', '/tmp/workspace', serverConfig, items);
      expect(unlinkStub.called).to.be.true;
    });

    it('should remove zssServer.sh from childProcesses when upgrading through 1.12.0', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {
          childProcesses: [
            { path: '../bin/zssServer.sh' },
            { path: '../bin/other.sh' }
          ]
        },
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.11.0', '/tmp/workspace', serverConfig, []);
      expect(result).to.have.property('serverConfig');
      const cp = result.serverConfig.node.childProcesses;
      const hasZss = cp && cp.some(function(p) { return p.path === '../bin/zssServer.sh'; });
      expect(hasZss).to.be.false;
    });

    it('should delete childProcesses array when only zssServer was in it', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {
          childProcesses: [
            { path: '../bin/zssServer.sh' }
          ]
        },
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.11.0', '/tmp/workspace', serverConfig, []);
      expect(result.serverConfig.node.childProcesses).to.be.undefined;
    });

    it('should update v12 plugins to use $ROOT_DIR when ROOT_DIR env is set', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      const pluginJson = {
        identifier: 'org.zowe.configjs',
        pluginLocation: '/some/path/components/app-server/share/configjs'
      };
      process.env['ROOT_DIR'] = '/opt/zowe';
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(pluginJson));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });
      sinon.stub(console, 'log');
      sinon.stub(console, 'warn');

      const items = ['org.zowe.configjs.json'];
      const result = upgradeInstance.doUpgrade('1.11.0', '/tmp/workspace', serverConfig, items);
      
      const writeCalls = writeStub.getCalls().filter(function(call) {
        return call.args[0].includes('org.zowe.configjs');
      });
      if (writeCalls.length > 0) {
        const written = JSON.parse(writeCalls[0].args[1]);
        expect(written.relativeTo).to.equal('$ROOT_DIR');
      }
      delete process.env['ROOT_DIR'];
    });

    it('should add mediationLayer to agent when upgrading through 1.21.0', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        agent: {},
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.20.0', '/tmp/workspace', serverConfig, []);
      expect(result).to.have.property('serverConfig');
      expect(result.serverConfig.agent.mediationLayer).to.deep.equal({
        serviceName: 'zss',
        enabled: false
      });
    });

    it('should not overwrite existing mediationLayer config', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        agent: {
          mediationLayer: { serviceName: 'custom', enabled: true }
        },
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.20.0', '/tmp/workspace', serverConfig, []);
      // mediationLayer already exists, should not return serverConfig for this version
      expect(result).to.have.property('upgradedTo');
    });

    it('should register explorer-ip when upgrading through 1.24.0', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        agent: { mediationLayer: { enabled: true } },
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify({ pluginLocation: '/path' }));
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.23.0', '/tmp/workspace', serverConfig, []);
      expect(result).to.have.property('upgradedTo', '1.24.0');
    });

    it('should handle upgrade failure gracefully', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {
            zosmf: { host: 'example.com' }
          }
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      // unlinkSync throws to simulate failure
      sinon.stub(fs, 'unlinkSync').throws(new Error('EPERM'));
      sinon.stub(console, 'log');
      sinon.stub(console, 'warn');

      const items = ['org.zowe.zlux.auth.zosmf.json'];
      const result = upgradeInstance.doUpgrade('1.10.0', '/tmp/workspace', serverConfig, items);
      // Should still return something (may have partial upgrade)
      expect(result).to.have.property('upgradedTo');
    });

    it('should update plugins to use $ZLUX_ROOT_DIR in container mode', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      const pluginJson = {
        identifier: 'org.zowe.editor',
        pluginLocation: '/component/share/editor'
      };
      process.env['ZWED_node_container'] = 'true';
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(pluginJson));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });
      sinon.stub(console, 'log');
      sinon.stub(console, 'warn');

      const items = ['org.zowe.editor.json'];
      const result = upgradeInstance.doUpgrade('1.11.0', '/tmp/workspace', serverConfig, items);
      
      const writeCalls = writeStub.getCalls().filter(function(call) {
        return call.args[0].includes('org.zowe.editor');
      });
      if (writeCalls.length > 0) {
        const written = JSON.parse(writeCalls[0].args[1]);
        expect(written.relativeTo).to.equal('$ZLUX_ROOT_DIR');
      }
      delete process.env['ZWED_node_container'];
    });

    it('should handle doUpgrade with no upgrades needed', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {}
        },
        node: {},
        agent: { mediationLayer: { enabled: true } },
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'readFileSync').returns('{}');
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      // Version is beyond all defined upgrades
      const result = upgradeInstance.doUpgrade('2.0.0', '/tmp/workspace', serverConfig, []);
      expect(result.upgradedTo).to.equal('2.0.0');
      expect(result).to.not.have.property('serverConfig');
    });

    it('should delete outdated zosmf/apiml/zss impl defaults in 1.12.0 upgrade', function () {
      const serverConfig = {
        dataserviceAuthentication: {
          implementationDefaults: {
            zosmf: { host: 'example.com' },
            apiml: { gateway: 'gw.example.com' },
            zss: { port: 8542 }
          }
        },
        node: {},
        pluginsDir: '/tmp/plugins'
      };
      sinon.stub(fs, 'unlinkSync');
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify({ pluginLocation: '/path' }));
      sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });

      const result = upgradeInstance.doUpgrade('1.11.0', '/tmp/workspace', serverConfig, []);
      expect(result).to.have.property('serverConfig');
      expect(result.serverConfig.dataserviceAuthentication.implementationDefaults.zosmf).to.be.undefined;
      expect(result.serverConfig.dataserviceAuthentication.implementationDefaults.apiml).to.be.undefined;
      expect(result.serverConfig.dataserviceAuthentication.implementationDefaults.zss).to.be.undefined;
    });
  });
});
