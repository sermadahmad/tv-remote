// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "TVRemoteCore",
  platforms: [.iOS(.v16), .macOS(.v13)],
  products: [.library(name: "TVRemoteCore", targets: ["TVRemoteCore"])],
  dependencies: [
    .package(url: "https://github.com/apple/swift-protobuf.git", exact: "1.39.0"),
    .package(url: "https://github.com/apple/swift-certificates.git", exact: "1.21.0"),
    .package(url: "https://github.com/apple/swift-asn1.git", from: "1.1.0"),
  ],
  targets: [
    .target(
      name: "TVRemoteCore",
      dependencies: [
        .product(name: "SwiftProtobuf", package: "swift-protobuf"),
        .product(name: "X509", package: "swift-certificates"),
        .product(name: "SwiftASN1", package: "swift-asn1"),
      ]),
    .testTarget(
      name: "TVRemoteCoreTests", dependencies: ["TVRemoteCore"], resources: [.copy("Fixtures")]),
  ],
  swiftLanguageModes: [.v5]
)
