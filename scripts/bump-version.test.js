import { describe, expect, it } from 'vitest';

import { calculateNextVersion, parseSemVer } from './bump-version.js';

describe('Version Bumping Script (scripts/bump-version.js)', () => {
  describe('parseSemVer', () => {
    it('parses valid semver strings correctly', () => {
      expect(parseSemVer('1.2.3')).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: null,
      });

      expect(parseSemVer('v2.0.0')).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
        prerelease: null,
      });

      expect(parseSemVer('1.0.0-beta.1')).toEqual({
        major: 1,
        minor: 0,
        patch: 0,
        prerelease: 'beta.1',
      });
    });

    it('throws error for invalid version strings', () => {
      expect(() => parseSemVer('invalid')).toThrow(/Format versi/);
      expect(() => parseSemVer('1.0')).toThrow(/Format versi/);
      expect(() => parseSemVer('1.a.3')).toThrow(/Format versi/);
    });
  });

  describe('calculateNextVersion', () => {
    it('bumps patch version correctly', () => {
      expect(calculateNextVersion('1.2.0', 'patch')).toBe('1.2.1');
      expect(calculateNextVersion('1.2.9', 'patch')).toBe('1.2.10');
    });

    it('bumps minor version and resets patch to 0', () => {
      expect(calculateNextVersion('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('bumps major version and resets minor & patch to 0', () => {
      expect(calculateNextVersion('1.2.3', 'major')).toBe('2.0.0');
    });

    it('accepts explicit direct version inputs', () => {
      expect(calculateNextVersion('1.2.0', '2.5.0')).toBe('2.5.0');
      expect(calculateNextVersion('1.2.0', '3.0.0-rc.1')).toBe('3.0.0-rc.1');
    });
  });
});
