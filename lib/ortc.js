"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduceRtcpFeedback = exports.matchHeaderExtensions = exports.matchCodecs = exports.isRtxCodec = exports.canReceive = exports.canSend = exports.generateProbatorRtpParameters = exports.reduceCodecs = exports.getSendingRemoteRtpParameters = exports.getSendingRtpParameters = exports.getRecvRtpCapabilities = exports.getExtendedRtpCapabilities = exports.validateSctpStreamParameters = exports.validateSctpParameters = exports.validateNumSctpStreams = exports.validateSctpCapabilities = exports.validateRtcpParameters = exports.validateRtpEncodingParameters = exports.validateRtpHeaderExtensionParameters = exports.validateRtpCodecParameters = exports.validateRtpParameters = exports.validateRtpHeaderExtension = exports.validateRtcpFeedback = exports.validateRtpCodecCapability = exports.validateRtpCapabilities = exports.RTP_PROBATOR_CODEC_PAYLOAD_TYPE = exports.RTP_PROBATOR_SSRC = exports.RTP_PROBATOR_MID = void 0;
const h264_profile_level_id_1 = __importDefault(require("h264-profile-level-id"));
const utils_1 = require("./utils");
exports.RTP_PROBATOR_MID = "probator";
exports.RTP_PROBATOR_SSRC = 1234;
exports.RTP_PROBATOR_CODEC_PAYLOAD_TYPE = 127;
function validateRtpCapabilities(caps) {
    if (typeof caps !== "object")
        throw new TypeError("caps is not an object");
    if (caps.codecs && !Array.isArray(caps.codecs))
        throw new TypeError("caps.codecs is not an array");
    else if (!caps.codecs)
        caps.codecs = [];
    for (const codec of caps.codecs) {
        validateRtpCodecCapability(codec);
    }
    if (caps.headerExtensions && !Array.isArray(caps.headerExtensions))
        throw new TypeError("caps.headerExtensions is not an array");
    else if (!caps.headerExtensions)
        caps.headerExtensions = [];
    for (const ext of caps.headerExtensions) {
        validateRtpHeaderExtension(ext);
    }
}
exports.validateRtpCapabilities = validateRtpCapabilities;
function validateRtpCodecCapability(codec) {
    const MimeTypeRegex = new RegExp("^(audio|video)/(.+)", "i");
    if (typeof codec !== "object")
        throw new TypeError("codec is not an object");
    if (!codec.mimeType || typeof codec.mimeType !== "string")
        throw new TypeError("missing codec.mimeType");
    const mimeTypeMatch = MimeTypeRegex.exec(codec.mimeType);
    if (!mimeTypeMatch)
        throw new TypeError("invalid codec.mimeType");
    codec.kind = mimeTypeMatch[1].toLowerCase();
    if (codec.preferredPayloadType &&
        typeof codec.preferredPayloadType !== "number")
        throw new TypeError("invalid codec.preferredPayloadType");
    if (typeof codec.clockRate !== "number")
        throw new TypeError("missing codec.clockRate");
    if (codec.kind === "audio") {
        if (typeof codec.channels !== "number")
            codec.channels = 1;
    }
    else {
        delete codec.channels;
    }
    if (!codec.parameters || typeof codec.parameters !== "object")
        codec.parameters = {};
    for (const key of Object.keys(codec.parameters)) {
        let value = codec.parameters[key];
        if (value === undefined) {
            codec.parameters[key] = "";
            value = "";
        }
        if (typeof value !== "string" && typeof value !== "number") {
            throw new TypeError(`invalid codec parameter [key:${key}s, value:${value}]`);
        }
        if (key === "apt") {
            if (typeof value !== "number")
                throw new TypeError("invalid codec apt parameter");
        }
    }
    if (!codec.rtcpFeedback || !Array.isArray(codec.rtcpFeedback))
        codec.rtcpFeedback = [];
    for (const fb of codec.rtcpFeedback) {
        validateRtcpFeedback(fb);
    }
}
exports.validateRtpCodecCapability = validateRtpCodecCapability;
function validateRtcpFeedback(fb) {
    if (typeof fb !== "object")
        throw new TypeError("fb is not an object");
    if (!fb.type || typeof fb.type !== "string")
        throw new TypeError("missing fb.type");
    if (!fb.parameter || typeof fb.parameter !== "string")
        fb.parameter = "";
}
exports.validateRtcpFeedback = validateRtcpFeedback;
function validateRtpHeaderExtension(ext) {
    if (typeof ext !== "object")
        throw new TypeError("ext is not an object");
    if (!ext.kind || typeof ext.kind !== "string")
        ext.kind = "";
    if (ext.kind !== "" && ext.kind !== "audio" && ext.kind !== "video")
        throw new TypeError("invalid ext.kind");
    if (!ext.uri || typeof ext.uri !== "string")
        throw new TypeError("missing ext.uri");
    if (typeof ext.preferredId !== "number")
        throw new TypeError("missing ext.preferredId");
    if (ext.preferredEncrypt && typeof ext.preferredEncrypt !== "boolean")
        throw new TypeError("invalid ext.preferredEncrypt");
    else if (!ext.preferredEncrypt)
        ext.preferredEncrypt = false;
    if (ext.direction && typeof ext.direction !== "string")
        throw new TypeError("invalid ext.direction");
    else if (!ext.direction)
        ext.direction = "sendrecv";
}
exports.validateRtpHeaderExtension = validateRtpHeaderExtension;
function validateRtpParameters(params) {
    if (typeof params !== "object")
        throw new TypeError("params is not an object");
    if (params.mid && typeof params.mid !== "string")
        throw new TypeError("params.mid is not a string");
    if (!Array.isArray(params.codecs))
        throw new TypeError("missing params.codecs");
    for (const codec of params.codecs) {
        validateRtpCodecParameters(codec);
    }
    if (params.headerExtensions && !Array.isArray(params.headerExtensions))
        throw new TypeError("params.headerExtensions is not an array");
    else if (!params.headerExtensions)
        params.headerExtensions = [];
    for (const ext of params.headerExtensions) {
        validateRtpHeaderExtensionParameters(ext);
    }
    if (params.encodings && !Array.isArray(params.encodings))
        throw new TypeError("params.encodings is not an array");
    else if (!params.encodings)
        params.encodings = [];
    for (const encoding of params.encodings) {
        validateRtpEncodingParameters(encoding);
    }
    if (params.rtcp && typeof params.rtcp !== "object")
        throw new TypeError("params.rtcp is not an object");
    else if (!params.rtcp)
        params.rtcp = {};
    validateRtcpParameters(params.rtcp);
}
exports.validateRtpParameters = validateRtpParameters;
function validateRtpCodecParameters(codec) {
    const MimeTypeRegex = new RegExp("^(audio|video)/(.+)", "i");
    if (typeof codec !== "object")
        throw new TypeError("codec is not an object");
    if (!codec.mimeType || typeof codec.mimeType !== "string")
        throw new TypeError("missing codec.mimeType");
    const mimeTypeMatch = MimeTypeRegex.exec(codec.mimeType);
    if (!mimeTypeMatch)
        throw new TypeError("invalid codec.mimeType");
    if (typeof codec.payloadType !== "number")
        throw new TypeError("missing codec.payloadType");
    if (typeof codec.clockRate !== "number")
        throw new TypeError("missing codec.clockRate");
    const kind = mimeTypeMatch[1].toLowerCase();
    if (kind === "audio") {
        if (typeof codec.channels !== "number")
            codec.channels = 1;
    }
    else {
        delete codec.channels;
    }
    if (!codec.parameters || typeof codec.parameters !== "object")
        codec.parameters = {};
    for (const key of Object.keys(codec.parameters)) {
        let value = codec.parameters[key];
        if (value === undefined) {
            codec.parameters[key] = "";
            value = "";
        }
        if (typeof value !== "string" && typeof value !== "number") {
            throw new TypeError(`invalid codec parameter [key:${key}s, value:${value}]`);
        }
        if (key === "apt") {
            if (typeof value !== "number")
                throw new TypeError("invalid codec apt parameter");
        }
    }
    if (!codec.rtcpFeedback || !Array.isArray(codec.rtcpFeedback))
        codec.rtcpFeedback = [];
    for (const fb of codec.rtcpFeedback) {
        validateRtcpFeedback(fb);
    }
}
exports.validateRtpCodecParameters = validateRtpCodecParameters;
function validateRtpHeaderExtensionParameters(ext) {
    if (typeof ext !== "object")
        throw new TypeError("ext is not an object");
    if (!ext.uri || typeof ext.uri !== "string")
        throw new TypeError("missing ext.uri");
    if (typeof ext.id !== "number")
        throw new TypeError("missing ext.id");
    if (ext.encrypt && typeof ext.encrypt !== "boolean")
        throw new TypeError("invalid ext.encrypt");
    else if (!ext.encrypt)
        ext.encrypt = false;
    if (!ext.parameters || typeof ext.parameters !== "object")
        ext.parameters = {};
    for (const key of Object.keys(ext.parameters)) {
        let value = ext.parameters[key];
        if (value === undefined) {
            ext.parameters[key] = "";
            value = "";
        }
        if (typeof value !== "string" && typeof value !== "number")
            throw new TypeError("invalid header extension parameter");
    }
}
exports.validateRtpHeaderExtensionParameters = validateRtpHeaderExtensionParameters;
function validateRtpEncodingParameters(encoding) {
    if (typeof encoding !== "object")
        throw new TypeError("encoding is not an object");
    if (encoding.ssrc && typeof encoding.ssrc !== "number")
        throw new TypeError("invalid encoding.ssrc");
    if (encoding.rid && typeof encoding.rid !== "string")
        throw new TypeError("invalid encoding.rid");
    if (encoding.rtx && typeof encoding.rtx !== "object") {
        throw new TypeError("invalid encoding.rtx");
    }
    else if (encoding.rtx) {
        if (typeof encoding.rtx.ssrc !== "number")
            throw new TypeError("missing encoding.rtx.ssrc");
    }
    if (!encoding.dtx || typeof encoding.dtx !== "boolean")
        encoding.dtx = false;
    if (encoding.scalabilityMode && typeof encoding.scalabilityMode !== "string")
        throw new TypeError("invalid encoding.scalabilityMode");
}
exports.validateRtpEncodingParameters = validateRtpEncodingParameters;
function validateRtcpParameters(rtcp) {
    if (typeof rtcp !== "object")
        throw new TypeError("rtcp is not an object");
    if (rtcp.cname && typeof rtcp.cname !== "string")
        throw new TypeError("invalid rtcp.cname");
    if (!rtcp.reducedSize || typeof rtcp.reducedSize !== "boolean")
        rtcp.reducedSize = true;
}
exports.validateRtcpParameters = validateRtcpParameters;
function validateSctpCapabilities(caps) {
    if (typeof caps !== "object")
        throw new TypeError("caps is not an object");
    if (!caps.numStreams || typeof caps.numStreams !== "object")
        throw new TypeError("missing caps.numStreams");
    validateNumSctpStreams(caps.numStreams);
}
exports.validateSctpCapabilities = validateSctpCapabilities;
function validateNumSctpStreams(numStreams) {
    if (typeof numStreams !== "object")
        throw new TypeError("numStreams is not an object");
    if (typeof numStreams.OS !== "number")
        throw new TypeError("missing numStreams.OS");
    if (typeof numStreams.MIS !== "number")
        throw new TypeError("missing numStreams.MIS");
}
exports.validateNumSctpStreams = validateNumSctpStreams;
function validateSctpParameters(params) {
    if (typeof params !== "object")
        throw new TypeError("params is not an object");
    if (typeof params.port !== "number")
        throw new TypeError("missing params.port");
    if (typeof params.OS !== "number")
        throw new TypeError("missing params.OS");
    if (typeof params.MIS !== "number")
        throw new TypeError("missing params.MIS");
    if (typeof params.maxMessageSize !== "number")
        throw new TypeError("missing params.maxMessageSize");
}
exports.validateSctpParameters = validateSctpParameters;
function validateSctpStreamParameters(params) {
    if (typeof params !== "object")
        throw new TypeError("params is not an object");
    if (typeof params.streamId !== "number")
        throw new TypeError("missing params.streamId");
    let orderedGiven = false;
    if (typeof params.ordered === "boolean")
        orderedGiven = true;
    else
        params.ordered = true;
    if (params.maxPacketLifeTime && typeof params.maxPacketLifeTime !== "number")
        throw new TypeError("invalid params.maxPacketLifeTime");
    if (params.maxRetransmits && typeof params.maxRetransmits !== "number")
        throw new TypeError("invalid params.maxRetransmits");
    if (params.maxPacketLifeTime && params.maxRetransmits)
        throw new TypeError("cannot provide both maxPacketLifeTime and maxRetransmits");
    if (orderedGiven &&
        params.ordered &&
        (params.maxPacketLifeTime || params.maxRetransmits)) {
        throw new TypeError("cannot be ordered with maxPacketLifeTime or maxRetransmits");
    }
    else if (!orderedGiven &&
        (params.maxPacketLifeTime || params.maxRetransmits)) {
        params.ordered = false;
    }
    if (params.priority && typeof params.priority !== "string")
        throw new TypeError("invalid params.priority");
    if (params.label && typeof params.label !== "string")
        throw new TypeError("invalid params.label");
    if (params.protocol && typeof params.protocol !== "string")
        throw new TypeError("invalid params.protocol");
}
exports.validateSctpStreamParameters = validateSctpStreamParameters;
function getExtendedRtpCapabilities(localCaps, remoteCaps) {
    const extendedRtpCapabilities = {
        codecs: [],
        headerExtensions: [],
    };
    for (const remoteCodec of remoteCaps.codecs || []) {
        if (isRtxCodec(remoteCodec))
            continue;
        const matchingLocalCodec = (localCaps.codecs || []).find((localCodec) => matchCodecs(localCodec, remoteCodec, {
            strict: true,
            modify: true,
        }));
        if (!matchingLocalCodec)
            continue;
        const extendedCodec = {
            mimeType: matchingLocalCodec.mimeType,
            kind: matchingLocalCodec.kind,
            clockRate: matchingLocalCodec.clockRate,
            channels: matchingLocalCodec.channels,
            localPayloadType: matchingLocalCodec.preferredPayloadType,
            localRtxPayloadType: undefined,
            remotePayloadType: remoteCodec.preferredPayloadType,
            remoteRtxPayloadType: undefined,
            localParameters: matchingLocalCodec.parameters,
            remoteParameters: remoteCodec.parameters,
            rtcpFeedback: reduceRtcpFeedback(matchingLocalCodec, remoteCodec),
        };
        extendedRtpCapabilities.codecs.push(extendedCodec);
    }
    for (const extendedCodec of extendedRtpCapabilities.codecs) {
        const matchingLocalRtxCodec = localCaps.codecs.find((localCodec) => isRtxCodec(localCodec) &&
            localCodec.parameters.apt === extendedCodec.localPayloadType);
        const matchingRemoteRtxCodec = remoteCaps.codecs.find((remoteCodec) => isRtxCodec(remoteCodec) &&
            remoteCodec.parameters.apt === extendedCodec.remotePayloadType);
        if (matchingLocalRtxCodec && matchingRemoteRtxCodec) {
            extendedCodec.localRtxPayloadType =
                matchingLocalRtxCodec.preferredPayloadType;
            extendedCodec.remoteRtxPayloadType =
                matchingRemoteRtxCodec.preferredPayloadType;
        }
    }
    for (const remoteExt of remoteCaps.headerExtensions) {
        const matchingLocalExt = localCaps.headerExtensions.find((localExt) => matchHeaderExtensions(localExt, remoteExt));
        if (!matchingLocalExt)
            continue;
        const extendedExt = {
            kind: remoteExt.kind,
            uri: remoteExt.uri,
            sendId: matchingLocalExt.preferredId,
            recvId: remoteExt.preferredId,
            encrypt: matchingLocalExt.preferredEncrypt,
            direction: "sendrecv",
        };
        switch (remoteExt.direction) {
            case "sendrecv":
                extendedExt.direction = "sendrecv";
                break;
            case "recvonly":
                extendedExt.direction = "sendonly";
                break;
            case "sendonly":
                extendedExt.direction = "recvonly";
                break;
            case "inactive":
                extendedExt.direction = "inactive";
                break;
        }
        extendedRtpCapabilities.headerExtensions.push(extendedExt);
    }
    return extendedRtpCapabilities;
}
exports.getExtendedRtpCapabilities = getExtendedRtpCapabilities;
function getRecvRtpCapabilities(extendedRtpCapabilities) {
    const rtpCapabilities = {
        codecs: [],
        headerExtensions: [],
    };
    for (const extendedCodec of extendedRtpCapabilities.codecs) {
        const codec = {
            mimeType: extendedCodec.mimeType,
            kind: extendedCodec.kind,
            preferredPayloadType: extendedCodec.remotePayloadType,
            clockRate: extendedCodec.clockRate,
            channels: extendedCodec.channels,
            parameters: extendedCodec.localParameters,
            rtcpFeedback: extendedCodec.rtcpFeedback,
        };
        rtpCapabilities.codecs.push(codec);
        if (!extendedCodec.remoteRtxPayloadType)
            continue;
        const rtxCodec = {
            mimeType: `${extendedCodec.kind}/rtx`,
            kind: extendedCodec.kind,
            preferredPayloadType: extendedCodec.remoteRtxPayloadType,
            clockRate: extendedCodec.clockRate,
            parameters: {
                apt: extendedCodec.remotePayloadType,
            },
            rtcpFeedback: [],
        };
        rtpCapabilities.codecs.push(rtxCodec);
    }
    for (const extendedExtension of extendedRtpCapabilities.headerExtensions) {
        if (extendedExtension.direction !== "sendrecv" &&
            extendedExtension.direction !== "recvonly") {
            continue;
        }
        const ext = {
            kind: extendedExtension.kind,
            uri: extendedExtension.uri,
            preferredId: extendedExtension.recvId,
            preferredEncrypt: extendedExtension.encrypt,
            direction: extendedExtension.direction,
        };
        rtpCapabilities.headerExtensions.push(ext);
    }
    return rtpCapabilities;
}
exports.getRecvRtpCapabilities = getRecvRtpCapabilities;
function getSendingRtpParameters(kind, extendedRtpCapabilities) {
    const rtpParameters = {
        mid: undefined,
        codecs: [],
        headerExtensions: [],
        encodings: [],
        rtcp: {},
    };
    for (const extendedCodec of extendedRtpCapabilities.codecs) {
        if (extendedCodec.kind !== kind)
            continue;
        const codec = {
            mimeType: extendedCodec.mimeType,
            payloadType: extendedCodec.localPayloadType,
            clockRate: extendedCodec.clockRate,
            channels: extendedCodec.channels,
            parameters: extendedCodec.localParameters,
            rtcpFeedback: extendedCodec.rtcpFeedback,
        };
        rtpParameters.codecs.push(codec);
        if (extendedCodec.localRtxPayloadType) {
            const rtxCodec = {
                mimeType: `${extendedCodec.kind}/rtx`,
                payloadType: extendedCodec.localRtxPayloadType,
                clockRate: extendedCodec.clockRate,
                parameters: {
                    apt: extendedCodec.localPayloadType,
                },
                rtcpFeedback: [],
            };
            rtpParameters.codecs.push(rtxCodec);
        }
    }
    for (const extendedExtension of extendedRtpCapabilities.headerExtensions) {
        if ((extendedExtension.kind && extendedExtension.kind !== kind) ||
            (extendedExtension.direction !== "sendrecv" &&
                extendedExtension.direction !== "sendonly")) {
            continue;
        }
        const ext = {
            uri: extendedExtension.uri,
            id: extendedExtension.sendId,
            encrypt: extendedExtension.encrypt,
            parameters: {},
        };
        rtpParameters.headerExtensions.push(ext);
    }
    return rtpParameters;
}
exports.getSendingRtpParameters = getSendingRtpParameters;
function getSendingRemoteRtpParameters(kind, extendedRtpCapabilities) {
    const rtpParameters = {
        mid: undefined,
        codecs: [],
        headerExtensions: [],
        encodings: [],
        rtcp: {},
    };
    for (const extendedCodec of extendedRtpCapabilities.codecs) {
        if (extendedCodec.kind !== kind)
            continue;
        const codec = {
            mimeType: extendedCodec.mimeType,
            payloadType: extendedCodec.localPayloadType,
            clockRate: extendedCodec.clockRate,
            channels: extendedCodec.channels,
            parameters: extendedCodec.remoteParameters,
            rtcpFeedback: extendedCodec.rtcpFeedback,
        };
        rtpParameters.codecs.push(codec);
        if (extendedCodec.localRtxPayloadType) {
            const rtxCodec = {
                mimeType: `${extendedCodec.kind}/rtx`,
                payloadType: extendedCodec.localRtxPayloadType,
                clockRate: extendedCodec.clockRate,
                parameters: {
                    apt: extendedCodec.localPayloadType,
                },
                rtcpFeedback: [],
            };
            rtpParameters.codecs.push(rtxCodec);
        }
    }
    for (const extendedExtension of extendedRtpCapabilities.headerExtensions) {
        if ((extendedExtension.kind && extendedExtension.kind !== kind) ||
            (extendedExtension.direction !== "sendrecv" &&
                extendedExtension.direction !== "sendonly")) {
            continue;
        }
        const ext = {
            uri: extendedExtension.uri,
            id: extendedExtension.sendId,
            encrypt: extendedExtension.encrypt,
            parameters: {},
        };
        rtpParameters.headerExtensions.push(ext);
    }
    if (rtpParameters.headerExtensions.some((ext) => ext.uri ===
        "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01")) {
        for (const codec of rtpParameters.codecs) {
            codec.rtcpFeedback = (codec.rtcpFeedback || []).filter((fb) => fb.type !== "goog-remb");
        }
    }
    else if (rtpParameters.headerExtensions.some((ext) => ext.uri ===
        "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time")) {
        for (const codec of rtpParameters.codecs) {
            codec.rtcpFeedback = (codec.rtcpFeedback || []).filter((fb) => fb.type !== "transport-cc");
        }
    }
    else {
        for (const codec of rtpParameters.codecs) {
            codec.rtcpFeedback = (codec.rtcpFeedback || []).filter((fb) => fb.type !== "transport-cc" && fb.type !== "goog-remb");
        }
    }
    return rtpParameters;
}
exports.getSendingRemoteRtpParameters = getSendingRemoteRtpParameters;
function reduceCodecs(codecs, capCodec) {
    const filteredCodecs = [];
    if (!capCodec) {
        filteredCodecs.push(codecs[0]);
        if (isRtxCodec(codecs[1]))
            filteredCodecs.push(codecs[1]);
    }
    else {
        for (let idx = 0; idx < codecs.length; ++idx) {
            if (matchCodecs(codecs[idx], capCodec)) {
                filteredCodecs.push(codecs[idx]);
                if (isRtxCodec(codecs[idx + 1]))
                    filteredCodecs.push(codecs[idx + 1]);
                break;
            }
        }
        if (filteredCodecs.length === 0)
            throw new TypeError("no matching codec found");
    }
    return filteredCodecs;
}
exports.reduceCodecs = reduceCodecs;
function generateProbatorRtpParameters(videoRtpParameters) {
    videoRtpParameters = (0, utils_1.clone)(videoRtpParameters);
    validateRtpParameters(videoRtpParameters);
    const rtpParameters = {
        mid: exports.RTP_PROBATOR_MID,
        codecs: [],
        headerExtensions: [],
        encodings: [
            {
                ssrc: exports.RTP_PROBATOR_SSRC,
            },
        ],
        rtcp: {
            cname: "probator",
        },
    };
    rtpParameters.codecs.push(videoRtpParameters.codecs[0]);
    rtpParameters.codecs[0].payloadType = exports.RTP_PROBATOR_CODEC_PAYLOAD_TYPE;
    rtpParameters.headerExtensions = videoRtpParameters.headerExtensions;
    return rtpParameters;
}
exports.generateProbatorRtpParameters = generateProbatorRtpParameters;
function canSend(kind, extendedRtpCapabilities) {
    return extendedRtpCapabilities.codecs.some((codec) => codec.kind === kind);
}
exports.canSend = canSend;
function canReceive(rtpParameters, extendedRtpCapabilities) {
    validateRtpParameters(rtpParameters);
    if (rtpParameters.codecs.length === 0)
        return false;
    const firstMediaCodec = rtpParameters.codecs[0];
    return extendedRtpCapabilities.codecs.some((codec) => codec.remotePayloadType === firstMediaCodec.payloadType);
}
exports.canReceive = canReceive;
function isRtxCodec(codec) {
    if (!codec)
        return false;
    return /.+\/rtx$/i.test(codec.mimeType);
}
exports.isRtxCodec = isRtxCodec;
function matchCodecs(aCodec, bCodec, { strict = false, modify = false } = {}) {
    const aMimeType = aCodec.mimeType.toLowerCase();
    const bMimeType = bCodec.mimeType.toLowerCase();
    if (aMimeType !== bMimeType)
        return false;
    if (aCodec.clockRate !== bCodec.clockRate)
        return false;
    if (aCodec.channels !== bCodec.channels)
        return false;
    switch (aMimeType) {
        case "video/h264": {
            const aPacketizationMode = aCodec.parameters["packetization-mode"] || 0;
            const bPacketizationMode = bCodec.parameters["packetization-mode"] || 0;
            if (aPacketizationMode !== bPacketizationMode)
                return false;
            if (strict) {
                if (!h264_profile_level_id_1.default.isSameProfile(aCodec.parameters, bCodec.parameters))
                    return false;
                let selectedProfileLevelId;
                try {
                    selectedProfileLevelId = h264_profile_level_id_1.default.generateProfileLevelIdForAnswer(aCodec.parameters, bCodec.parameters);
                }
                catch (error) {
                    return false;
                }
                if (modify) {
                    if (selectedProfileLevelId)
                        aCodec.parameters["profile-level-id"] = selectedProfileLevelId;
                    else
                        delete aCodec.parameters["profile-level-id"];
                }
            }
            break;
        }
        case "video/vp9": {
            if (strict) {
                const aProfileId = aCodec.parameters["profile-id"] || 0;
                const bProfileId = bCodec.parameters["profile-id"] || 0;
                if (aProfileId !== bProfileId)
                    return false;
            }
            break;
        }
    }
    return true;
}
exports.matchCodecs = matchCodecs;
function matchHeaderExtensions(aExt, bExt) {
    if (aExt.kind && bExt.kind && aExt.kind !== bExt.kind)
        return false;
    if (aExt.uri !== bExt.uri)
        return false;
    return true;
}
exports.matchHeaderExtensions = matchHeaderExtensions;
function reduceRtcpFeedback(codecA, codecB) {
    const reducedRtcpFeedback = [];
    for (const aFb of codecA.rtcpFeedback || []) {
        const matchingBFb = (codecB.rtcpFeedback || []).find((bFb) => bFb.type === aFb.type &&
            (bFb.parameter === aFb.parameter || (!bFb.parameter && !aFb.parameter)));
        if (matchingBFb)
            reducedRtcpFeedback.push(matchingBFb);
    }
    return reducedRtcpFeedback;
}
exports.reduceRtcpFeedback = reduceRtcpFeedback;
//# sourceMappingURL=ortc.js.map