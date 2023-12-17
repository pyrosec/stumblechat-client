import { getLogger } from "./logger";
import * as ortc from "./ortc";
import { Transport } from "./transport";
import { NodeHandler } from "./handler";
const logger = getLogger();
export function detectDevice() {
  return "NodeJS";
}
export class Device {
  public _loaded: any;
  public _recvRtpCapabilities: any;
  public _canProduceByKind: any;
  public _sctpCapabilities: any;
  public _handlerName: any;
  public _extendedRtpCapabilities: any;
  public _handlerFactory: any;
  constructor({ handlerName, handlerFactory, Handler }: any = {}) {
    this._loaded = false;
    if (Handler) {
      logger.warn(
        "constructor() | Handler option is DEPRECATED, use handlerName or handlerFactory instead",
      );
      if (typeof Handler === "string") handlerName = Handler;
      else
        throw new TypeError(
          "non string Handler option no longer supported, use handlerFactory instead",
        );
    }
    if (handlerName && handlerFactory) {
      throw new TypeError(
        "just one of handlerName or handlerInterface can be given",
      );
    }
    if (handlerFactory) {
      this._handlerFactory = handlerFactory;
    } else {
      if (handlerName) {
        logger.debug("constructor() | handler given: %s", handlerName);
      } else {
        handlerName = detectDevice();
        if (handlerName)
          logger.debug("constructor() | detected handler: %s", handlerName);
        else throw new Error("device not supported");
      }
      this._handlerFactory = NodeHandler.createFactory();
    }
    const handler = this._handlerFactory();
    this._handlerName = handler.name;
    handler.close();
    this._extendedRtpCapabilities = undefined;
    this._recvRtpCapabilities = undefined;
    this._canProduceByKind = {
      audio: false,
      video: false,
    };
    this._sctpCapabilities = undefined;
  }
  get handlerName() {
    return this._handlerName;
  }
  get loaded() {
    return this._loaded;
  }
  get rtpCapabilities() {
    if (!this._loaded) throw new Error("not loaded");
    return this._recvRtpCapabilities;
  }
  get sctpCapabilities() {
    if (!this._loaded) throw new Error("not loaded");
    return this._sctpCapabilities;
  }
  async load({ routerRtpCapabilities }) {
    logger.debug("load() [routerRtpCapabilities:%o]", routerRtpCapabilities);
    let handler;
    try {
      if (this._loaded) throw new Error("already loaded");
      ortc.validateRtpCapabilities(routerRtpCapabilities);
      handler = this._handlerFactory();
      const nativeRtpCapabilities = await handler.getNativeRtpCapabilities();
      logger.debug(
        "load() | got native RTP capabilities:%o",
        nativeRtpCapabilities,
      );
      ortc.validateRtpCapabilities(nativeRtpCapabilities);
      this._extendedRtpCapabilities = ortc.getExtendedRtpCapabilities(
        nativeRtpCapabilities,
        routerRtpCapabilities,
      );
      logger.debug(
        "load() | got extended RTP capabilities:%o",
        this._extendedRtpCapabilities,
      );
      this._canProduceByKind.audio = ortc.canSend(
        "audio",
        this._extendedRtpCapabilities,
      );
      this._canProduceByKind.video = ortc.canSend(
        "video",
        this._extendedRtpCapabilities,
      );
      this._recvRtpCapabilities = ortc.getRecvRtpCapabilities(
        this._extendedRtpCapabilities,
      );
      ortc.validateRtpCapabilities(this._recvRtpCapabilities);
      logger.debug(
        "load() | got receiving RTP capabilities:%o",
        this._recvRtpCapabilities,
      );
      this._sctpCapabilities = await handler.getNativeSctpCapabilities();
      logger.debug(
        "load() | got native SCTP capabilities:%o",
        this._sctpCapabilities,
      );
      ortc.validateSctpCapabilities(this._sctpCapabilities);
      logger.debug("load() succeeded");
      this._loaded = true;
      handler.close();
    } catch (error) {
      if (handler) handler.close();
      throw error;
    }
  }
  canProduce(kind) {
    if (!this._loaded) throw new Error("not loaded");
    else if (kind !== "audio" && kind !== "video")
      throw new TypeError(`invalid kind "${kind}"`);
    return this._canProduceByKind[kind];
  }
  createSendTransport({
    id,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    iceServers,
    iceTransportPolicy,
    additionalSettings,
    proprietaryConstraints,
    appData = {},
  }) {
    logger.debug("createSendTransport()");
    return this._createTransport({
      direction: "send",
      id: id,
      iceParameters: iceParameters,
      iceCandidates: iceCandidates,
      dtlsParameters: dtlsParameters,
      sctpParameters: sctpParameters,
      iceServers: iceServers,
      iceTransportPolicy: iceTransportPolicy,
      additionalSettings: additionalSettings,
      proprietaryConstraints: proprietaryConstraints,
      appData: appData,
    });
  }
  createRecvTransport({
    id,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    iceServers,
    iceTransportPolicy,
    additionalSettings,
    proprietaryConstraints,
    appData = {},
  }) {
    logger.debug("createRecvTransport()");
    return this._createTransport({
      direction: "recv",
      id: id,
      iceParameters: iceParameters,
      iceCandidates: iceCandidates,
      dtlsParameters: dtlsParameters,
      sctpParameters: sctpParameters,
      iceServers: iceServers,
      iceTransportPolicy: iceTransportPolicy,
      additionalSettings: additionalSettings,
      proprietaryConstraints: proprietaryConstraints,
      appData: appData,
    });
  }
  _createTransport({
    direction,
    id,
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    iceServers,
    iceTransportPolicy,
    additionalSettings,
    proprietaryConstraints,
    appData = {},
  }) {
    if (!this._loaded) throw new Error("not loaded");
    else if (typeof id !== "string") throw new TypeError("missing id");
    else if (typeof iceParameters !== "object")
      throw new TypeError("missing iceParameters");
    else if (!Array.isArray(iceCandidates))
      throw new TypeError("missing iceCandidates");
    else if (typeof dtlsParameters !== "object")
      throw new TypeError("missing dtlsParameters");
    else if (sctpParameters && typeof sctpParameters !== "object")
      throw new TypeError("wrong sctpParameters");
    else if (appData && typeof appData !== "object")
      throw new TypeError("if given, appData must be an object");
    const transport = new Transport({
      direction,
      id,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers,
      iceTransportPolicy,
      additionalSettings,
      proprietaryConstraints,
      appData,
      handlerFactory: this._handlerFactory,
      extendedRtpCapabilities: this._extendedRtpCapabilities,
      canProduceByKind: this._canProduceByKind,
    });
    return transport;
  }
}
