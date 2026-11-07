import type {
  UpdateAdapter,
  UpdateEffects,
  UpdateInfo,
  UpdateSnapshot,
} from './contracts';

export class UpdateCoordinator {
  private state: UpdateSnapshot;
  private listeners = new Set<() => void>();
  private unsubscribe: (() => void) | null = null;
  private running = false;
  private foreground = true;
  private background = false;
  private externalReturn = false;
  private external = false;
  private allowed = false;
  private dismissed = new Set<string>();
  private generation = 0;
  private revision = 0;
  private checking: Promise<void> | null = null;
  private manual = false;
  private action = false;

  constructor(
    private adapter: UpdateAdapter,
    private effects: UpdateEffects,
  ) {
    this.state = {
      enabled: adapter.enabled,
      info: null,
      busy: null,
      notice: null,
      message: null,
    };
  }
  snapshot = (): UpdateSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private publish(patch: Partial<UpdateSnapshot> = {}): void {
    const next = { ...this.state, ...patch };
    const status = next.info?.status;
    const notice =
      status === 'available' || status === 'downloaded' ? status : null;
    next.notice =
      this.running &&
      this.foreground &&
      this.allowed &&
      !next.busy &&
      notice &&
      !this.dismissed.has(notice)
        ? notice
        : null;
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
  start(initialActive = true): () => void {
    if (this.running) return () => {};
    this.running = true;
    this.foreground = initialActive;
    if (this.adapter.enabled) {
      this.unsubscribe = this.adapter.subscribe((info) => {
        this.revision++;
        this.publish({
          info,
          ...(info.status === 'failed'
            ? {
                message:
                  'The update could not download. Check your internet connection and try again.',
              }
            : {}),
        });
      });
      if (initialActive) void this.check();
    }
    return () => this.stop();
  }
  private stop(): void {
    this.running = false;
    this.generation++;
    this.checking = null;
    this.manual = false;
    this.external = false;
    this.background = false;
    this.externalReturn = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.publish({ busy: null });
  }
  setPresentationAllowed(allowed: boolean): void {
    this.allowed = allowed;
    this.publish();
  }
  onAppState(state: string): void {
    if (state === 'background') {
      this.foreground = false;
      this.background = true;
      this.externalReturn = this.external;
      this.publish();
    } else if (state === 'active') {
      this.foreground = true;
      if (this.background && !this.externalReturn) {
        this.dismissed.clear();
        this.publish({ message: null });
      }
      this.background = false;
      this.externalReturn = false;
      // Store links resolve before the user returns; consent tasks resolve after it.
      if (this.external && !this.action) this.external = false;
      this.publish();
      if (!this.action) void this.check();
    }
  }
  later(): void {
    if (this.state.notice && this.state.info)
      this.dismissed.add(this.state.notice);
    this.publish();
  }
  check(manual = false): Promise<void> {
    if (!this.running || !this.adapter.enabled || this.action)
      return Promise.resolve();
    this.manual ||= manual;
    if (this.checking) return this.checking;
    const generation = this.generation;
    const revision = this.revision;
    this.publish({ busy: 'checking', ...(manual ? { message: null } : {}) });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Update check timed out')),
        10000,
      );
    });
    const work = (async () => {
      try {
        const info = await Promise.race([this.adapter.check(), timeout]);
        if (!this.running || generation !== this.generation) return;
        if (this.manual) this.dismissed.clear();
        if (revision === this.revision) this.publish({ info });
        if (this.manual)
          this.publish({ message: this.statusMessage(this.state.info) });
      } catch {
        if (this.running && generation === this.generation && this.manual)
          this.publish({
            message:
              'Couldn’t check for updates. Try again when online, or open Google Play.',
          });
      } finally {
        clearTimeout(timer);
        if (generation === this.generation) {
          this.manual = false;
          this.checking = null;
          this.publish({ busy: null });
        }
      }
    })();
    this.checking = work;
    return work;
  }
  private statusMessage(info: UpdateInfo | null): string | null {
    switch (info?.status) {
      case 'upToDate':
        return 'You’re up to date.';
      case 'available':
        return 'A new version is available.';
      case 'downloaded':
        return 'Your update is ready to install.';
      case 'pending':
      case 'downloading':
        return 'Your update is downloading through Google Play.';
      case 'installing':
        return 'Google Play is installing your update.';
      default:
        return 'Updates are available through Google Play for eligible installations.';
    }
  }
  async update(): Promise<void> {
    if (
      this.action ||
      this.state.busy ||
      this.state.info?.status !== 'available'
    )
      return;
    this.action = true;
    this.external = true;
    const generation = this.generation;
    let store = false;
    this.publish({ busy: 'starting', message: null });
    try {
      await this.effects.releaseKeys();
      if (
        !this.running ||
        generation !== this.generation ||
        !this.foreground ||
        !this.allowed
      )
        return;
      const result = this.state.info?.flexibleAllowed
        ? await this.adapter.start()
        : 'store';
      if (!this.running || generation !== this.generation) return;
      if (result === 'store') {
        await this.adapter.openStore();
        store = true;
        this.dismissed.add('available');
      } else if (result === 'cancelled') {
        this.dismissed.add('available');
      } else if (result === 'downloaded') {
        if (this.state.info)
          this.publish({ info: { ...this.state.info, status: 'downloaded' } });
      } else {
        this.dismissed.add('available');
        // A listener may already have reported completion before consent returned.
        if (this.state.info?.status === 'available')
          this.publish({ info: { ...this.state.info, status: 'pending' } });
      }
    } catch {
      if (this.running && generation === this.generation)
        this.publish({
          message:
            'Couldn’t start the update. Try again or open Google Play from Settings.',
        });
    } finally {
      this.action = false;
      this.external = store && this.foreground;
      if (this.running && generation === this.generation) {
        this.publish({ busy: null });
        if (!store && this.foreground) void this.check();
      }
    }
  }
  async openStore(): Promise<void> {
    if (this.action) return;
    this.action = true;
    this.external = true;
    try {
      await this.effects.releaseKeys();
      await this.adapter.openStore();
      const info = this.state.info;
      if (info?.status === 'available' || info?.status === 'downloaded')
        this.dismissed.add(info.status);
      this.publish();
    } catch {
      this.external = false;
      this.publish({
        message: 'Couldn’t open Google Play. Try again when online.',
      });
    } finally {
      this.action = false;
    }
  }
  async install(): Promise<void> {
    if (
      this.action ||
      this.state.busy ||
      this.state.info?.status !== 'downloaded'
    )
      return;
    this.action = true;
    const generation = this.generation;
    this.publish({ busy: 'installing', message: null });
    try {
      await this.effects.prepareInstall();
      if (!this.running || generation !== this.generation) return;
      await this.adapter.complete();
      if (this.running && generation === this.generation && this.state.info)
        this.publish({ info: { ...this.state.info, status: 'installing' } });
    } catch {
      if (this.running && generation === this.generation && this.foreground)
        await this.effects.recover().catch(() => {});
      if (this.running && generation === this.generation)
        this.publish({
          message:
            'Couldn’t install the update. You can keep using the app. Try again or open Google Play.',
        });
    } finally {
      this.action = false;
      if (this.running && generation === this.generation)
        this.publish({ busy: null });
    }
  }
}
