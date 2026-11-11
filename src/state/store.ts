/**
 * Fontify - Typed Reactive State Store
 * Provides get, set, and fine-grained slice subscriptions without any external libraries.
 */

import type { AppState } from './types';
import { getInitialSystemStatus } from './cache';

type Listener<T> = (val: T, state: AppState) => void;

interface Subscriber {
  notify: (state: AppState) => void;
}

export class Store {
  private state: AppState;
  private subscriptions: Set<Subscriber> = new Set();

  constructor(initialState?: Partial<AppState>) {
    this.state = {
      currentTab: 'overview',
      status: getInitialSystemStatus(),
      statusLoading: false,
      statusError: null,
      fontFile: null,
      fontBuffer: null,
      fontData: null,
      axisValues: {},
      selectedPreset: 'Auto (Stock)',
      weightMode: 'auto',
      isApplying: false,
      isRestoring: false,
      applyProgress: 0,
      applyProgressMessage: '',
      lastError: null,
      ...initialState
    };
  }

  public getState(): Readonly<AppState> {
    return this.state;
  }

  public setState(partial: Partial<AppState>): void {
    const prevState = this.state;
    this.state = { ...prevState, ...partial };

    this.notifySubscriptions();
  }

  /**
   * Subscribes to a specific slice of the store. The listener is invoked only
   * when the selected value changes according to the equalityFn.
   */
  public subscribe<T>(
    selector: (state: AppState) => T,
    listener: Listener<T>,
    equalityFn: (a: T, b: T) => boolean = (a, b) => a === b
  ): () => void {
    let lastValue = selector(this.state);

    const sub: Subscriber = {
      notify: (state: AppState) => {
        const nextVal = selector(state);
        if (!equalityFn(lastValue, nextVal)) {
          lastValue = nextVal;
          listener(nextVal, state);
        }
      }
    };

    this.subscriptions.add(sub);

    // Return unsubscription function
    return () => {
      this.subscriptions.delete(sub);
    };
  }

  private notifySubscriptions(): void {
    for (const sub of this.subscriptions) {
      sub.notify(this.state);
    }
  }
}

// Global store singleton
export const store = new Store();
