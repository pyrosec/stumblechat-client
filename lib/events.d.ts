/// <reference types="node" />
import { EventEmitter } from "events";
export declare class EnhancedEventEmitter extends EventEmitter {
    constructor();
    safeEmit(event: any, ...args: any[]): boolean;
    safeEmitAsPromise(event: any, ...args: any[]): Promise<unknown>;
}
