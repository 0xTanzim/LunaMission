import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const TEST_ROOT = path.dirname(url.fileURLToPath(import.meta.url));
const DOMAIN_ROOT = path.resolve(TEST_ROOT, '..');

const FORBIDDEN = [
  { pattern: /['"]react['"]/, label: 'react' },
  { pattern: /['"]react-dom\/client['"]/, label: 'react-dom' },
  { pattern: /['"]three['"]/, label: 'three' },
  { pattern: /['"]lucide-react['"]/, label: 'lucide-react' },
  { pattern: /['"]@\/features\//, label: '@/features/' },
  { pattern: /['"]@\/app\//, label: '@/app/' },
  { pattern: /['"]@\/shared\//, label: '@/shared/' },
];

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith('.test.ts') || !entry.name.endsWith('.ts') ? [] : [full];
  });
}

function components(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? components(full) : entry.name.endsWith('.tsx') ? [full] : [];
  });
}

const SRC_ROOT = path.resolve(DOMAIN_ROOT, '..');

/** Modules that hold scenario/scientific state and must stay renderer- and host-agnostic. */
const MODEL_MODULES = [
  DOMAIN_ROOT,
  path.join(SRC_ROOT, 'shared'),
  path.join(SRC_ROOT, 'app', 'scenario', 'state', 'scenarioState.ts'),
  path.join(SRC_ROOT, 'app', 'scenario', 'model', 'scenarioModel.ts'),
];

const BUNDLER_IMPORT = { pattern: /['"](?:vite|@vitejs\/)/, label: 'a bundler API' };

const BROWSER_GLOBAL =
  /(?:^|[^.\w])(window|document|localStorage|sessionStorage|navigator|requestAnimationFrame|cancelAnimationFrame)\s*[.(]/;

/**
 * The only non-component modules allowed to touch the DOM: the inspector's viewport hook, the
 * fullscreen boundary and the three WebGL scene builders. Anything else belongs behind a hook
 * or a component so the model layer stays portable to a non-browser host.
 */
const BROWSER_GLOBALS_ALLOWED = [
  // Reads the viewport height once to decide whether the 3D navigation dock starts collapsed,
  // so the globe is not covered on short screens. Presentation state only.
  'app/state/useScenarioUrlSync.ts',
  'features/accessibility/usePrefersReducedMotion.ts',
  'features/analyze/hooks/usePlayheadAnimation.ts',
  'features/passport/hooks/useInspectorViewport.ts',
  // Reads resolved --lm-color-* custom properties once so canvas drawing uses the same
  // palette as the DOM. Guarded for a non-DOM host; never touches geometry or science.
  'features/sky-ribbon/chartPalette.ts',
  // Canvas surface hook: measures devicePixelRatio and tracks resize for the sky panels.
  'features/sky-ribbon/useSkyCanvasSurface.ts',
  'features/spatial/cesium/cesiumLoader.ts',
  'features/spatial/globe/scene/celestialVectorAssets.ts',
  'features/spatial/globe/scene/globeScene.ts',
  'features/spatial/globe/scene/globeSceneAnimator.ts',
  'features/spatial/globe/scene/globeSurfaceMaterial.ts',
  'features/spatial/hooks/useWorkspaceFullscreen.ts',
  // Reads the viewport height once to decide whether the 3D navigation dock starts collapsed,
  // so the globe is not covered on short screens. Presentation state only.
  'features/spatial/lab/hooks/usePlanetaryTheaterState.ts',
];


function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function tsSourcesUnder(target: string): string[] {
  if (target.endsWith('.ts')) return [target];
  return sources(target);
}

test('Domain boundary: no .tsx module exists under domain/**', () => {
  assert.deepEqual(components(DOMAIN_ROOT).map((f) => path.relative(DOMAIN_ROOT, f)), []);
});

test('Domain boundary: no framework, rendering, feature or presentation import inside domain/**', () => {
  const files = sources(DOMAIN_ROOT);
  assert.ok(files.length > 0, 'expected domain sources to exist');
  const violations = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return FORBIDDEN.filter(({ pattern }) => pattern.test(text)).map(
      ({ label }) => `${path.relative(DOMAIN_ROOT, file)} imports ${label}`,
    );
  });
  assert.deepEqual(violations, []);
});

test('Domain boundary: domain sources are framework-free .ts modules', () => {
  const frameworkImports = sources(DOMAIN_ROOT).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    const hits: string[] = [];
    if (/from ['"]react/.test(text) || /\buseState\(|\buseEffect\(|\buseMemo\(/.test(text)) hits.push('React');
    if (/(?:^|[^\w.])window\.[A-Za-z]/.test(text)) hits.push('window.');
    if (/(?:^|[^\w.])document\.[A-Za-z]/.test(text)) hits.push('document.');
    if (text.includes('localStorage.')) hits.push('localStorage');
    return hits.map((label) => `${path.relative(DOMAIN_ROOT, file)} uses ${label}`);
  });
  assert.deepEqual(frameworkImports, []);
});

test('Model boundaries: shared and scenario-model modules import no renderer, feature or bundler', () => {
  const files = MODEL_MODULES.flatMap(tsSourcesUnder);
  assert.ok(files.length > 0, 'expected model sources to exist');
  const violations = files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return [...FORBIDDEN, BUNDLER_IMPORT]
      .filter(({ pattern }) => pattern.test(text))
      .map(({ label }) => `${path.relative(SRC_ROOT, file)} imports ${label}`);
  });
  assert.deepEqual(violations, []);
});

test('Portability: browser globals stay inside the documented boundary and rendering modules', () => {
  const offenders = sources(SRC_ROOT)
    .filter((file) => BROWSER_GLOBAL.test(stripComments(readFileSync(file, 'utf8'))))
    .map((file) => path.relative(SRC_ROOT, file).split(path.sep).join('/'))
    .sort();
  assert.deepEqual(offenders, BROWSER_GLOBALS_ALLOWED);
});

const FEATURES_ROOT = path.join(SRC_ROOT, 'features');
const SHARED_ROOT = path.join(SRC_ROOT, 'shared');

/** Every module under a folder, including .tsx views, so boundary checks see UI code too. */
function modules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? modules(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function importedSpecifiers(text: string): string[] {
  return [...text.matchAll(/(?:from\s+|import\s+)['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

test('Shared boundary: shared imports neither features nor app', () => {
  const violations = modules(SHARED_ROOT).flatMap((file) =>
    importedSpecifiers(readFileSync(file, 'utf8'))
      .filter((spec) => /^@\/(?:features|app)\//.test(spec))
      .map((spec) => `${path.relative(SRC_ROOT, file)} imports ${spec}`),
  );
  assert.deepEqual(violations, []);
});

test('Feature boundary: a feature imports another feature only through its ui/ root', () => {
  const violations = readdirSync(FEATURES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((directory) =>
      modules(path.join(FEATURES_ROOT, directory.name)).flatMap((file) =>
        importedSpecifiers(readFileSync(file, 'utf8')).flatMap((spec) => {
          const match = /^@\/features\/([^/]+)\/(.+)$/.exec(spec);
          // `ui` itself (a directory import resolving to ui/index.ts) is as public as `ui/…`.
          if (match === null || match[1] === directory.name) return [];
          if (match[2] === 'ui' || match[2].startsWith('ui/')) return [];
          return [`${path.relative(SRC_ROOT, file)} imports ${spec}`];
        }),
      ),
    );
  assert.deepEqual(violations, []);
});
