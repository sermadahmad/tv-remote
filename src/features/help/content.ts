export const helpTopics = {
  'tv-off': {
    title: 'Is your TV turned off?',
    paragraphs: [
      'You can usually turn on your TV using its own physical power button. Look underneath the screen, along the bottom edge, on the side, or on the back. Its location depends on the TV model.',
      'No remote? Some TVs also have physical navigation buttons. If your TV has never been set up, it may need a replacement remote or another supported input device to join your home network.',
      'After pairing, some TVs can stay reachable in standby. This depends on your TV. A TV that is completely powered off or unplugged cannot be turned on through Wi-Fi.',
    ],
  },
  network: {
    title: 'Check your home connection',
    paragraphs: [
      'Your phone needs Wi-Fi. Your TV can use Wi-Fi or an Ethernet cable, as long as both devices share the same home network.',
      'If the TV is still starting up, give it a moment and search again. A guest network or VPN can keep devices apart. Try your usual home Wi-Fi; you do not need to change router settings.',
      'If you cannot navigate TV settings without a remote, look for physical navigation buttons on the TV. Initial network setup may require a replacement remote or another input device supported by your TV.',
    ],
    checklist: [
      'Turn on your TV.',
      'Connect your phone to Wi-Fi.',
      'Check that both devices use the same home network.',
      'Allow the app to find devices on your network.',
    ],
  },
  permissions: {
    title: 'Allow your phone to find TVs',
    paragraphs: [
      'If your phone asks for permission to find devices on your network, choose Allow. This lets the app find and connect to your TV at home.',
      'If you previously declined, open this app’s settings and look for Local Network or the network permission offered by your phone. Some Android versions do not show a separate network permission.',
      'An empty search does not mean permission was denied. Your TV may be off, starting up, or connected to another network.',
    ],
  },
  pairing: {
    title: 'No code appeared?',
    paragraphs: [
      'Look at the TV screen and make sure you chose the right TV. Keep it on and connected to your home network.',
      'If no code appears, cancel this connection and choose the TV again. A saved connection may reconnect without asking for a code.',
      'When a code appears, enter all six characters. It can contain numbers 0–9 and letters A–F. If the code expires, start again for a new one.',
    ],
  },
  'ip-address': {
    title: 'Find your TV’s IP address',
    paragraphs: [
      'An IP address is a number that helps your phone find your TV on your home network. Most people will not need this option.',
      'If you can use TV settings: open Settings, find Network or Internet, select the connected Wi-Fi or Ethernet network, and look for IP address or Network details. Menu names differ between TVs.',
      'Without a remote: your router’s app or administration page may show Connected Devices, Device List, or DHCP Clients. Look for your TV’s name or manufacturer and its assigned address. This is optional; do not change router settings.',
      'This app accepts a private IPv4 address, such as 192.168.1.25. Entering an address still requires a compatible TV on your home network and secure pairing. It does not bypass a pairing code.',
    ],
  },
  'connection-lost': {
    title: 'Get connected again',
    paragraphs: [
      'Check that the TV is on and your phone is still on the same home Wi-Fi. Some TVs stop accepting connections in standby.',
      'The app tries to reconnect for a short time. If it still cannot connect, choose Reconnect or search for your TV again.',
      'If the TV asks to pair again, use the new code on its screen. You can turn on the TV with its own physical power button if your remote is missing.',
    ],
  },
  compatibility: {
    title: 'Which TVs work?',
    paragraphs: [
      'This app works with compatible Android TV and Google TV devices that provide the Android TV Remote Service. Other smart TVs are not automatically supported.',
      'Available controls depend on the TV, its software, and the open app. TV text input is not available in this version.',
      'Standby and wake behavior vary by TV. The app cannot guarantee waking a sleeping TV, and it cannot turn on an unplugged TV.',
    ],
  },
} as const;

export type HelpTopicId = keyof typeof helpTopics;
export const helpTopicIds = Object.keys(helpTopics) as HelpTopicId[];
export function resolveHelpTopic(value: unknown): HelpTopicId {
  return typeof value === 'string' && Object.hasOwn(helpTopics, value)
    ? (value as HelpTopicId)
    : 'network';
}
