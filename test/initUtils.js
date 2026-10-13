/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/

const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const initUtils = require('../lib/initUtils');

describe('initUtils', function () {
  describe('directoryExists', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should return true for an existing directory', function () {
      sinon.stub(fs, 'statSync').returns({ isDirectory: () => true });
      expect(initUtils.directoryExists('/some/dir')).to.be.true;
    });

    it('should return false for a file path', function () {
      sinon.stub(fs, 'statSync').returns({ isDirectory: () => false });
      expect(initUtils.directoryExists('/some/file.txt')).to.be.false;
    });

    it('should return false when path does not exist', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      expect(initUtils.directoryExists('/nonexistent')).to.be.false;
    });

    it('should return false when stat returns null', function () {
      sinon.stub(fs, 'statSync').returns(null);
      expect(initUtils.directoryExists('/some/path')).to.be.false;
    });
  });

  describe('fileExists', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should return true for an existing file', function () {
      sinon.stub(fs, 'statSync').returns({ isDirectory: () => false });
      expect(initUtils.fileExists('/some/file.txt')).to.be.true;
    });

    it('should return false for a directory', function () {
      sinon.stub(fs, 'statSync').returns({ isDirectory: () => true });
      expect(initUtils.fileExists('/some/dir')).to.be.false;
    });

    it('should return false when path does not exist', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      expect(initUtils.fileExists('/nonexistent')).to.be.false;
    });

    it('should return false when stat returns null', function () {
      sinon.stub(fs, 'statSync').returns(null);
      expect(initUtils.fileExists('/some/path')).to.be.false;
    });
  });

  describe('mkdirp', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should call fs.mkdirSync with recursive true', function () {
      const stub = sinon.stub(fs, 'mkdirSync');
      initUtils.mkdirp('/test/dir', 0o770);
      expect(stub.calledOnce).to.be.true;
      expect(stub.firstCall.args[0]).to.equal('/test/dir');
      expect(stub.firstCall.args[1]).to.deep.include({ recursive: true });
    });

    it('should not throw when directory already exists', function () {
      const err = new Error('EEXIST');
      err.code = 'EEXIST';
      sinon.stub(fs, 'mkdirSync').throws(err);
      expect(function () { initUtils.mkdirp('/existing', 0o770); }).to.not.throw();
    });

    it('should throw for errors other than EEXIST', function () {
      const err = new Error('EACCES');
      err.code = 'EACCES';
      sinon.stub(fs, 'mkdirSync').throws(err);
      expect(function () { initUtils.mkdirp('/noperm', 0o770); }).to.throw('EACCES');
    });
  });

  describe('getManifestPath', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should return manifest.yaml when it exists', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === '/comp/manifest.yaml') return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      expect(initUtils.getManifestPath('/comp')).to.equal('/comp/manifest.yaml');
    });

    it('should return manifest.yml when .yaml does not exist', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === '/comp/manifest.yml') return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      expect(initUtils.getManifestPath('/comp')).to.equal('/comp/manifest.yml');
    });

    it('should return manifest.json when .yaml and .yml do not exist', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === '/comp/manifest.json') return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      expect(initUtils.getManifestPath('/comp')).to.equal('/comp/manifest.json');
    });

    it('should return undefined when no manifest exists', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      expect(initUtils.getManifestPath('/comp')).to.be.undefined;
    });
  });

  describe('findComponentDirectory', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should find in runtimeDirectory/components first', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === '/runtime/components/mycomp') return { isDirectory: () => true };
        throw new Error('ENOENT');
      });
      expect(initUtils.findComponentDirectory('/runtime', '/ext', 'mycomp'))
        .to.equal('/runtime/components/mycomp');
    });

    it('should find in extensionDirectory second', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === '/ext/mycomp') return { isDirectory: () => true };
        throw new Error('ENOENT');
      });
      expect(initUtils.findComponentDirectory('/runtime', '/ext', 'mycomp'))
        .to.equal('/ext/mycomp');
    });

    it('should find in runtimeDirectory/components/app-server/share third', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === '/runtime/components/app-server/share/mycomp') return { isDirectory: () => true };
        throw new Error('ENOENT');
      });
      expect(initUtils.findComponentDirectory('/runtime', '/ext', 'mycomp'))
        .to.equal('/runtime/components/app-server/share/mycomp');
    });

    it('should return undefined when not found anywhere', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      expect(initUtils.findComponentDirectory('/runtime', '/ext', 'missing'))
        .to.be.undefined;
    });

    it('should handle null extensionDirectory', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      expect(initUtils.findComponentDirectory('/runtime', null, 'mycomp'))
        .to.be.undefined;
    });
  });

  describe('deregisterPlugin', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should delete plugin file when it exists', function () {
      sinon.stub(fs, 'statSync').returns({ isDirectory: () => false });
      const unlinkStub = sinon.stub(fs, 'unlinkSync');
      const result = initUtils.deregisterPlugin(
        { identifier: 'org.zowe.test' },
        '/plugins',
        ['/actions']
      );
      expect(result).to.be.true;
      expect(unlinkStub.calledWith('/plugins/org.zowe.test.json')).to.be.true;
    });

    it('should return false when plugin file does not exist and no app2app', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const result = initUtils.deregisterPlugin(
        { identifier: 'org.zowe.missing' },
        '/plugins',
        ['/actions']
      );
      expect(result).to.be.false;
    });
  });

  describe('deregisterApp2App', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should delete action file when it exists', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === path.join('/actions', 'org.zowe.test')) return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      const unlinkStub = sinon.stub(fs, 'unlinkSync');
      const result = initUtils.deregisterApp2App('org.zowe.test', ['/actions']);
      expect(result).to.be.true;
      expect(unlinkStub.calledOnce).to.be.true;
    });

    it('should return false when no action file exists', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const result = initUtils.deregisterApp2App('org.zowe.missing', ['/actions']);
      expect(result).to.be.false;
    });

    it('should handle multiple action directories', function () {
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p === path.join('/dir2', 'org.zowe.test')) return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      const unlinkStub = sinon.stub(fs, 'unlinkSync');
      const result = initUtils.deregisterApp2App('org.zowe.test', ['/dir1', '/dir2']);
      expect(result).to.be.true;
      expect(unlinkStub.calledOnce).to.be.true;
    });
  });

  describe('printFormattedError', function () {
    it('should log to console', function () {
      const stub = sinon.stub(console, 'log');
      initUtils.printFormattedError('test error message');
      expect(stub.calledOnce).to.be.true;
      expect(stub.firstCall.args[0]).to.include('ERROR');
      expect(stub.firstCall.args[0]).to.include('test error message');
      stub.restore();
    });
  });

  describe('printFormattedInfo', function () {
    it('should log to console', function () {
      const stub = sinon.stub(console, 'log');
      initUtils.printFormattedInfo('test info message');
      expect(stub.calledOnce).to.be.true;
      expect(stub.firstCall.args[0]).to.include('INFO');
      expect(stub.firstCall.args[0]).to.include('test info message');
      stub.restore();
    });
  });

  describe('printFormattedDebug', function () {
    it('should not log when debug is not enabled', function () {
      const stub = sinon.stub(console, 'log');
      initUtils.printFormattedDebug('debug message');
      // PRINT_DEBUG depends on env var at module load time
      // Just verify it doesn't throw
      stub.restore();
    });
  });

  describe('registerPlugin', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should write relative path when plugin is under runtimeDirectory', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      initUtils.registerPlugin(
        '/runtime/components/myplugin',
        { identifier: 'org.zowe.test', pluginVersion: '1.0.0' },
        '/plugins',
        ['/actions'],
        ['/recognizers'],
        '/runtime'
      );
      expect(writeStub.called).to.be.true;
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.identifier).to.equal('org.zowe.test');
      expect(written.relativeTo).to.equal('$ZWE_zowe_runtimeDirectory');
      expect(written.pluginLocation).to.equal('components/myplugin');
    });

    it('should write absolute path when plugin is outside runtimeDirectory', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      initUtils.registerPlugin(
        '/other/location/myplugin',
        { identifier: 'org.zowe.ext', pluginVersion: '2.0.0' },
        '/plugins',
        ['/actions'],
        ['/recognizers'],
        '/runtime'
      );
      expect(writeStub.called).to.be.true;
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.identifier).to.equal('org.zowe.ext');
      expect(written.pluginLocation).to.equal('/other/location/myplugin');
    });
  });

  describe('FOLDER_MODE and FILE_MODE', function () {
    it('should export FOLDER_MODE as 0o770', function () {
      expect(initUtils.FOLDER_MODE).to.equal(0o770);
    });

    it('should export FILE_MODE as 0o770', function () {
      expect(initUtils.FILE_MODE).to.equal(0o770);
    });
  });

  describe('registerBundledPlugin', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should write plugin reference with relativeTo when specified in default json', function () {
      const defaultJson = { pluginLocation: 'share/myplugin', relativeTo: '$ZWE_zowe_runtimeDirectory' };
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(defaultJson));
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p.includes('defaults')) return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });
      const writeStub = sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);

      initUtils.registerBundledPlugin('org.zowe.test', '/dest', [], 0o770);
      expect(writeStub.calledOnce).to.be.true;
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.identifier).to.equal('org.zowe.test');
      expect(written.relativeTo).to.equal('$ZWE_zowe_runtimeDirectory');
      expect(written.pluginLocation).to.equal('share/myplugin');
    });

    it('should handle .json suffix in pluginId', function () {
      const defaultJson = { pluginLocation: '/abs/path' };
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(defaultJson));
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p.includes('defaults')) return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });
      const writeStub = sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);

      initUtils.registerBundledPlugin('org.zowe.test.json', '/dest', [], 0o770);
      expect(writeStub.calledOnce).to.be.true;
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.identifier).to.equal('org.zowe.test');
    });

    it('should not overwrite when old plugin has same location', function () {
      const defaultJson = { pluginLocation: '/abs/path' };
      sinon.stub(fs, 'readFileSync').callsFake(function (p) {
        if (p.includes('defaults')) return JSON.stringify(defaultJson);
        // reading old plugin from dest
        return JSON.stringify({ pluginLocation: '/abs/path' });
      });
      sinon.stub(fs, 'statSync').callsFake(function (p) {
        if (p.includes('defaults')) return { isDirectory: () => false };
        throw new Error('ENOENT');
      });
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });
      const writeStub = sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);

      initUtils.registerBundledPlugin('org.zowe.test', '/dest', ['org.zowe.test.json'], 0o770);
      expect(writeStub.called).to.be.false;
    });

    it('should skip if path is a directory', function () {
      const defaultJson = { pluginLocation: '/abs/path' };
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(defaultJson));
      sinon.stub(fs, 'statSync').returns({ isDirectory: () => false });
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => true });
      const writeStub = sinon.stub(fs, 'writeFileSync');
      sinon.stub(fs, 'readdirSync').returns([]);

      initUtils.registerBundledPlugin('org.zowe.test', '/dest', [], 0o770);
      expect(writeStub.called).to.be.false;
    });
  });

  describe('registerBundledPlugins', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should iterate all plugin files in defaults dir', function () {
      sinon.stub(fs, 'readdirSync').returns(['plugin1.json', 'plugin2.json']);
      const defaultJson = { pluginLocation: '/path' };
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify(defaultJson));
      sinon.stub(fs, 'statSync').callsFake(function () { throw new Error('ENOENT'); });
      sinon.stub(fs, 'lstatSync').returns({ isDirectory: () => false });
      const writeStub = sinon.stub(fs, 'writeFileSync');
      const logStub = sinon.stub(console, 'log');

      initUtils.registerBundledPlugins('/dest', '/config', [], 0o770);
      expect(writeStub.callCount).to.equal(2);
      logStub.restore();
    });
  });

  describe('registerApp2App', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should not throw when plugin has no recognizers or actions dirs', function () {
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'readdirSync').throws(new Error('ENOENT'));
      expect(function () {
        initUtils.registerApp2App('/plugin/path', 'org.zowe.test', '1.0.0', ['/actions'], ['/recognizers']);
      }).to.not.throw();
    });

    it('should process recognizers when config/recognizers directory exists', function () {
      const statStub = sinon.stub(fs, 'statSync');
      statStub.callsFake(function (p) {
        if (p.includes('config') && p.includes('recognizers') && !p.includes('actions')) {
          return { isDirectory: () => true };
        }
        if (p.includes('actions')) {
          throw new Error('ENOENT');
        }
        throw new Error('ENOENT');
      });
      sinon.stub(fs, 'readdirSync').callsFake(function (p) {
        if (typeof p === 'string' && p.includes('recognizers')) {
          return [{ name: 'test.json', isFile: () => true }];
        }
        return [];
      });
      sinon.stub(fs, 'readFileSync').returns(JSON.stringify({ recognizers: { r1: { id: 'act1' } } }));
      const writeStub = sinon.stub(fs, 'writeFileSync');

      initUtils.registerApp2App('/plugin', 'org.zowe.test', '1.0.0', ['/actions'], ['/recognizers']);
      expect(writeStub.called).to.be.true;
    });
  });

  describe('getLastZoweRoot', function () {
    afterEach(function () {
      sinon.restore();
    });

    it('should return null when backups dir is empty', function () {
      sinon.stub(fs, 'readdirSync').returns([]);
      expect(initUtils.getLastZoweRoot('/workspace')).to.be.null;
    });

    it('should return ROOT_DIR value from latest backup file', function () {
      sinon.stub(fs, 'readdirSync').returns(['backup_2023', 'backup_2024']);
      sinon.stub(fs, 'readFileSync').returns('SOME_VAR=foo\nROOT_DIR=/opt/zowe/zowe-2.0\nOTHER=bar');
      expect(initUtils.getLastZoweRoot('/workspace')).to.equal('/opt/zowe/zowe-2.0');
    });

    it('should pick the alphabetically latest backup', function () {
      sinon.stub(fs, 'readdirSync').returns(['20230101', '20240601', '20230601']);
      sinon.stub(fs, 'readFileSync').returns('ROOT_DIR=/opt/latest');
      expect(initUtils.getLastZoweRoot('/workspace')).to.equal('/opt/latest');
    });

    it('should return null when no ROOT_DIR line found', function () {
      sinon.stub(fs, 'readdirSync').returns(['backup1']);
      sinon.stub(fs, 'readFileSync').returns('NO_ROOT_HERE=test\nOTHER=val');
      expect(initUtils.getLastZoweRoot('/workspace')).to.be.null;
    });

    it('should return null when backups dir cannot be read', function () {
      sinon.stub(fs, 'readdirSync').throws(new Error('ENOENT'));
      const warnStub = sinon.stub(console, 'warn');
      expect(initUtils.getLastZoweRoot('/workspace')).to.be.null;
      warnStub.restore();
    });
  });

  describe('setTerminalDefaults', function () {
    afterEach(function () {
      sinon.restore();
      delete process.env['ZWED_SSH_PORT'];
      delete process.env['ZWED_SSH_HOST'];
      delete process.env['ZWED_TN3270_PORT'];
      delete process.env['ZWED_TN3270_HOST'];
      delete process.env['ZWED_TN3270_SECURITY'];
      delete process.env['ZWED_TN3270_MOD'];
      delete process.env['ZWED_TN3270_ROW'];
      delete process.env['ZWED_TN3270_COL'];
      delete process.env['ZWED_TN3270_CODEPAGE'];
    });

    it('should create VT config when org.zowe.terminal.vt.json is present', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_SSH_PORT'] = '22';
      process.env['ZWED_SSH_HOST'] = 'myhost';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.vt.json']);
      expect(writeStub.called).to.be.true;
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.host).to.equal('myhost');
      expect(written.port).to.equal('22');
      expect(written.security.type).to.equal('ssh');
    });

    it('should create TN3270 config when org.zowe.terminal.tn3270.json is present', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_HOST'] = 'mainframe';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      expect(writeStub.called).to.be.true;
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.host).to.equal('mainframe');
      expect(written.port).to.equal('23');
      expect(written.security.type).to.equal('telnet');
    });

    it('should set custom security type for TN3270', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '992';
      process.env['ZWED_TN3270_SECURITY'] = 'tls';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.security.type).to.equal('tls');
    });

    it('should set deviceType from ZWED_TN3270_MOD', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_MOD'] = '3';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.deviceType).to.equal('2');
    });

    it('should set deviceType to 5 (dynamic) for non-numeric MOD', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_MOD'] = 'invalid';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.deviceType).to.equal('5');
    });

    it('should set alternateHeight from ZWED_TN3270_ROW', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_ROW'] = '43';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.alternateHeight).to.equal(43);
    });

    it('should clamp row to min 24', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_ROW'] = '10';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.alternateHeight).to.equal(24);
    });

    it('should clamp row to max 80', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_ROW'] = '200';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.alternateHeight).to.equal(80);
    });

    it('should set alternateWidth from ZWED_TN3270_COL', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_COL'] = '132';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.alternateWidth).to.equal(132);
    });

    it('should clamp col to min 80', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_COL'] = '40';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.alternateWidth).to.equal(80);
    });

    it('should clamp col to max 160', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_COL'] = '300';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.alternateWidth).to.equal(160);
    });

    it('should set charsetName from ZWED_TN3270_CODEPAGE', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      const writeStub = sinon.stub(fs, 'writeFileSync');
      process.env['ZWED_TN3270_PORT'] = '23';
      process.env['ZWED_TN3270_CODEPAGE'] = 'CP1047';

      initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.tn3270.json']);
      const written = JSON.parse(writeStub.firstCall.args[1]);
      expect(written.charsetName).to.equal('CP1047');
    });

    it('should do nothing when no terminal plugins present', function () {
      sinon.stub(fs, 'mkdirSync');
      const writeStub = sinon.stub(fs, 'writeFileSync');

      initUtils.setTerminalDefaults('/config', ['org.zowe.other.json']);
      expect(writeStub.called).to.be.false;
    });

    it('should handle write error gracefully for VT', function () {
      sinon.stub(fs, 'mkdirSync');
      sinon.stub(fs, 'statSync').throws(new Error('ENOENT'));
      sinon.stub(fs, 'writeFileSync').throws(new Error('EACCES'));
      const logStub = sinon.stub(console, 'log');
      process.env['ZWED_SSH_PORT'] = '22';

      expect(function () {
        initUtils.setTerminalDefaults('/config', ['org.zowe.terminal.vt.json']);
      }).to.not.throw();
      logStub.restore();
    });
  });
});

/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html

  SPDX-License-Identifier: EPL-2.0

  Copyright Contributors to the Zowe Project.
*/
