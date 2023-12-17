"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedEventEmitter = void 0;
const events_1 = require("events");
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)();
class EnhancedEventEmitter extends events_1.EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(Infinity);
    }
    safeEmit(event, ...args) {
        const numListeners = this.listenerCount(event);
        try {
            return this.emit(event, ...args);
        }
        catch (error) {
            logger.error("safeEmit() | event listener threw an error [event:%s]:%o", event, error);
            return Boolean(numListeners);
        }
    }
    async safeEmitAsPromise(event, ...args) {
        return new Promise((resolve, reject) => {
            this.safeEmit(event, ...args, resolve, reject);
        });
    }
}
exports.EnhancedEventEmitter = EnhancedEventEmitter;
//# sourceMappingURL=events.js.map