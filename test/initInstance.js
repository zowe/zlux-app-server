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

/**
 * Tests for logic from initInstance.js.
 * initInstance.js cannot be required directly because it runs immediately 
 * on require with side effects. The testable functions are reimplemented
 * here to validate the logic.
 */

// Extracted from initInstance.js
const COMPONENTS_TO_ENABLE_BY_DEFAULT = [
  'tn3270-ng2',
  'vt-ng2',
  'explorer-ip',
  'zlux-editor'
];

function getEnabledEmbeddedComponents(embeddedComponents) {
  return embeddedComponents.filter(function(component) {
    const component_to_yaml_name = component.replaceAll('-', '_');
    const explicitlyDisabled = process.env['ZWE_components_'+component_to_yaml_name+'_enabled'] == 'false';
    if (explicitlyDisabled) {
      return false;
    }
    const explicitlyEnabled = process.env['ZWE_components_'+component_to_yaml_name+'_enabled'] == 'true';
    if (explicitlyEnabled) {
      return true;
    }
    return COMPONENTS_TO_ENABLE_BY_DEFAULT.includes(component);
  });
}


describe('initInstance logic', function () {
  describe('getEnabledEmbeddedComponents', function () {
    afterEach(function () {
      // Clean up any env vars we set
      const keys = Object.keys(process.env).filter(function(k) { return k.startsWith('ZWE_components_'); });
      keys.forEach(function(k) { delete process.env[k]; });
    });

    it('should enable components in COMPONENTS_TO_ENABLE_BY_DEFAULT', function () {
      const components = ['tn3270-ng2', 'vt-ng2', 'explorer-ip', 'zlux-editor'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal(components);
    });

    it('should not enable components not in default list', function () {
      const components = ['my-custom-plugin', 'another-plugin'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal([]);
    });

    it('should explicitly enable a component via env var', function () {
      process.env['ZWE_components_my_custom_plugin_enabled'] = 'true';
      const components = ['my-custom-plugin'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal(['my-custom-plugin']);
    });

    it('should explicitly disable a default component via env var', function () {
      process.env['ZWE_components_tn3270_ng2_enabled'] = 'false';
      const components = ['tn3270-ng2', 'vt-ng2'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal(['vt-ng2']);
    });

    it('should handle mixed enabled/disabled', function () {
      process.env['ZWE_components_vt_ng2_enabled'] = 'false';
      process.env['ZWE_components_custom_app_enabled'] = 'true';
      const components = ['tn3270-ng2', 'vt-ng2', 'custom-app', 'unknown-app'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.include('tn3270-ng2');
      expect(result).to.not.include('vt-ng2');
      expect(result).to.include('custom-app');
      expect(result).to.not.include('unknown-app');
    });

    it('should return empty array for empty input', function () {
      const result = getEnabledEmbeddedComponents([]);
      expect(result).to.deep.equal([]);
    });

    it('should replace hyphens with underscores for env var lookup', function () {
      process.env['ZWE_components_my_multi_word_plugin_enabled'] = 'true';
      const components = ['my-multi-word-plugin'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal(['my-multi-word-plugin']);
    });

    it('should treat env var value other than true/false as not set', function () {
      process.env['ZWE_components_tn3270_ng2_enabled'] = 'yes';
      const components = ['tn3270-ng2'];
      // 'yes' is not 'true' or 'false', so falls through to default list check
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal(['tn3270-ng2']);
    });

    it('should disable all default components when explicitly disabled', function () {
      process.env['ZWE_components_tn3270_ng2_enabled'] = 'false';
      process.env['ZWE_components_vt_ng2_enabled'] = 'false';
      process.env['ZWE_components_explorer_ip_enabled'] = 'false';
      process.env['ZWE_components_zlux_editor_enabled'] = 'false';
      const components = ['tn3270-ng2', 'vt-ng2', 'explorer-ip', 'zlux-editor'];
      const result = getEnabledEmbeddedComponents(components);
      expect(result).to.deep.equal([]);
    });
  });

  describe('INSTALLED_COMPONENTS parsing', function () {
    it('should split comma-separated ZWE_INSTALLED_COMPONENTS', function () {
      const env = 'comp1,comp2,comp3';
      const result = env.split(',');
      expect(result).to.deep.equal(['comp1', 'comp2', 'comp3']);
    });

    it('should handle empty ZWE_INSTALLED_COMPONENTS', function () {
      const env = '';
      const result = env ? env.split(',') : [];
      expect(result).to.deep.equal([]);
    });

    it('should handle undefined ZWE_INSTALLED_COMPONENTS', function () {
      const env = undefined;
      const result = env ? env.split(',') : [];
      expect(result).to.deep.equal([]);
    });

    it('should handle single component', function () {
      const env = 'only-one';
      const result = env.split(',');
      expect(result).to.deep.equal(['only-one']);
    });
  });

  describe('ENABLED_COMPONENTS parsing', function () {
    it('should concatenate enabled env with embedded components', function () {
      const enabledEnv = 'a,b';
      const embedded = ['c', 'd'];
      const result = (enabledEnv ? enabledEnv.split(',') : []).concat(embedded);
      expect(result).to.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('should work with only embedded when env is empty', function () {
      const enabledEnv = undefined;
      const embedded = ['c', 'd'];
      const result = (enabledEnv ? enabledEnv.split(',') : []).concat(embedded);
      expect(result).to.deep.equal(['c', 'd']);
    });
  });

  describe('desktopPlugins paths', function () {
    const desktopPlugins = ['ng2desktop', 'ivydesktop'];

    it('should generate recognizer storage paths for both desktop plugins', function () {
      const instanceDir = '/workspace/app-server';
      const paths = desktopPlugins.map(function(plugin) {
        return path.join(instanceDir, 'ZLUX/pluginStorage', 'org.zowe.zlux.' + plugin, 'recognizers');
      });
      expect(paths).to.have.lengthOf(2);
      expect(paths[0]).to.include('org.zowe.zlux.ng2desktop');
      expect(paths[1]).to.include('org.zowe.zlux.ivydesktop');
      paths.forEach(function(p) { expect(p).to.include('recognizers'); });
    });

    it('should generate action storage paths for both desktop plugins', function () {
      const instanceDir = '/workspace/app-server';
      const paths = desktopPlugins.map(function(plugin) {
        return path.join(instanceDir, 'ZLUX/pluginStorage/org.zowe.zlux.' + plugin, 'actions');
      });
      expect(paths).to.have.lengthOf(2);
      paths.forEach(function(p) { expect(p).to.include('actions'); });
    });
  });
});
