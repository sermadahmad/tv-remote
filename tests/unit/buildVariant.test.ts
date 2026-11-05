import { isFixtureBuild } from '../../src/core/buildVariant';

test('production never silently instantiates the fixture adapter', () => {
  expect(isFixtureBuild(true, 'dev.universaltv.remote')).toBe(false);
  expect(isFixtureBuild(false, 'dev.universaltv.remote.uitest')).toBe(false);
  expect(isFixtureBuild('true', 'dev.universaltv.remote.uitest')).toBe(false);
  expect(isFixtureBuild(true, null)).toBe(false);
  expect(isFixtureBuild(true, 'dev.universaltv.remote.uitest')).toBe(true);
});
