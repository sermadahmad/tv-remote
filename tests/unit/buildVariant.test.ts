import { isFixtureBuild } from '../../src/core/buildVariant';

test('production never silently instantiates the fixture adapter', () => {
  expect(isFixtureBuild(true, 'com.sermadahmad.tvremote')).toBe(false);
  expect(isFixtureBuild(true, 'com.sermadahmad.tvremote.dev')).toBe(false);
  expect(isFixtureBuild(false, 'com.sermadahmad.tvremote.uitest')).toBe(false);
  expect(isFixtureBuild('true', 'com.sermadahmad.tvremote.uitest')).toBe(false);
  expect(isFixtureBuild(true, null)).toBe(false);
  expect(isFixtureBuild(true, 'com.sermadahmad.tvremote.uitest')).toBe(true);
});
