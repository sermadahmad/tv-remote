# Android TV Remote v2

## Pinned references and licenses

Primary behavior and schema source: [tronikos/androidtvremote2 v0.3.2](https://github.com/tronikos/androidtvremote2/tree/v0.3.2), commit `3f30c275615fc5eb11b4a2da4fe33a02cbb4fd66`, Apache-2.0. Its September 2026 release fixes fragmented varint framing and pairing timeouts. It is used by the Home Assistant Android TV Remote integration.

Historical pairing reference: [AOSP google-tv-pairing-protocol](https://android.googlesource.com/platform/external/google-tv-pairing-protocol/). This is not a supported public SDK for the complete current Remote v2 protocol.

Secondary Swift reference: [odyshewroman/AndroidTVRemoteControl](https://github.com/odyshewroman/AndroidTVRemoteControl), MIT. Its toolchain and maintenance claims are not used as compatibility guarantees. No third-party remote runtime is embedded.

Schemas retain their upstream comments. `polo.proto` derives from AOSP with the documented Remote v2 envelope adjustment. `remotemessage.proto` derives from louis49/androidtv-remote, whose repository LICENSE is MIT; its package metadata labels the package ISC. The project vendors schema files with source provenance and notices rather than installing that package.

## Discovery and endpoints

Browse `_androidtvremote2._tcp.local.`. Use the advertised remote-control port. Defaults observed in the reference are control TCP 6466 and pairing TCP 6467; these are not universal device guarantees. Android uses NsdManager and Wi-Fi-bound sockets. iOS uses NWBrowser and Wi-Fi-constrained NWConnection. No subnet scan, ADB, infrared, Bluetooth control, or external-network target is implemented.

Manual entry accepts one RFC1918 IPv4 address. Native transport also validates local addresses. The TV may use Ethernet if it shares the phone's local network. No internet connection is required.

## Framing

Messages are Protobuf encoded with a varint byte-length prefix. Incremental decoders accept split prefixes, split payloads, and coalesced frames. Malformed prefixes, truncated streams, and frames above the implementation's 64 KiB limit fail closed. Kotlin uses generated Protobuf Java Lite types; Swift uses generated SwiftProtobuf types.

## Pairing

1. Create an RSA-2048 client identity with a self-signed certificate.
2. Open provisional TLS to the pairing endpoint.
3. Exchange pairing request/ack, options, and configuration/ack using the input role and six hexadecimal symbols.
4. Hash unsigned client RSA modulus/exponent, server modulus/exponent, and the final two bytes of the displayed code with SHA-256. The digest's first byte must match the code's first byte.
5. Send the protocol secret and await its acknowledgment. Store the identity reference and server public-key pin only after success.

The independent synthetic fixture in `tests/fixtures/pairing.json` verifies integer padding and digest parity across native implementations. It contains public test keys only. Pairing codes are never persisted or logged. Every protocol exchange has a timeout; human entry expires after two minutes.

Successful pairing returns an authenticated target identifier, `androidtv:` followed by the base64url SHA-256 SubjectPublicKeyInfo pin. Discovery names and addresses locate saved credentials; they do not authenticate a TV. The application adopts the authenticated identifier before saving metadata or opening control. Every control connection still verifies the native pin. `TVAdapter.submitPairingCode` returns this target so a changing address does not become the saved identity.

## Trust establishment

The reference Python transport uses CERT_NONE. This project does not use an unconditional control-session trust manager. Pairing has an explicit provisional trust policy: parse the peer certificate, require a valid RSA key and validity period, and restrict that channel to pairing messages. The displayed-code exchange binds the candidate keys under the protocol's authentication properties.

Control requires the SHA-256 pin of the DER SubjectPublicKeyInfo learned at pairing. A different key fails; no automatic pin replacement or downgrade is permitted. Pairing/control identity continuity, firmware certificate quirks, and the strength of initial authentication remain hardware/security validation gates. TLS 1.2 or newer is required. Public-CA hostname authentication is not substituted for the protocol's device trust model.

## Control and capabilities

Follow configure, feature intersection, active, and remote-start messages before accepting commands. Reply to server pings; close idle sessions after the reference's 16-second interval. Key directions are SHORT=3, START_LONG=1, END_LONG=2. Navigation, volume, media, and power keys use the upstream keycode enum.

Negotiated key support means the protocol accepts key injection; it is not an execution acknowledgment or a guarantee about a TV application. Volume events originate from the TV. IME remains disabled pending validation of field counters, Unicode offsets, focus, and append/replace behavior. See [upstream text issue #32](https://github.com/tronikos/androidtvremote2/issues/32).

## Known limitations and evidence

No physical TV is currently available. No brand/model is certified by this project. Manufacturer marketing names are not compatibility evidence. The TV needs a compatible Android TV Remote Service. Firmware, standby networking, HDMI-CEC/audio routing, and applications may alter behavior. Fully powered-off wake is not promised. [Home Assistant's documented limitations](https://www.home-assistant.io/integrations/androidtv_remote/#limitations-and-known-issues) are useful troubleshooting evidence, not this application's test results.
