import { EventEmitter } from "events";
import { getLogger } from "./logger";

const logger = getLogger();

export class EnhancedEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(Infinity);
  }
  safeEmit(event, ...args) {
    const numListeners = this.listenerCount(event);
    try {
      return this.emit(event, ...args);
    } catch (error) {
      logger.error(
        "safeEmit() | event listener threw an error [event:%s]:%o",
        event,
        error,
      );
      return Boolean(numListeners);
    }
  }
  async safeEmitAsPromise(event, ...args) {
    return new Promise((resolve, reject) => {
      this.safeEmit(event, ...args, resolve, reject);
    });
  }
}
