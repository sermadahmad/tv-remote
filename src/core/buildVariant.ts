export function isFixtureBuild(
  uiTest: unknown,
  applicationId: string | null,
): boolean {
  return uiTest === true && applicationId === 'dev.universaltv.remote.uitest';
}
