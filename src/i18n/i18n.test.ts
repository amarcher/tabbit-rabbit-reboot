import en from './en.json';
import es from './es.json';
import hi from './hi.json';
import pt from './pt.json';
import ko from './ko.json';
import ja from './ja.json';
import zh from './zh.json';
import de from './de.json';
import ru from './ru.json';
import fr from './fr.json';
import itIT from './it.json';
import vi from './vi.json';

/** Recursively collect all leaf key paths from a nested object. */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

/** Collect interpolation tokens like {{name}} from a string value. */
function collectTokens(value: string): string[] {
  const matches = value.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.sort() : [];
}

/** Collect all interpolation tokens from all leaf values, keyed by path. */
function collectAllTokens(obj: Record<string, unknown>, prefix = ''): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, collectAllTokens(v as Record<string, unknown>, path));
    } else if (typeof v === 'string') {
      const tokens = collectTokens(v);
      if (tokens.length > 0) {
        result[path] = tokens;
      }
    }
  }
  return result;
}

const TRANSLATIONS: Record<string, Record<string, unknown>> = {
  en, es, hi, pt, ko, ja, zh, de, ru, fr, it: itIT, vi,
};

// Russian has extra plural forms (_few, _many) that English doesn't have.
// These are expected additions, not errors.
const RUSSIAN_EXTRA_PLURAL_KEYS = [
  'totals.unassignedWarning_few',
  'totals.unassignedWarning_many',
];

const enKeys = collectKeys(en);
const enTokens = collectAllTokens(en);

describe('i18n translation completeness', () => {
  const languages = Object.keys(TRANSLATIONS).filter((l) => l !== 'en');

  for (const lang of languages) {
    describe(`${lang}`, () => {
      const langKeys = collectKeys(TRANSLATIONS[lang]);
      const extraPluralKeys = lang === 'ru' ? RUSSIAN_EXTRA_PLURAL_KEYS : [];

      it('has all keys from English', () => {
        const missing = enKeys.filter((k) => !langKeys.includes(k));
        if (missing.length > 0) {
          fail(`Missing ${missing.length} key(s) in ${lang}:\n  ${missing.join('\n  ')}`);
        }
      });

      it('has no unexpected extra keys', () => {
        const extra = langKeys.filter(
          (k) => !enKeys.includes(k) && !extraPluralKeys.includes(k)
        );
        if (extra.length > 0) {
          fail(`Unexpected ${extra.length} extra key(s) in ${lang}:\n  ${extra.join('\n  ')}`);
        }
      });

      it('preserves all interpolation tokens', () => {
        const langTokens = collectAllTokens(TRANSLATIONS[lang]);
        const mismatches: string[] = [];

        for (const [key, expectedTokens] of Object.entries(enTokens)) {
          const actualTokens = langTokens[key];
          if (!actualTokens) {
            // Key might be missing — covered by the "has all keys" test
            continue;
          }
          const expectedStr = expectedTokens.join(', ');
          const actualStr = actualTokens.join(', ');
          if (expectedStr !== actualStr) {
            mismatches.push(
              `${key}: expected [${expectedStr}], got [${actualStr}]`
            );
          }
        }

        // Also check extra plural keys for Russian — they should have
        // the same tokens as their base _one/_other siblings.
        if (lang === 'ru') {
          for (const extraKey of extraPluralKeys) {
            const baseKey = extraKey.replace(/_few$|_many$/, '_one');
            const baseTokens = enTokens[baseKey];
            const extraTokens = langTokens[extraKey];
            if (baseTokens && extraTokens) {
              const baseStr = baseTokens.join(', ');
              const extraStr = extraTokens.join(', ');
              if (baseStr !== extraStr) {
                mismatches.push(
                  `${extraKey}: expected [${baseStr}] (from ${baseKey}), got [${extraStr}]`
                );
              }
            }
          }
        }

        if (mismatches.length > 0) {
          fail(
            `Token mismatches in ${lang}:\n  ${mismatches.join('\n  ')}`
          );
        }
      });
    });
  }
});

describe('i18n supported languages config', () => {
  it('all translation files are registered', () => {
    // This test ensures that if a new JSON file is added to the imports
    // above, it also gets added to the TRANSLATIONS object.
    const registeredLangs = Object.keys(TRANSLATIONS).sort();
    expect(registeredLangs).toEqual(
      ['de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'vi', 'zh']
    );
  });

  it('English has a reasonable number of keys', () => {
    // Sanity check — if this drops significantly, keys were accidentally removed
    expect(enKeys.length).toBeGreaterThan(150);
  });
});
