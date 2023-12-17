"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeHandler = void 0;
const sdp_transform_1 = __importDefault(require("sdp-transform"));
const logger_1 = require("./logger");
const sdp_1 = require("./sdp");
const ortc = __importStar(require("./ortc"));
const utils = __importStar(require("./utils"));
const wrtc_1 = __importDefault(require("wrtc"));
const events_1 = require("./events");
const { clone } = utils;
const logger = (0, logger_1.getLogger)();
class HandlerInterface extends events_1.EnhancedEventEmitter {
    constructor() {
        super();
    }
}
const SCTP_NUM_STREAMS = {
    OS: 1024,
    MIS: 1024,
};
class NodeHandler extends HandlerInterface {
    constructor() {
        super();
        this._sendStream = new wrtc_1.default.MediaStream();
        this._mapSendLocalIdTrack = new Map();
        this._nextSendLocalId = 0;
        this._mapRecvLocalIdInfo = new Map();
        this._hasDataChannelMediaSection = false;
        this._nextSendSctpStreamId = 0;
        this._transportReady = false;
    }
    static createFactory() {
        return () => new NodeHandler();
    }
    get name() {
        return "NodeJS";
    }
    close() {
        logger.debug("close()");
        if (this._pc) {
            try {
                this._pc.close();
            }
            catch (error) { }
        }
    }
    async getNativeRtpCapabilities() {
        logger.debug("getNativeRtpCapabilities()");
        const pc = new wrtc_1.default.RTCPeerConnection({
            iceServers: [],
            iceTransportPolicy: "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            sdpSemantics: "plan-b",
        });
        try {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            try {
                pc.close();
            }
            catch (error) { }
            const sdpObject = sdp_transform_1.default.parse(offer.sdp);
            const nativeRtpCapabilities = utils.extractRtpCapabilities({
                sdpObject,
            });
            return nativeRtpCapabilities;
        }
        catch (error) {
            try {
                pc.close();
            }
            catch (error2) { }
            throw error;
        }
    }
    async getNativeSctpCapabilities() {
        logger.debug("getNativeSctpCapabilities()");
        return {
            numStreams: SCTP_NUM_STREAMS,
        };
    }
    run({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, extendedRtpCapabilities, }) {
        logger.debug("run()");
        this._direction = direction;
        this._remoteSdp = new sdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            planB: true,
        });
        this._sendingRtpParametersByKind = {
            audio: ortc.getSendingRtpParameters("audio", extendedRtpCapabilities),
            video: ortc.getSendingRtpParameters("video", extendedRtpCapabilities),
        };
        this._sendingRemoteRtpParametersByKind = {
            audio: ortc.getSendingRemoteRtpParameters("audio", extendedRtpCapabilities),
            video: ortc.getSendingRemoteRtpParameters("video", extendedRtpCapabilities),
        };
        this._pc = new wrtc_1.default.RTCPeerConnection({
            iceServers: iceServers || [],
            iceTransportPolicy: iceTransportPolicy || "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            sdpSemantics: "plan-b",
            ...additionalSettings,
        }, proprietaryConstraints);
        this._pc.addEventListener("iceconnectionstatechange", () => {
            switch (this._pc.iceConnectionState) {
                case "checking":
                    this.emit("@connectionstatechange", "connecting");
                    break;
                case "connected":
                case "completed":
                    this.emit("@connectionstatechange", "connected");
                    break;
                case "failed":
                    this.emit("@connectionstatechange", "failed");
                    break;
                case "disconnected":
                    this.emit("@connectionstatechange", "disconnected");
                    break;
                case "closed":
                    this.emit("@connectionstatechange", "closed");
                    break;
            }
        });
    }
    async updateIceServers(iceServers) {
        logger.debug("updateIceServers()");
        const configuration = this._pc.getConfiguration();
        configuration.iceServers = iceServers;
        this._pc.setConfiguration(configuration);
    }
    async restartIce(iceParameters) {
        logger.debug("restartIce()");
        this._remoteSdp.updateIceParameters(iceParameters);
        if (!this._transportReady)
            return;
        if (this._direction === "send") {
            const offer = await this._pc.createOffer({
                iceRestart: true,
            });
            logger.debug("restartIce() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            const answer = {
                type: "answer",
                sdp: this._remoteSdp.getSdp(),
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
        }
        else {
            const offer = {
                type: "offer",
                sdp: this._remoteSdp.getSdp(),
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug("restartIce() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
        }
    }
    async getTransportStats() {
        return this._pc.getStats();
    }
    async send({ track, encodings, codecOptions, codec }) {
        this._assertSendDirection();
        logger.debug("send() [kind:%s, track.id:%s]", track.kind, track.id);
        if (codec) {
            logger.warn("send() | codec selection is not available in %s handler", this.name);
        }
        this._sendStream.addTrack(track);
        this._pc.addStream(this._sendStream);
        let offer = await this._pc.createOffer();
        let localSdpObject = sdp_transform_1.default.parse(offer.sdp);
        let offerMediaObject;
        const sendingRtpParameters = clone(this._sendingRtpParametersByKind[track.kind]);
        sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs);
        const sendingRemoteRtpParameters = clone(this._sendingRemoteRtpParametersByKind[track.kind]);
        sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs);
        if (!this._transportReady)
            this._setupTransport({
                localDtlsRole: "server",
                localSdpObject,
            });
        if (track.kind === "video" && encodings && encodings.length > 1) {
            logger.debug("send() | enabling simulcast");
            localSdpObject = sdp_transform_1.default.parse(offer.sdp);
            offerMediaObject = localSdpObject.media.find((m) => m.type === "video");
            utils.addLegacySimulcast({
                offerMediaObject,
                track,
                numStreams: encodings.length,
            });
            offer = {
                type: "offer",
                sdp: sdp_transform_1.default.write(localSdpObject),
            };
        }
        logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
        await this._pc.setLocalDescription(offer);
        localSdpObject = sdp_transform_1.default.parse(this._pc.localDescription.sdp);
        offerMediaObject = localSdpObject.media.find((m) => m.type === track.kind);
        sendingRtpParameters.rtcp.cname = utils.getCname({
            offerMediaObject,
        });
        sendingRtpParameters.encodings = utils.getRtpEncodings({
            offerMediaObject,
            track,
        });
        if (encodings) {
            for (let idx = 0; idx < sendingRtpParameters.encodings.length; ++idx) {
                if (encodings[idx])
                    Object.assign(sendingRtpParameters.encodings[idx], encodings[idx]);
            }
        }
        if (sendingRtpParameters.encodings.length > 1 &&
            sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp8") {
            for (const encoding of sendingRtpParameters.encodings) {
                encoding.scalabilityMode = "S1T3";
            }
        }
        this._remoteSdp.send({
            offerMediaObject,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions,
        });
        const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp(),
        };
        logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
        await this._pc.setRemoteDescription(answer);
        const localId = String(this._nextSendLocalId);
        this._nextSendLocalId++;
        this._mapSendLocalIdTrack.set(localId, track);
        return {
            localId: localId,
            rtpParameters: sendingRtpParameters,
        };
    }
    async stopSending(localId) {
        this._assertSendDirection();
        logger.debug("stopSending() [localId:%s]", localId);
        const track = this._mapSendLocalIdTrack.get(localId);
        if (!track)
            throw new Error("track not found");
        this._mapSendLocalIdTrack.delete(localId);
        this._sendStream.removeTrack(track);
        this._pc.addStream(this._sendStream);
        const offer = await this._pc.createOffer();
        logger.debug("stopSending() | calling pc.setLocalDescription() [offer:%o]", offer);
        try {
            await this._pc.setLocalDescription(offer);
        }
        catch (error) {
            if (this._sendStream.getTracks().length === 0) {
                logger.warn("stopSending() | ignoring expected error due no sending tracks: %s", error.toString());
                return;
            }
            throw error;
        }
        if (this._pc.signalingState === "stable")
            return;
        const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp(),
        };
        logger.debug("stopSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
        await this._pc.setRemoteDescription(answer);
    }
    async replaceTrack(localId, track) {
        throw new Error("not implemented");
    }
    async setMaxSpatialLayer(localId, spatialLayer) {
        throw new Error(" not implemented");
    }
    async setRtpEncodingParameters(localId, params) {
        throw new Error("not supported");
    }
    async getSenderStats(localId) {
        throw new Error("not implemented");
    }
    async sendDataChannel({ ordered, maxPacketLifeTime, maxRetransmits, label, protocol, priority, }) {
        this._assertSendDirection();
        const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmitTime: maxPacketLifeTime,
            maxRetransmits,
            protocol,
            priority,
        };
        logger.debug("sendDataChannel() [options:%o]", options);
        const dataChannel = this._pc.createDataChannel(label, options);
        this._nextSendSctpStreamId =
            ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
        if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdp_transform_1.default.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady)
                this._setupTransport({
                    localDtlsRole: "server",
                    localSdpObject,
                });
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({
                offerMediaObject,
            });
            const answer = {
                type: "answer",
                sdp: this._remoteSdp.getSdp(),
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
        }
        const sctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits,
        };
        return {
            dataChannel,
            sctpStreamParameters,
        };
    }
    async receive({ trackId, kind, rtpParameters }) {
        this._assertRecvDirection();
        logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
        const localId = trackId;
        const mid = kind;
        const streamId = rtpParameters.rtcp.cname;
        this._remoteSdp.receive({
            mid,
            kind,
            offerRtpParameters: rtpParameters,
            streamId,
            trackId,
        });
        const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp(),
        };
        logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
        await this._pc.setRemoteDescription(offer);
        let answer = await this._pc.createAnswer();
        const localSdpObject = sdp_transform_1.default.parse(answer.sdp);
        const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === mid);
        utils.applyCodecParameters({
            offerRtpParameters: rtpParameters,
            answerMediaObject,
        });
        answer = {
            type: "answer",
            sdp: sdp_transform_1.default.write(localSdpObject),
        };
        if (!this._transportReady)
            this._setupTransport({
                localDtlsRole: "client",
                localSdpObject,
            });
        logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
        await this._pc.setLocalDescription(answer);
        const stream = this._pc.getRemoteStreams().find((s) => s.id === streamId);
        const track = stream.getTrackById(localId);
        if (!track)
            throw new Error("remote track not found");
        this._mapRecvLocalIdInfo.set(localId, {
            mid,
            rtpParameters,
        });
        return {
            localId,
            track,
        };
    }
    async stopReceiving(localId) {
        this._assertRecvDirection();
        logger.debug("stopReceiving() [localId:%s]", localId);
        const { mid, rtpParameters } = this._mapRecvLocalIdInfo.get(localId) || {};
        this._mapRecvLocalIdInfo.delete(localId);
        this._remoteSdp.planBStopReceiving({
            mid: mid,
            offerRtpParameters: rtpParameters,
        });
        const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp(),
        };
        logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
        await this._pc.setRemoteDescription(offer);
        const answer = await this._pc.createAnswer();
        logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
        await this._pc.setLocalDescription(answer);
    }
    async getReceiverStats(localId) {
        throw new Error("not implemented");
    }
    async receiveDataChannel({ sctpStreamParameters, label, protocol }) {
        this._assertRecvDirection();
        const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
        const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmitTime: maxPacketLifeTime,
            maxRetransmits,
            protocol,
        };
        logger.debug("receiveDataChannel() [options:%o]", options);
        const dataChannel = this._pc.createDataChannel(label, options);
        if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation({
                oldDataChannelSpec: true,
            });
            const offer = {
                type: "offer",
                sdp: this._remoteSdp.getSdp(),
            };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            if (!this._transportReady) {
                const localSdpObject = sdp_transform_1.default.parse(answer.sdp);
                this._setupTransport({
                    localDtlsRole: "client",
                    localSdpObject,
                });
            }
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
        }
        return {
            dataChannel,
        };
    }
    async _setupTransport({ localDtlsRole, localSdpObject }) {
        if (!localSdpObject)
            localSdpObject = sdp_transform_1.default.parse(this._pc.localDescription.sdp);
        const dtlsParameters = utils.extractDtlsParameters({
            sdpObject: localSdpObject,
        });
        dtlsParameters.role = localDtlsRole;
        this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
        await this.safeEmitAsPromise("@connect", {
            dtlsParameters,
        });
        this._transportReady = true;
    }
    _assertSendDirection() {
        if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
        }
    }
    _assertRecvDirection() {
        if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
        }
    }
}
exports.NodeHandler = NodeHandler;
//# sourceMappingURL=handler.js.map