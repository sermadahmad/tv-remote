import type { ConfigContext, ExpoConfig } from 'expo/config';

import buildIdentity from './src/core/buildIdentity.json';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const uiTest = process.env.APP_VARIANT === 'ui-test';
  const development = process.env.APP_VARIANT === 'development';
  const targetSdk = process.env.ANDROID_TARGET_SDK === '37' ? 37 : 36;
  const identifier = uiTest
    ? buildIdentity.uiTestApplicationId
    : development
      ? buildIdentity.developmentApplicationId
      : buildIdentity.applicationId;
  return {
    ...config,
    name: development ? 'Universal TV Remote Dev' : 'Universal TV Remote',
    slug: buildIdentity.slug,
    owner: buildIdentity.owner,
    scheme: uiTest
      ? 'universaltvremote-uitest'
      : development
        ? 'universaltvremote-dev'
        : 'universaltvremote',
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
          !['expo-build-properties', 'expo-dev-client'].includes(
            typeof plugin === 'string' ? plugin : (plugin[0] ?? ''),
          ),
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
      [
        'expo-dev-client',
        {
          addGeneratedScheme: false,
          ...(uiTest || development
            ? {
                defaultLaunchURL: 'http://localhost:8081',
                skipOnboarding: true,
                showMenuAtLaunch: false,
                toolsButton: false,
              }
            : {}),
        },
      ],
    ],
    extra: {
      ...config.extra,
      uiTest,
      eas: { projectId: buildIdentity.projectId },
    },
  };
}
