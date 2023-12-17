import awaitqueue from "awaitqueue";
import { EnhancedEventEmitter } from "./events";
import * as utils from "./utils";
import * as ortc from "./ortc";
import { getLogger } from "./logger";
const logger = getLogger();
export class Producer extends EnhancedEventEmitter {
  public _id: any;
  public _localId: any;
  public _rtpSender: any;
  public _track: any;
  public _kind: any;
  public _rtpParameters: any;
  public _paused: any;
  public _maxSpatialLayer: any;
  public _stopTracks: any;
  public _disableTrackOnPause: any;
  public _zeroRtpOnPause: any;
  public _appData: any;
  public _closed: any;
  constructor({
    id,
    localId,
    rtpSender,
    track,
    rtpParameters,
    stopTracks,
    disableTrackOnPause,
    zeroRtpOnPause,
    appData,
  }) {
    super();
    this._closed = false;
    logger.debug("constructor()");
    this._id = id;
    this._localId = localId;
    this._rtpSender = rtpSender;
    this._track = track;
    this._kind = track.kind;
    this._rtpParameters = rtpParameters;
    this._paused = disableTrackOnPause ? !track.enabled : false;
    this._maxSpatialLayer = undefined;
    this._stopTracks = stopTracks;
    this._disableTrackOnPause = disableTrackOnPause;
    this._zeroRtpOnPause = zeroRtpOnPause;
    this._appData = appData;
    this._onTrackEnded = this._onTrackEnded.bind(this);
    this._handleTrack();
  }
  get id() {
    return this._id;
  }
  get localId() {
    return this._localId;
  }
  get closed() {
    return this._closed;
  }
  get kind() {
    return this._kind;
  }
  get rtpSender() {
    return this._rtpSender;
  }
  get track() {
    return this._track;
  }
  get rtpParameters() {
    return this._rtpParameters;
  }
  get paused() {
    return this._paused;
  }
  get maxSpatialLayer() {
    return this._maxSpatialLayer;
  }
  get appData() {
    return this._appData;
  }
  set appData(appData) {
    throw new Error("cannot override appData object");
  }
  close() {
    if (this._closed) return;
    logger.debug("close()");
    this._closed = true;
    this._destroyTrack();
    this.emit("@close");
  }
  transportClosed() {
    if (this._closed) return;
    logger.debug("transportClosed()");
    this._closed = true;
    this._destroyTrack();
    this.safeEmit("transportclose");
  }
  async getStats() {
    if (this._closed) throw new Error("closed");
    return this.safeEmitAsPromise("@getstats");
  }
  pause() {
    logger.debug("pause()");
    if (this._closed) {
      logger.error("pause() | Producer closed");
      return;
    }
    this._paused = true;
    if (this._track && this._disableTrackOnPause) {
      this._track.enabled = false;
    }
    if (this._zeroRtpOnPause) {
      this.safeEmitAsPromise("@replacetrack", null).catch(() => {});
    }
  }
  resume() {
    logger.debug("resume()");
    if (this._closed) {
      logger.error("resume() | Producer closed");
      return;
    }
    this._paused = false;
    if (this._track && this._disableTrackOnPause) {
      this._track.enabled = true;
    }
    if (this._zeroRtpOnPause) {
      this.safeEmitAsPromise("@replacetrack", this._track).catch(() => {});
    }
  }
  async replaceTrack({ track }) {
    logger.debug("replaceTrack() [track:%o]", track);
    if (this._closed) {
      if (track && this._stopTracks) {
        try {
          track.stop();
        } catch (error) {}
      }
      throw new Error("closed");
    } else if (track && track.readyState === "ended") {
      throw new Error("track ended");
    }
    if (track === this._track) {
      logger.debug("replaceTrack() | same track, ignored");
      return;
    }
    if (!this._zeroRtpOnPause || !this._paused) {
      await this.safeEmitAsPromise("@replacetrack", track);
    }
    this._destroyTrack();
    this._track = track;
    if (this._track && this._disableTrackOnPause) {
      if (!this._paused) this._track.enabled = true;
      else if (this._paused) this._track.enabled = false;
    }
    this._handleTrack();
  }
  async setMaxSpatialLayer(spatialLayer) {
    if (this._closed) throw new Error("closed");
    else if (this._kind !== "video") throw new Error("not a video Producer");
    else if (typeof spatialLayer !== "number")
      throw new TypeError("invalid spatialLayer");
    if (spatialLayer === this._maxSpatialLayer) return;
    await this.safeEmitAsPromise("@setmaxspatiallayer", spatialLayer);
    this._maxSpatialLayer = spatialLayer;
  }
  async setRtpEncodingParameters(params) {
    if (this._closed) throw new Error("closed");
    else if (typeof params !== "object") throw new TypeError("invalid params");
    await this.safeEmitAsPromise("@setrtpencodingparameters", params);
  }
  _onTrackEnded() {
    logger.debug('track "ended" event');
    this.safeEmit("trackended");
  }
  _handleTrack() {
    if (!this._track) return;
    this._track.addEventListener("ended", this._onTrackEnded);
  }
  _destroyTrack() {
    if (!this._track) return;
    try {
      this._track.removeEventListener("ended", this._onTrackEnded);
      if (this._stopTracks) this._track.stop();
    } catch (error) {}
  }
}
export class Consumer extends EnhancedEventEmitter {
  public _id: any;
  public _localId: any;
  public _producerId: any;
  public _rtpReceiver: any;
  public _paused: any;
  public _appData: any;
  public _track: any;
  public _closed: any;
  public _rtpParameters: any;
  constructor({
    id,
    localId,
    producerId,
    rtpReceiver,
    track,
    rtpParameters,
    appData,
  }) {
    super();
    this._closed = false;
    logger.debug("constructor()");
    this._id = id;
    this._localId = localId;
    this._producerId = producerId;
    this._rtpReceiver = rtpReceiver;
    this._track = track;
    this._rtpParameters = rtpParameters;
    this._paused = !track.enabled;
    this._appData = appData;
    this._onTrackEnded = this._onTrackEnded.bind(this);
    this._handleTrack();
  }
  get id() {
    return this._id;
  }
  get localId() {
    return this._localId;
  }
  get producerId() {
    return this._producerId;
  }
  get closed() {
    return this._closed;
  }
  get kind() {
    return this._track.kind;
  }
  get rtpReceiver() {
    return this._rtpReceiver;
  }
  get track() {
    return this._track;
  }
  get rtpParameters() {
    return this._rtpParameters;
  }
  get paused() {
    return this._paused;
  }
  get appData() {
    return this._appData;
  }
  set appData(appData) {
    throw new Error("cannot override appData object");
  }
  close() {
    if (this._closed) return;
    logger.debug("close()");
    this._closed = true;
    this._destroyTrack();
    this.emit("@close");
  }
  transportClosed() {
    if (this._closed) return;
    logger.debug("transportClosed()");
    this._closed = true;
    this._destroyTrack();
    this.safeEmit("transportclose");
  }
  async getStats() {
    if (this._closed) throw new Error("closed");
    return this.safeEmitAsPromise("@getstats");
  }
  pause() {
    logger.debug("pause()");
    if (this._closed) {
      logger.error("pause() | Consumer closed");
      return;
    }
    this._paused = true;
    this._track.enabled = false;
  }
  resume() {
    logger.debug("resume()");
    if (this._closed) {
      logger.error("resume() | Consumer closed");
      return;
    }
    this._paused = false;
    this._track.enabled = true;
  }
  _onTrackEnded() {
    logger.debug('track "ended" event');
    this.safeEmit("trackended");
  }
  _handleTrack() {
    this._track.addEventListener("ended", this._onTrackEnded);
  }
  _destroyTrack() {
    try {
      this._track.removeEventListener("ended", this._onTrackEnded);
      this._track.stop();
    } catch (error) {}
  }
}
export class DataProducer extends EnhancedEventEmitter {
  public _dataChannel: any;
  public _id: any;
  public _sctpStreamParameters: any;
  public _appData: any;
  public _closed: any;
  constructor({ id, dataChannel, sctpStreamParameters, appData }) {
    super();
    this._closed = false;
    logger.debug("constructor()");
    this._id = id;
    this._dataChannel = dataChannel;
    this._sctpStreamParameters = sctpStreamParameters;
    this._appData = appData;
    this._handleDataChannel();
  }
  get id() {
    return this._id;
  }
  get closed() {
    return this._closed;
  }
  get sctpStreamParameters() {
    return this._sctpStreamParameters;
  }
  get readyState() {
    return this._dataChannel.readyState;
  }
  get label() {
    return this._dataChannel.label;
  }
  get protocol() {
    return this._dataChannel.protocol;
  }
  get bufferedAmount() {
    return this._dataChannel.bufferedAmount;
  }
  get bufferedAmountLowThreshold() {
    return this._dataChannel.bufferedAmountLowThreshold;
  }
  set bufferedAmountLowThreshold(bufferedAmountLowThreshold) {
    this._dataChannel.bufferedAmountLowThreshold = bufferedAmountLowThreshold;
  }
  get appData() {
    return this._appData;
  }
  set appData(appData) {
    throw new Error("cannot override appData object");
  }
  close() {
    if (this._closed) return;
    logger.debug("close()");
    this._closed = true;
    this._dataChannel.close();
    this.emit("@close");
  }
  transportClosed() {
    if (this._closed) return;
    logger.debug("transportClosed()");
    this._closed = true;
    this._dataChannel.close();
    this.safeEmit("transportclose");
  }
  send(data) {
    logger.debug("send()");
    if (this._closed) throw new Error("closed");
    this._dataChannel.send(data);
  }
  _handleDataChannel() {
    this._dataChannel.addEventListener("open", () => {
      if (this._closed) return;
      logger.debug('DataChannel "open" event');
      this.safeEmit("open");
    });
    this._dataChannel.addEventListener("error", (event) => {
      if (this._closed) return;
      let { error } = event;
      if (!error) error = new Error("unknown DataChannel error");
      if (error.errorDetail === "sctp-failure") {
        logger.error(
          "DataChannel SCTP error [sctpCauseCode:%s]: %s",
          error.sctpCauseCode,
          error.message,
        );
      } else {
        logger.error('DataChannel "error" event: %o', error);
      }
      this.safeEmit("error", error);
    });
    this._dataChannel.addEventListener("close", () => {
      if (this._closed) return;
      logger.warn('DataChannel "close" event');
      this._closed = true;
      this.emit("@close");
      this.safeEmit("close");
    });
    this._dataChannel.addEventListener("message", () => {
      if (this._closed) return;
      logger.warn(
        'DataChannel "message" event in a DataProducer, message discarded',
      );
    });
    this._dataChannel.addEventListener("bufferedamountlow", () => {
      if (this._closed) return;
      this.safeEmit("bufferedamountlow");
    });
  }
}
export class DataConsumer extends EnhancedEventEmitter {
  public _data: any;
  public _dataChannel: any;
  public _closed: any;
  public _appData: any;
  public _sctpStreamParameters: any;
  public _id: any;
  public _dataProducerId: any;
  constructor({
    id,
    dataProducerId,
    dataChannel,
    sctpStreamParameters,
    appData,
  }) {
    super();
    this._closed = false;
    logger.debug("constructor()");
    this._id = id;
    this._dataProducerId = dataProducerId;
    this._dataChannel = dataChannel;
    this._sctpStreamParameters = sctpStreamParameters;
    this._appData = appData;
    this._handleDataChannel();
  }
  get id() {
    return this._id;
  }
  get dataProducerId() {
    return this._dataProducerId;
  }
  get closed() {
    return this._closed;
  }
  get sctpStreamParameters() {
    return this._sctpStreamParameters;
  }
  get readyState() {
    return this._dataChannel.readyState;
  }
  get label() {
    return this._dataChannel.label;
  }
  get protocol() {
    return this._dataChannel.protocol;
  }
  get binaryType() {
    return this._dataChannel.binaryType;
  }
  set binaryType(binaryType) {
    this._dataChannel.binaryType = binaryType;
  }
  get appData() {
    return this._appData;
  }
  set appData(appData) {
    throw new Error("cannot override appData object");
  }
  close() {
    if (this._closed) return;
    logger.debug("close()");
    this._closed = true;
    this._dataChannel.close();
    this.emit("@close");
  }
  transportClosed() {
    if (this._closed) return;
    logger.debug("transportClosed()");
    this._closed = true;
    this._dataChannel.close();
    this.safeEmit("transportclose");
  }
  _handleDataChannel() {
    this._dataChannel.addEventListener("open", () => {
      if (this._closed) return;
      logger.debug('DataChannel "open" event');
      this.safeEmit("open");
    });
    this._dataChannel.addEventListener("error", (event) => {
      if (this._closed) return;
      let { error } = event;
      if (!error) error = new Error("unknown DataChannel error");
      if (error.errorDetail === "sctp-failure") {
        logger.error(
          "DataChannel SCTP error [sctpCauseCode:%s]: %s",
          error.sctpCauseCode,
          error.message,
        );
      } else {
        logger.error('DataChannel "error" event: %o', error);
      }
      this.safeEmit("error", error);
    });
    this._dataChannel.addEventListener("close", () => {
      if (this._closed) return;
      logger.warn('DataChannel "close" event');
      this._closed = true;
      this.emit("@close");
      this.safeEmit("close");
    });
    this._dataChannel.addEventListener("message", (event) => {
      if (this._closed) return;
      this.safeEmit("message", event.data);
    });
  }
}
export class Transport extends EnhancedEventEmitter {
  public _canProduceByKind: any;
  public _appData: any;
  public _direction: any;
  public _probatorConsumerCreated: any;
  public _extendedRtpCapabilities: any;
  public _connectionState: any;
  public _maxSctpMessageSize: any;
  public _dataConsumers: any;
  public _closed: boolean;
  public _awaitQueue: any;
  public _consumers: any;
  public _handler: any;
  public _dataProducers: any;
  public _producers: any;
  public _id: any;
  constructor({
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
    handlerFactory,
    extendedRtpCapabilities,
    canProduceByKind,
  }) {
    super();
    this._closed = false;
    this._connectionState = "new";
    this._producers = new Map();
    this._consumers = new Map();
    this._dataProducers = new Map();
    this._dataConsumers = new Map();
    this._probatorConsumerCreated = false;
    this._awaitQueue = new awaitqueue.AwaitQueue();
    logger.debug("constructor() [id:%s, direction:%s]", id, direction);
    this._id = id;
    this._direction = direction;
    this._extendedRtpCapabilities = extendedRtpCapabilities;
    this._canProduceByKind = canProduceByKind;
    this._maxSctpMessageSize = sctpParameters
      ? sctpParameters.maxMessageSize
      : null;
    additionalSettings = utils.clone(additionalSettings);
    delete additionalSettings.iceServers;
    delete additionalSettings.iceTransportPolicy;
    delete additionalSettings.bundlePolicy;
    delete additionalSettings.rtcpMuxPolicy;
    delete additionalSettings.sdpSemantics;
    this._handler = handlerFactory();
    this._handler.run({
      direction,
      iceParameters,
      iceCandidates,
      dtlsParameters,
      sctpParameters,
      iceServers,
      iceTransportPolicy,
      additionalSettings,
      proprietaryConstraints,
      extendedRtpCapabilities,
    });
    this._appData = appData;
    this._handleHandler();
  }
  get id() {
    return this._id;
  }
  get closed() {
    return this._closed;
  }
  get direction() {
    return this._direction;
  }
  get handler() {
    return this._handler;
  }
  get connectionState() {
    return this._connectionState;
  }
  get appData() {
    return this._appData;
  }
  set appData(appData) {
    throw new Error("cannot override appData object");
  }
  close() {
    if (this._closed) return;
    logger.debug("close()");
    this._closed = true;
    this._awaitQueue.close();
    this._handler.close();
    for (const producer of this._producers.values()) {
      producer.transportClosed();
    }
    this._producers.clear();
    for (const consumer of this._consumers.values()) {
      consumer.transportClosed();
    }
    this._consumers.clear();
    for (const dataProducer of this._dataProducers.values()) {
      dataProducer.transportClosed();
    }
    this._dataProducers.clear();
    for (const dataConsumer of this._dataConsumers.values()) {
      dataConsumer.transportClosed();
    }
    this._dataConsumers.clear();
  }
  async getStats() {
    if (this._closed) throw new Error("closed");
    return this._handler.getTransportStats();
  }
  async restartIce({ iceParameters }) {
    logger.debug("restartIce()");
    if (this._closed) throw new Error("closed");
    else if (!iceParameters) throw new TypeError("missing iceParameters");
    return this._awaitQueue.push(async () =>
      this._handler.restartIce(iceParameters),
    );
  }
  async updateIceServers({ iceServers }: any = {}) {
    logger.debug("updateIceServers()");
    if (this._closed) throw new Error("closed");
    else if (!Array.isArray(iceServers))
      throw new TypeError("missing iceServers");
    return this._awaitQueue.push(async () =>
      this._handler.updateIceServers(iceServers),
    );
  }
  async produce({
    track,
    encodings,
    codecOptions,
    codec,
    stopTracks = true,
    disableTrackOnPause = true,
    zeroRtpOnPause = false,
    appData = {},
  }: any = {}) {
    logger.debug("produce() [track:%o]", track);
    if (!track) throw new TypeError("missing track");
    else if (this._direction !== "send")
      throw new Error("not a sending Transport");
    else if (!this._canProduceByKind[track.kind])
      throw new Error(`cannot produce ${track.kind}`);
    else if (track.readyState === "ended") throw new Error("track ended");
    else if (
      this.listenerCount("connect") === 0 &&
      this._connectionState === "new"
    )
      throw new TypeError('no "connect" listener set into this transport');
    else if (this.listenerCount("produce") === 0)
      throw new TypeError('no "produce" listener set into this transport');
    else if (appData && typeof appData !== "object")
      throw new TypeError("if given, appData must be an object");
    return this._awaitQueue
      .push(async () => {
        let normalizedEncodings;
        if (encodings && !Array.isArray(encodings)) {
          throw TypeError("encodings must be an array");
        } else if (encodings && encodings.length === 0) {
          normalizedEncodings = undefined;
        } else if (encodings) {
          normalizedEncodings = encodings.map((encoding) => {
            const normalizedEncoding: any = {
              active: true,
            };
            if (encoding.active === false) normalizedEncoding.active = false;
            if (typeof encoding.dtx === "boolean")
              normalizedEncoding.dtx = encoding.dtx;
            if (typeof encoding.scalabilityMode === "string")
              normalizedEncoding.scalabilityMode = encoding.scalabilityMode;
            if (typeof encoding.scaleResolutionDownBy === "number")
              normalizedEncoding.scaleResolutionDownBy =
                encoding.scaleResolutionDownBy;
            if (typeof encoding.maxBitrate === "number")
              normalizedEncoding.maxBitrate = encoding.maxBitrate;
            if (typeof encoding.maxFramerate === "number")
              normalizedEncoding.maxFramerate = encoding.maxFramerate;
            if (typeof encoding.adaptivePtime === "boolean")
              normalizedEncoding.adaptivePtime = encoding.adaptivePtime;
            if (typeof encoding.priority === "string")
              normalizedEncoding.priority = encoding.priority;
            if (typeof encoding.networkPriority === "string")
              normalizedEncoding.networkPriority = encoding.networkPriority;
            return normalizedEncoding;
          });
        }
        const { localId, rtpParameters, rtpSender } = await this._handler.send({
          track,
          encodings: normalizedEncodings,
          codecOptions,
          codec,
        });
        try {
          ortc.validateRtpParameters(rtpParameters);
          this.safeEmitAsPromise("produce", {
            kind: track.kind,
            rtpParameters,
            appData,
          });
          const producer = new Producer({
            localId,
            rtpSender,
            track,
            rtpParameters,
            stopTracks,
            disableTrackOnPause,
            zeroRtpOnPause,
            appData,
          } as any);
          this._producers.set(producer.id, producer);
          this._handleProducer(producer);
          return producer;
        } catch (error) {
          this._handler.stopSending(localId).catch(() => {});
          throw error;
        }
      })
      .catch((error) => {
        if (stopTracks) {
          try {
            track.stop();
          } catch (error2) {}
        }
        throw error;
      });
  }
  async consume({ id, producerId, kind, rtpParameters, appData = {} }) {
    logger.debug("consume()");
    if (this._closed) throw new Error("closed");
    else if (this._direction !== "recv")
      throw new Error("not a receiving Transport");
    else if (typeof id !== "string") throw new TypeError("missing id");
    else if (typeof producerId !== "string")
      throw new TypeError("missing producerId");
    else if (kind !== "audio" && kind !== "video")
      throw new TypeError(`invalid kind '${kind}'`);
    else if (
      this.listenerCount("connect") === 0 &&
      this._connectionState === "new"
    )
      throw new TypeError('no "connect" listener set into this transport');
    else if (appData && typeof appData !== "object")
      throw new TypeError("if given, appData must be an object");
    return this._awaitQueue.push(async () => {
      const canConsume = ortc.canReceive(
        rtpParameters,
        this._extendedRtpCapabilities,
      );
      if (!canConsume) throw new Error("cannot consume this Producer");
      const { localId, rtpReceiver, track } = await this._handler.receive({
        trackId: id,
        kind,
        rtpParameters,
      });
      const consumer = new Consumer({
        id,
        localId,
        producerId,
        rtpReceiver,
        track,
        rtpParameters,
        appData,
      });
      this._consumers.set(consumer.id, consumer);
      this._handleConsumer(consumer);
      if (!this._probatorConsumerCreated && kind === "video") {
        try {
          const probatorRtpParameters = ortc.generateProbatorRtpParameters(
            consumer.rtpParameters,
          );
          await this._handler.receive({
            trackId: "probator",
            kind: "video",
            rtpParameters: probatorRtpParameters,
          });
          logger.debug("consume() | Consumer for RTP probation created");
          this._probatorConsumerCreated = true;
        } catch (error) {
          logger.error(
            "consume() | failed to create Consumer for RTP probation:%o",
            error,
          );
        }
      }
      return consumer;
    });
  }
  async produceData({
    ordered = true,
    maxPacketLifeTime,
    maxRetransmits,
    priority = "low",
    label = "",
    protocol = "",
    appData = {},
  }: any = {}) {
    logger.debug("produceData()");
    if (this._direction !== "send") throw new Error("not a sending Transport");
    else if (!this._maxSctpMessageSize)
      throw new Error("SCTP not enabled by remote Transport");
    else if (!["very-low", "low", "medium", "high"].includes(priority))
      throw new TypeError("wrong priority");
    else if (
      this.listenerCount("connect") === 0 &&
      this._connectionState === "new"
    )
      throw new TypeError('no "connect" listener set into this transport');
    else if (this.listenerCount("producedata") === 0)
      throw new TypeError('no "producedata" listener set into this transport');
    else if (appData && typeof appData !== "object")
      throw new TypeError("if given, appData must be an object");
    if (maxPacketLifeTime || maxRetransmits) ordered = false;
    return this._awaitQueue.push(async () => {
      const { dataChannel, sctpStreamParameters } =
        await this._handler.sendDataChannel({
          ordered,
          maxPacketLifeTime,
          maxRetransmits,
          priority,
          label,
          protocol,
        });
      ortc.validateSctpStreamParameters(sctpStreamParameters);
      const { id } = (await this.safeEmitAsPromise("producedata", {
        sctpStreamParameters,
        label,
        protocol,
        appData,
      })) as any;
      const dataProducer = new DataProducer({
        id,
        dataChannel,
        sctpStreamParameters,
        appData,
      });
      this._dataProducers.set(dataProducer.id, dataProducer);
      this._handleDataProducer(dataProducer);
      return dataProducer;
    });
  }
  async consumeData({
    id,
    dataProducerId,
    sctpStreamParameters,
    label = "",
    protocol = "",
    appData = {},
  }) {
    logger.debug("consumeData()");
    if (this._closed) throw new Error("closed");
    else if (this._direction !== "recv")
      throw new Error("not a receiving Transport");
    else if (!this._maxSctpMessageSize)
      throw new Error("SCTP not enabled by remote Transport");
    else if (typeof id !== "string") throw new TypeError("missing id");
    else if (typeof dataProducerId !== "string")
      throw new TypeError("missing dataProducerId");
    else if (
      this.listenerCount("connect") === 0 &&
      this._connectionState === "new"
    )
      throw new TypeError('no "connect" listener set into this transport');
    else if (appData && typeof appData !== "object")
      throw new TypeError("if given, appData must be an object");
    ortc.validateSctpStreamParameters(sctpStreamParameters);
    return this._awaitQueue.push(async () => {
      const { dataChannel } = await this._handler.receiveDataChannel({
        sctpStreamParameters,
        label,
        protocol,
      });
      const dataConsumer = new DataConsumer({
        id,
        dataProducerId,
        dataChannel,
        sctpStreamParameters,
        appData,
      });
      this._dataConsumers.set(dataConsumer.id, dataConsumer);
      this._handleDataConsumer(dataConsumer);
      return dataConsumer;
    });
  }
  _handleHandler() {
    const handler = this._handler;
    handler.on("@connect", ({ dtlsParameters }, callback, errback) => {
      if (this._closed) {
        errback(new Error("closed"));
        return;
      }
      (this as any).safeEmit(
        "connect",
        {
          dtlsParameters,
        },
        callback,
        errback,
      );
    });
    handler.on("@connectionstatechange", (connectionState) => {
      if (connectionState === this._connectionState) return;
      logger.debug("connection state changed to %s", connectionState);
      this._connectionState = connectionState;
      if (!this._closed)
        (this as any).safeEmit("connectionstatechange", connectionState);
    });
  }
  _handleProducer(producer) {
    producer.on("@close", () => {
      this._producers.delete(producer.id);
      if (this._closed) return;
      this._awaitQueue
        .push(async () => this._handler.stopSending(producer.localId))
        .catch((error) => logger.warn("producer.close() failed:%o", error));
    });
    producer.on("@replacetrack", (track, callback, errback) => {
      this._awaitQueue
        .push(async () => this._handler.replaceTrack(producer.localId, track))
        .then(callback)
        .catch(errback);
    });
    producer.on("@setmaxspatiallayer", (spatialLayer, callback, errback) => {
      this._awaitQueue
        .push(async () =>
          this._handler.setMaxSpatialLayer(producer.localId, spatialLayer),
        )
        .then(callback)
        .catch(errback);
    });
    producer.on("@setrtpencodingparameters", (params, callback, errback) => {
      this._awaitQueue
        .push(async () =>
          this._handler.setRtpEncodingParameters(producer.localId, params),
        )
        .then(callback)
        .catch(errback);
    });
    producer.on("@getstats", (callback, errback) => {
      if (this._closed) return errback(new Error("closed"));
      this._handler
        .getSenderStats(producer.localId)
        .then(callback)
        .catch(errback);
    });
  }
  _handleConsumer(consumer) {
    consumer.on("@close", () => {
      this._consumers.delete(consumer.id);
      if (this._closed) return;
      this._awaitQueue
        .push(async () => this._handler.stopReceiving(consumer.localId))
        .catch(() => {});
    });
    consumer.on("@getstats", (callback, errback) => {
      if (this._closed) return errback(new Error("closed"));
      this._handler
        .getReceiverStats(consumer.localId)
        .then(callback)
        .catch(errback);
    });
  }
  _handleDataProducer(dataProducer) {
    dataProducer.on("@close", () => {
      this._dataProducers.delete(dataProducer.id);
    });
  }
  _handleDataConsumer(dataConsumer) {
    dataConsumer.on("@close", () => {
      this._dataConsumers.delete(dataConsumer.id);
    });
  }
}
