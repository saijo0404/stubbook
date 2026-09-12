import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Apps/Mobile - Native Shell Package', () => {
  it('應正確宣告 Capacitor 原生雙端平台依賴', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.name).toBe('@stubbook/mobile');
    expect(pkg.dependencies['@capacitor/android']).toBeDefined();
    expect(pkg.dependencies['@capacitor/ios']).toBeDefined();
    expect(pkg.dependencies['@capacitor/core']).toBeDefined();
    expect(pkg.dependencies['@capacitor/camera']).toBeDefined();
    expect(pkg.dependencies['@capacitor/filesystem']).toBeDefined();
    expect(pkg.dependencies['@capacitor/haptics']).toBeDefined();
    expect(pkg.dependencies['@capacitor/network']).toBeDefined();
    expect(pkg.dependencies['@capacitor/status-bar']).toBeDefined();
  });
});
