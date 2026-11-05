# A disposable, entitled simulator app hosts Security/Keychain XCTest cases.
# SwiftPM's unhosted xctest process has no application Keychain access group.
require 'xcodeproj'
require 'fileutils'

root = File.expand_path('..', __dir__)
output = File.expand_path(ARGV.fetch(0, '/private/tmp/tvremote-native-test-host'))
FileUtils.mkdir_p(output)
project = Xcodeproj::Project.new(File.join(output, 'NativeCredentialTests.xcodeproj'))
host = project.new_target(:application, 'NativeTestHost', :ios, '16.4')
tests = project.new_target(:unit_test_bundle, 'NativeCredentialTests', :ios, '16.4')
tests.add_dependency(host)

File.write(File.join(output, 'Host.swift'), <<~SWIFT)
  import UIKit
  @main final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
      let window = UIWindow(frame: UIScreen.main.bounds)
      window.rootViewController = UIViewController()
      window.makeKeyAndVisible()
      self.window = window
      return true
    }
  }
SWIFT
host.add_file_references([project.main_group.new_file(File.join(output, 'Host.swift'))])
tests.add_file_references([project.main_group.new_file(File.join(root, 'modules/tv-remote-native/ios/Tests/CredentialTests.swift'))])

File.write(File.join(output, 'Host.entitlements'), <<~XML)
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0"><dict>
  <key>application-identifier</key><string>TVREMOTE.dev.universaltv.remote.tests</string>
  <key>keychain-access-groups</key><array><string>TVREMOTE.dev.universaltv.remote.tests</string></array>
  </dict></plist>
XML

[host, tests].each do |target|
  target.build_configurations.each do |config|
    config.build_settings.merge!({
      'SWIFT_VERSION' => '5.0', 'GENERATE_INFOPLIST_FILE' => 'YES',
      'PRODUCT_BUNDLE_IDENTIFIER' => "dev.universaltv.remote.tests.#{target.name}",
      'CODE_SIGN_IDENTITY' => '-', 'CODE_SIGN_STYLE' => 'Manual',
      'TARGETED_DEVICE_FAMILY' => '1,2', 'ENABLE_TESTABILITY' => 'YES'
    })
  end
end
host.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'dev.universaltv.remote.tests'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] = File.join(output, 'Host.entitlements')
end
tests.build_configurations.each do |config|
  config.build_settings['TEST_HOST'] = '$(BUILT_PRODUCTS_DIR)/NativeTestHost.app/NativeTestHost'
  config.build_settings['BUNDLE_LOADER'] = '$(TEST_HOST)'
end

package = project.new(Xcodeproj::Project::Object::XCLocalSwiftPackageReference)
package.relative_path = File.join(root, 'modules/tv-remote-native/ios/Core')
project.root_object.package_references << package
product = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
product.package = package
product.product_name = 'TVRemoteCore'
tests.package_product_dependencies << product
build_file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
build_file.product_ref = product
tests.frameworks_build_phase.files << build_file
project.save
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(host)
scheme.add_build_target(tests)
scheme.add_test_target(tests)
scheme.set_launch_target(host)
scheme.save_as(project.path, 'NativeCredentialTests', true)
puts project.path
