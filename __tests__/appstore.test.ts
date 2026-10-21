import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const readJson = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

describe('Metadados da App Store', () => {
  it.each(['appstore/metadata-pt-BR.json', 'appstore/metadata-en-US.json'])('%s respeita os limites do App Store Connect', (file) => {
    const m = readJson(file);
    expect(m.name.length).toBeLessThanOrEqual(30);
    expect(m.subtitle.length).toBeLessThanOrEqual(30);
    expect(m.promotionalText.length).toBeLessThanOrEqual(170);
    expect(m.description.length).toBeLessThanOrEqual(4000);
    expect(m.keywords.length).toBeLessThanOrEqual(100);
    expect(m.whatsNew.length).toBeLessThanOrEqual(4000);
    expect(m.reviewNotes.length).toBeLessThanOrEqual(4000);
    expect(m.supportUrl).toMatch(/^https:\/\//);
    expect(m.privacyPolicyUrl).toMatch(/^https:\/\//);
  });

  it('app.json e eas.json prontos para build iOS', () => {
    const app = readJson('app.json').expo;
    expect(app.ios.bundleIdentifier).toBe('com.fujadosol.app');
    expect(app.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(app.ios.infoPlist.NSLocationWhenInUseUsageDescription.length).toBeGreaterThan(40);
    expect(app.userInterfaceStyle).toBe('automatic');
    const eas = readJson('eas.json');
    expect(Object.keys(eas.build)).toEqual(['development', 'preview', 'production']);
    for (const f of ['assets/icon.png', 'assets/splash-icon.png', 'assets/adaptive-icon.png', 'assets/notification-icon.png', 'assets/favicon.png']) {
      expect(existsSync(join(root, f))).toBe(true);
    }
  });

  it('ícone 1024×1024 sem canal alfa (exigência da Apple)', () => {
    const png = readFileSync(join(root, 'assets/icon.png'));
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
    expect(png[25]).toBe(2); // color type 2 = RGB, sem alfa
  });

  it('documentos de publicação existem', () => {
    for (const f of ['APP_STORE_CONNECT_GUIDE.md', 'PRIVACY_POLICY.md', 'store-checklist.md']) {
      expect(readFileSync(join(root, 'appstore', f), 'utf8').length).toBeGreaterThan(1000);
    }
  });
});
