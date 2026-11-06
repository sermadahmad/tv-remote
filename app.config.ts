import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const uiTest = process.env.APP_VARIANT === 'ui-test';
  const targetSdk = process.env.ANDROID_TARGET_SDK === '37' ? 37 : 36;
  const identifier = `dev.universaltv.remote${uiTest ? '.uitest' : ''}`;
  return {
    ...config,
    name: 'Universal TV Remote',
    slug: uiTest ? 'universal-tv-remote-ui-test' : 'universal-tv-remote',
    scheme: uiTest ? 'universaltvremote-uitest' : 'universaltvremote',
    ios: { ...config.ios, bundleIdentifier: identifier },
    android: {
      ...config.android,
      package: identifier,
      permissions: [
        ...(config.android?.permissions ?? []),
        ...(targetSdk >= 37 ? ['android.permission.ACCESS_LOCAL_NETWORK'] : []),
      ],
    },
    plugins: [
      ...(config.plugins ?? []).filter(
        (plugin) =>
          (typeof plugin === 'string' ? plugin : plugin[0]) !==
          'expo-build-properties',
      ),
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 37,
            targetSdkVersion: targetSdk,
            minSdkVersion: 24,
          },
          ios: { deploymentTarget: '16.4' },
        },
      ],
      ...(uiTest
        ? ([
            [
              'expo-dev-client',
              {
                defaultLaunchURL: 'http://localhost:8081',
                skipOnboarding: true,
                showMenuAtLaunch: false,
                toolsButton: false,
              },
            ],
          ] satisfies NonNullable<ExpoConfig['plugins']>)
        : []),
    ],
    extra: { ...config.extra, uiTest },
  };
}
