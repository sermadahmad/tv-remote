import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { FixtureUpdateAdapter } from '../../infrastructure/testing/FixtureUpdateAdapter';
import { connection, report } from '../runtime';
import {
  PlayUpdateAdapter,
  updatesEnabled,
  updateFixtureEnabled,
} from './PlayUpdateAdapter';
import { UpdateCoordinator } from './UpdateCoordinator';

export const updateFixture = updateFixtureEnabled(
  Application.applicationId,
  Constants.expoConfig?.extra?.uiTest,
  Constants.expoConfig?.extra?.appUpdateFixture,
);
export const appUpdates = new UpdateCoordinator(
  updateFixture
    ? new FixtureUpdateAdapter()
    : new PlayUpdateAdapter(
        updatesEnabled(
          Platform.OS,
          Application.applicationId,
          __DEV__,
          Constants.expoConfig?.extra?.uiTest,
        ),
      ),
  {
    async releaseKeys() {
      const state = connection.snapshot();
      if (state.status === 'connected')
        await connection.releaseKeys(state.session.sessionId);
    },
    prepareInstall: () => connection.suspend(),
    recover: () => connection.resume().catch(report),
  },
);
