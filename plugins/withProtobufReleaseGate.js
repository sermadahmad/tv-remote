const { withAppBuildGradle } = require('expo/config-plugins');

const marker =
  '// Universal TV Remote: verify retained Protobuf release schemas';
const gate = `
${marker}
tasks.register('verifyReleaseProtobuf', Exec) {
    dependsOn('minifyReleaseWithR8')
    workingDir(rootProject.projectDir.parentFile)
    commandLine('node', 'scripts/verify-protobuf-release.mjs')
}
tasks.matching { it.name == 'bundleRelease' || it.name == 'assembleRelease' }.configureEach {
    dependsOn('verifyReleaseProtobuf')
}
`;

module.exports = function withProtobufReleaseGate(config) {
  return withAppBuildGradle(config, (result) => {
    if (result.modResults.language !== 'groovy') {
      throw new Error(
        'Protobuf release verification requires a Groovy app build file.',
      );
    }
    if (!result.modResults.contents.includes(marker)) {
      result.modResults.contents += gate;
    }
    return result;
  });
};
