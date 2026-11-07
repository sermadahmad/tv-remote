# Beginner-friendly setup and troubleshooting

The default path is automatic search, tap a recognizable TV name, then enter the
TV's six-character code if requested. First launch shows one introduction;
subsequent launches preserve the existing onboarding preference and open Remote.
When no TV is connected, Remote puts its status and **Choose a TV** action above
the illustration so the first setup action stays easy to reach on small phones.
People who lost their physical remote can use guidance about the TV's own power
button. Initial TV network setup may still need physical navigation controls,
a replacement remote or another input device the TV supports.

Devices shows searching, results, no-TV, permission and network states in plain
language. Empty results are not treated as proof of denied permission. A TV may
use Ethernet if it shares the phone's home network. Supported device types and
standby limitations remain explicit; the app does not promise universal TV or
wake support.

Manual connection is optional: expand **Advanced connection options**, then
choose **Connect using IP address**. Existing private IPv4 validation and pairing
remain mandatory. Address help explains both TV settings and the router's device
list, without requiring router configuration changes. Cancelling clears manual
input. Address entry remains in memory when visiting Help and returning.

The single Help route is outside the persistent tabs. Its typed content covers
TV power, the home network, permissions, pairing, IP addresses, reconnection and
compatibility. Back returns to the originating screen. **I've turned on my TV**
and **Search again** return to Devices; its existing focus hook starts discovery.
Pairing help expands inline so reading it never leaves the active pairing route.
Pairing codes retain the existing transient lifetime and native security policy.

User-facing error copy maps existing error codes in the presentation layer. Raw
native messages are not displayed by these screens or the app notice. Protocol
errors, retry eligibility, connection state transitions and transport operations
are unchanged. TV text entry is still unavailable.

Illustrations are decorative and hidden from screen readers. Screen headings,
status text, error alerts, input labels and disclosure expanded states provide
meaning independently of color. Native system font scaling is retained; buttons
wrap labels and keep the existing 52-unit minimum touch height. Screens scroll
and retain the shared keyboard avoidance behavior on both platforms.

Behavioral tests cover first/repeat launch, missing remote and TV off, unknown IP,
no results, different-network guidance, permission denial, invalid address,
incorrect pairing, inline pairing help, return navigation and discovery focus.
Maestro journeys cover keyboard-visible actions, tabs, pairing, rename and
forgetting. Simulator evidence does not establish real-TV compatibility or replace
physical VoiceOver/TalkBack testing.
