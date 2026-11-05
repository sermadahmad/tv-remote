require 'json'

Pod::Spec.new do |s|
  s.name = 'TVRemoteNative'
  s.version = '0.1.0'
  s.summary = 'Local Android TV Remote v2 transport'
  s.description = 'Owned Kotlin and Swift protocol integration for Universal TV Remote.'
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Universal TV Remote'
  s.homepage = 'https://docs.expo.dev/modules/'
  s.platforms = { :ios => '16.4' }
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'ios/TVRemoteNativeModule.swift'
  s.swift_version = '5.0'
  SPM.dependency(s,
    url: File.expand_path('ios/Core', __dir__),
    requirement: {},
    products: ['TVRemoteCore'])
end
