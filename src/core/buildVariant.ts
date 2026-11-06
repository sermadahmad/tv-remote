import buildIdentity from './buildIdentity.json';

export function isFixtureBuild(
  uiTest: unknown,
  applicationId: string | null,
): boolean {
  return uiTest === true && applicationId === buildIdentity.uiTestApplicationId;
}
