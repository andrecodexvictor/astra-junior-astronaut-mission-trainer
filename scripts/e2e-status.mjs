console.error('PENDING: no real browser/GPU test was performed in the managed authoring environment.');
console.error('Follow docs/demo/BROWSER_SMOKE.md on Chrome with WebGL 2, record commit/device/viewport and evidence.');
console.error('This command deliberately exits with status 2; unit/NullEngine results are not browser acceptance.');
process.exitCode=2;
