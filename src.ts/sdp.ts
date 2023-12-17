import sdpTransform from "sdp-transform";
import debug from "debug";
import { createLogger } from "./logger";
import { clone } from "./utils";
const APP_NAME = require('../package').name;
const logger = createLogger(APP_NAME);
export class MediaSection {
  public _mediaObject: any;
  public _planB: any;
  constructor({ iceParameters, iceCandidates, dtlsParameters, planB = false }) {
    this._mediaObject = {};
    this._planB = planB;
    if (iceParameters) {
      this.setIceParameters(iceParameters);
    }
    if (iceCandidates) {
      this._mediaObject.candidates = [];
      for (const candidate of iceCandidates) {
        const candidateObject: any = {};
        candidateObject.component = 1;
        candidateObject.foundation = candidate.foundation;
        candidateObject.ip = candidate.ip;
        candidateObject.port = candidate.port;
        candidateObject.priority = candidate.priority;
        candidateObject.transport = candidate.protocol;
        candidateObject.type = candidate.type;
        if (candidate.tcpType) candidateObject.tcptype = candidate.tcpType;
        this._mediaObject.candidates.push(candidateObject);
      }
      this._mediaObject.endOfCandidates = "end-of-candidates";
      this._mediaObject.iceOptions = "renomination";
    }
    if (dtlsParameters) {
      (this as any).setDtlsRole(dtlsParameters.role);
    }
  }
  get mid() {
    return String(this._mediaObject.mid);
  }
  get closed() {
    return this._mediaObject.port === 0;
  }
  getObject() {
    return this._mediaObject;
  }
  setIceParameters(iceParameters) {
    this._mediaObject.iceUfrag = iceParameters.usernameFragment;
    this._mediaObject.icePwd = iceParameters.password;
  }
  disable() {
    this._mediaObject.direction = "inactive";
    delete this._mediaObject.ext;
    delete this._mediaObject.ssrcs;
    delete this._mediaObject.ssrcGroups;
    delete this._mediaObject.simulcast;
    delete this._mediaObject.simulcast_03;
    delete this._mediaObject.rids;
  }
  close() {
    this._mediaObject.direction = "inactive";
    this._mediaObject.port = 0;
    delete this._mediaObject.ext;
    delete this._mediaObject.ssrcs;
    delete this._mediaObject.ssrcGroups;
    delete this._mediaObject.simulcast;
    delete this._mediaObject.simulcast_03;
    delete this._mediaObject.rids;
    delete this._mediaObject.extmapAllowMixed;
  }
}
export class AnswerMediaSection extends MediaSection {
  constructor({
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    plainRtpParameters,
    planB = false,
    offerMediaObject,
    offerRtpParameters,
    answerRtpParameters,
    codecOptions,
    extmapAllowMixed = false,
  }) {
    super({ iceParameters, iceCandidates, dtlsParameters, planB });
    this._mediaObject.mid = String(offerMediaObject.mid);
    this._mediaObject.type = offerMediaObject.type;
    this._mediaObject.protocol = offerMediaObject.protocol;
    if (!plainRtpParameters) {
      this._mediaObject.connection = { ip: "127.0.0.1", version: 4 };
      this._mediaObject.port = 7;
    } else {
      this._mediaObject.connection = {
        ip: plainRtpParameters.ip,
        version: plainRtpParameters.ipVersion,
      };
      this._mediaObject.port = plainRtpParameters.port;
    }
    switch (offerMediaObject.type) {
      case "audio":
      case "video": {
        this._mediaObject.direction = "recvonly";
        this._mediaObject.rtp = [];
        this._mediaObject.rtcpFb = [];
        this._mediaObject.fmtp = [];
        for (const codec of answerRtpParameters.codecs) {
          const rtp: any = {
            payload: codec.payloadType,
            codec: getCodecName(codec),
            rate: codec.clockRate,
          };
          if (codec.channels > 1) rtp.encoding = codec.channels;
          this._mediaObject.rtp.push(rtp);
          const codecParameters = clone(codec.parameters || {});
          if (codecOptions) {
            const {
              opusStereo,
              opusFec,
              opusDtx,
              opusMaxPlaybackRate,
              opusPtime,
              videoGoogleStartBitrate,
              videoGoogleMaxBitrate,
              videoGoogleMinBitrate,
            } = codecOptions;
            const offerCodec = offerRtpParameters.codecs.find(
              (c) => c.payloadType === codec.payloadType,
            );
            switch (codec.mimeType.toLowerCase()) {
              case "audio/opus": {
                if (opusStereo !== undefined) {
                  offerCodec.parameters["sprop-stereo"] = opusStereo ? 1 : 0;
                  codecParameters.stereo = opusStereo ? 1 : 0;
                }
                if (opusFec !== undefined) {
                  offerCodec.parameters.useinbandfec = opusFec ? 1 : 0;
                  codecParameters.useinbandfec = opusFec ? 1 : 0;
                }
                if (opusDtx !== undefined) {
                  offerCodec.parameters.usedtx = opusDtx ? 1 : 0;
                  codecParameters.usedtx = opusDtx ? 1 : 0;
                }
                if (opusMaxPlaybackRate !== undefined) {
                  codecParameters.maxplaybackrate = opusMaxPlaybackRate;
                }
                if (opusPtime !== undefined) {
                  offerCodec.parameters.ptime = opusPtime;
                  codecParameters.ptime = opusPtime;
                }
                break;
              }
              case "video/vp8":
              case "video/vp9":
              case "video/h264":
              case "video/h265": {
                if (videoGoogleStartBitrate !== undefined)
                  codecParameters["x-google-start-bitrate"] =
                    videoGoogleStartBitrate;
                if (videoGoogleMaxBitrate !== undefined)
                  codecParameters["x-google-max-bitrate"] =
                    videoGoogleMaxBitrate;
                if (videoGoogleMinBitrate !== undefined)
                  codecParameters["x-google-min-bitrate"] =
                    videoGoogleMinBitrate;
                break;
              }
            }
          }
          const fmtp = { payload: codec.payloadType, config: "" };
          for (const key of Object.keys(codecParameters)) {
            if (fmtp.config) fmtp.config += ";";
            fmtp.config += `${key}=${codecParameters[key]}`;
          }
          if (fmtp.config) this._mediaObject.fmtp.push(fmtp);
          for (const fb of codec.rtcpFeedback) {
            this._mediaObject.rtcpFb.push({
              payload: codec.payloadType,
              type: fb.type,
              subtype: fb.parameter,
            });
          }
        }
        this._mediaObject.payloads = answerRtpParameters.codecs
          .map((codec) => codec.payloadType)
          .join(" ");
        this._mediaObject.ext = [];
        for (const ext of answerRtpParameters.headerExtensions) {
          const found = (offerMediaObject.ext || []).some(
            (localExt) => localExt.uri === ext.uri,
          );
          if (!found) continue;
          this._mediaObject.ext.push({ uri: ext.uri, value: ext.id });
        }
        if (
          extmapAllowMixed &&
          offerMediaObject.extmapAllowMixed === "extmap-allow-mixed"
        ) {
          this._mediaObject.extmapAllowMixed = "extmap-allow-mixed";
        }
        if (offerMediaObject.simulcast) {
          this._mediaObject.simulcast = {
            dir1: "recv",
            list1: offerMediaObject.simulcast.list1,
          };
          this._mediaObject.rids = [];
          for (const rid of offerMediaObject.rids || []) {
            if (rid.direction !== "send") continue;
            this._mediaObject.rids.push({
              id: rid.id,
              direction: "recv",
            });
          }
        } else if (offerMediaObject.simulcast_03) {
          this._mediaObject.simulcast_03 = {
            value: offerMediaObject.simulcast_03.value.replace(/send/g, "recv"),
          };
          this._mediaObject.rids = [];
          for (const rid of offerMediaObject.rids || []) {
            if (rid.direction !== "send") continue;
            this._mediaObject.rids.push({
              id: rid.id,
              direction: "recv",
            });
          }
        }
        this._mediaObject.rtcpMux = "rtcp-mux";
        this._mediaObject.rtcpRsize = "rtcp-rsize";
        if (this._planB && this._mediaObject.type === "video")
          this._mediaObject.xGoogleFlag = "conference";
        break;
      }
      case "application": {
        if (typeof offerMediaObject.sctpPort === "number") {
          this._mediaObject.payloads = "webrtc-datachannel";
          this._mediaObject.sctpPort = sctpParameters.port;
          this._mediaObject.maxMessageSize = sctpParameters.maxMessageSize;
        } else if (offerMediaObject.sctpmap) {
          this._mediaObject.payloads = sctpParameters.port;
          this._mediaObject.sctpmap = {
            app: "webrtc-datachannel",
            sctpmapNumber: sctpParameters.port,
            maxMessageSize: sctpParameters.maxMessageSize,
          };
        }
        break;
      }
    }
  }
  setDtlsRole(role) {
    switch (role) {
      case "client":
        this._mediaObject.setup = "active";
        break;
      case "server":
        this._mediaObject.setup = "passive";
        break;
      case "auto":
        this._mediaObject.setup = "actpass";
        break;
    }
  }
}
export class OfferMediaSection extends MediaSection {
  public _planB: any;
  public _mediaObject: any;
  constructor({
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    plainRtpParameters,
    planB = false,
    mid,
    kind,
    offerRtpParameters,
    streamId,
    trackId,
    oldDataChannelSpec = false,
  }) {
    super({ iceParameters, iceCandidates, dtlsParameters, planB });
    this._mediaObject.mid = String(mid);
    this._mediaObject.type = kind;
    if (!plainRtpParameters) {
      this._mediaObject.connection = { ip: "127.0.0.1", version: 4 };
      if (!sctpParameters) this._mediaObject.protocol = "UDP/TLS/RTP/SAVPF";
      else this._mediaObject.protocol = "UDP/DTLS/SCTP";
      this._mediaObject.port = 7;
    } else {
      this._mediaObject.connection = {
        ip: plainRtpParameters.ip,
        version: plainRtpParameters.ipVersion,
      };
      this._mediaObject.protocol = "RTP/AVP";
      this._mediaObject.port = plainRtpParameters.port;
    }
    switch (kind) {
      case "audio":
      case "video": {
        this._mediaObject.direction = "sendonly";
        this._mediaObject.rtp = [];
        this._mediaObject.rtcpFb = [];
        this._mediaObject.fmtp = [];
        if (!this._planB)
          this._mediaObject.msid = `${streamId || "-"} ${trackId}`;
        for (const codec of offerRtpParameters.codecs) {
          const rtp: any = {
            payload: codec.payloadType,
            codec: getCodecName(codec),
            rate: codec.clockRate,
          };
          if (codec.channels > 1) rtp.encoding = codec.channels;
          this._mediaObject.rtp.push(rtp);
          const fmtp = { payload: codec.payloadType, config: "" };
          for (const key of Object.keys(codec.parameters)) {
            if (fmtp.config) fmtp.config += ";";
            fmtp.config += `${key}=${codec.parameters[key]}`;
          }
          if (fmtp.config) this._mediaObject.fmtp.push(fmtp);
          for (const fb of codec.rtcpFeedback) {
            this._mediaObject.rtcpFb.push({
              payload: codec.payloadType,
              type: fb.type,
              subtype: fb.parameter,
            });
          }
        }
        this._mediaObject.payloads = offerRtpParameters.codecs
          .map((codec) => codec.payloadType)
          .join(" ");
        this._mediaObject.ext = [];
        for (const ext of offerRtpParameters.headerExtensions) {
          this._mediaObject.ext.push({ uri: ext.uri, value: ext.id });
        }
        this._mediaObject.rtcpMux = "rtcp-mux";
        this._mediaObject.rtcpRsize = "rtcp-rsize";
        const encoding = offerRtpParameters.encodings[0];
        const ssrc = encoding.ssrc;
        const rtxSsrc =
          encoding.rtx && encoding.rtx.ssrc ? encoding.rtx.ssrc : undefined;
        this._mediaObject.ssrcs = [];
        this._mediaObject.ssrcGroups = [];
        if (offerRtpParameters.rtcp.cname) {
          this._mediaObject.ssrcs.push({
            id: ssrc,
            attribute: "cname",
            value: offerRtpParameters.rtcp.cname,
          });
        }
        if (this._planB) {
          this._mediaObject.ssrcs.push({
            id: ssrc,
            attribute: "msid",
            value: `${streamId || "-"} ${trackId}`,
          });
        }
        if (rtxSsrc) {
          if (offerRtpParameters.rtcp.cname) {
            this._mediaObject.ssrcs.push({
              id: rtxSsrc,
              attribute: "cname",
              value: offerRtpParameters.rtcp.cname,
            });
          }
          if (this._planB) {
            this._mediaObject.ssrcs.push({
              id: rtxSsrc,
              attribute: "msid",
              value: `${streamId || "-"} ${trackId}`,
            });
          }
          this._mediaObject.ssrcGroups.push({
            semantics: "FID",
            ssrcs: `${ssrc} ${rtxSsrc}`,
          });
        }
        break;
      }
      case "application": {
        if (!oldDataChannelSpec) {
          this._mediaObject.payloads = "webrtc-datachannel";
          this._mediaObject.sctpPort = sctpParameters.port;
          this._mediaObject.maxMessageSize = sctpParameters.maxMessageSize;
        } else {
          this._mediaObject.payloads = sctpParameters.port;
          this._mediaObject.sctpmap = {
            app: "webrtc-datachannel",
            sctpmapNumber: sctpParameters.port,
            maxMessageSize: sctpParameters.maxMessageSize,
          };
        }
        break;
      }
    }
  }
  setDtlsRole(role) {
    this._mediaObject.setup = "actpass";
  }
  planBReceive({ offerRtpParameters, streamId, trackId }) {
    const encoding = offerRtpParameters.encodings[0];
    const ssrc = encoding.ssrc;
    const rtxSsrc =
      encoding.rtx && encoding.rtx.ssrc ? encoding.rtx.ssrc : undefined;
    if (offerRtpParameters.rtcp.cname) {
      this._mediaObject.ssrcs.push({
        id: ssrc,
        attribute: "cname",
        value: offerRtpParameters.rtcp.cname,
      });
    }
    this._mediaObject.ssrcs.push({
      id: ssrc,
      attribute: "msid",
      value: `${streamId || "-"} ${trackId}`,
    });
    if (rtxSsrc) {
      if (offerRtpParameters.rtcp.cname) {
        this._mediaObject.ssrcs.push({
          id: rtxSsrc,
          attribute: "cname",
          value: offerRtpParameters.rtcp.cname,
        });
      }
      this._mediaObject.ssrcs.push({
        id: rtxSsrc,
        attribute: "msid",
        value: `${streamId || "-"} ${trackId}`,
      });
      this._mediaObject.ssrcGroups.push({
        semantics: "FID",
        ssrcs: `${ssrc} ${rtxSsrc}`,
      });
    }
  }
  planBStopReceiving({ offerRtpParameters }) {
    const encoding = offerRtpParameters.encodings[0];
    const ssrc = encoding.ssrc;
    const rtxSsrc =
      encoding.rtx && encoding.rtx.ssrc ? encoding.rtx.ssrc : undefined;
    this._mediaObject.ssrcs = this._mediaObject.ssrcs.filter(
      (s) => s.id !== ssrc && s.id !== rtxSsrc,
    );
    if (rtxSsrc) {
      this._mediaObject.ssrcGroups = this._mediaObject.ssrcGroups.filter(
        (group) => group.ssrcs !== `${ssrc} ${rtxSsrc}`,
      );
    }
  }
}
export function getCodecName(codec) {
  const MimeTypeRegex = new RegExp("^(audio|video)/(.+)", "i");
  const mimeTypeMatch = MimeTypeRegex.exec(codec.mimeType);
  if (!mimeTypeMatch) throw new TypeError("invalid codec.mimeType");
  return mimeTypeMatch[2];
}
export class RemoteSdp {
  public _planB: any;
  public _plainRtpParameters: any;
  public _iceCandidates: any;
  public _iceParameters: any;
  public _sctpParameters: any;
  public _firstMid: any;
  public _dtlsParameters: any;
  public _midToIndex: any;
  public _sdpObject: any;
  public _mediaSections: any;
  constructor({
    iceParameters,
    iceCandidates,
    dtlsParameters,
    sctpParameters,
    plainRtpParameters,
    planB = false,
  }) {
    this._mediaSections = [];
    this._midToIndex = new Map();
    this._iceParameters = iceParameters;
    this._iceCandidates = iceCandidates;
    this._dtlsParameters = dtlsParameters;
    this._sctpParameters = sctpParameters;
    this._plainRtpParameters = plainRtpParameters;
    this._planB = planB;
    this._sdpObject = {
      version: 0,
      origin: {
        address: "0.0.0.0",
        ipVer: 4,
        netType: "IN",
        sessionId: 10000,
        sessionVersion: 0,
        username: "stumblechat-client",
      },
      name: "-",
      timing: { start: 0, stop: 0 },
      media: [],
    };
    if (iceParameters && iceParameters.iceLite) {
      this._sdpObject.icelite = "ice-lite";
    }
    if (dtlsParameters) {
      this._sdpObject.msidSemantic = { semantic: "WMS", token: "*" };
      const numFingerprints = this._dtlsParameters.fingerprints.length;
      this._sdpObject.fingerprint = {
        type: dtlsParameters.fingerprints[numFingerprints - 1].algorithm,
        hash: dtlsParameters.fingerprints[numFingerprints - 1].value,
      };
      this._sdpObject.groups = [{ type: "BUNDLE", mids: "" }];
    }
    if (plainRtpParameters) {
      this._sdpObject.origin.address = plainRtpParameters.ip;
      this._sdpObject.origin.ipVer = plainRtpParameters.ipVersion;
    }
  }
  updateIceParameters(iceParameters) {
    logger.debug("updateIceParameters() [iceParameters:%o]", iceParameters);
    this._iceParameters = iceParameters;
    this._sdpObject.icelite = iceParameters.iceLite ? "ice-lite" : undefined;
    for (const mediaSection of this._mediaSections) {
      mediaSection.setIceParameters(iceParameters);
    }
  }
  updateDtlsRole(role) {
    logger.debug("updateDtlsRole() [role:%s]", role);
    this._dtlsParameters.role = role;
    for (const mediaSection of this._mediaSections) {
      mediaSection.setDtlsRole(role);
    }
  }
  getNextMediaSectionIdx() {
    for (let idx = 0; idx < this._mediaSections.length; ++idx) {
      const mediaSection = this._mediaSections[idx];
      if (mediaSection.closed) return { idx, reuseMid: mediaSection.mid };
    }
    return { idx: this._mediaSections.length };
  }
  send({
    offerMediaObject,
    reuseMid,
    offerRtpParameters,
    answerRtpParameters,
    codecOptions,
    extmapAllowMixed = false,
  }) {
    const mediaSection = new AnswerMediaSection({
      iceParameters: this._iceParameters,
      iceCandidates: this._iceCandidates,
      dtlsParameters: this._dtlsParameters,
      plainRtpParameters: this._plainRtpParameters,
      planB: this._planB,
      offerMediaObject,
      offerRtpParameters,
      answerRtpParameters,
      codecOptions,
      extmapAllowMixed,
    } as any);
    if (reuseMid) {
      this._replaceMediaSection(mediaSection, reuseMid);
    } else if (!this._midToIndex.has(mediaSection.mid)) {
      this._addMediaSection(mediaSection);
    } else {
      this._replaceMediaSection(mediaSection);
    }
  }
  receive({ mid, kind, offerRtpParameters, streamId, trackId }) {
    const idx = this._midToIndex.get(mid);
    let mediaSection;
    if (idx !== undefined) mediaSection = this._mediaSections[idx];
    if (!mediaSection) {
      mediaSection = new OfferMediaSection({
        iceParameters: this._iceParameters,
        iceCandidates: this._iceCandidates,
        dtlsParameters: this._dtlsParameters,
        plainRtpParameters: this._plainRtpParameters,
        planB: this._planB,
        mid,
        kind,
        offerRtpParameters,
        streamId,
        trackId,
      } as any);
      this._addMediaSection(mediaSection);
    } else {
      mediaSection.planBReceive({
        offerRtpParameters,
        streamId,
        trackId,
      });
      this._replaceMediaSection(mediaSection);
    }
  }
  disableMediaSection(mid) {
    const idx = this._midToIndex.get(mid);
    if (idx === undefined) {
      throw new Error(`no media section found with mid '${mid}'`);
    }
    const mediaSection = this._mediaSections[idx];
    mediaSection.disable();
  }
  closeMediaSection(mid) {
    const idx = this._midToIndex.get(mid);
    if (idx === undefined) {
      throw new Error(`no media section found with mid '${mid}'`);
    }
    const mediaSection = this._mediaSections[idx];
    if (mid === this._firstMid) {
      logger.debug(
        "closeMediaSection() | cannot close first media section, disabling it instead [mid:%s]",
        mid,
      );
      this.disableMediaSection(mid);
      return;
    }
    mediaSection.close();
    this._regenerateBundleMids();
  }
  planBStopReceiving({ mid, offerRtpParameters }) {
    const idx = this._midToIndex.get(mid);
    if (idx === undefined) {
      throw new Error(`no media section found with mid '${mid}'`);
    }
    const mediaSection = this._mediaSections[idx];
    mediaSection.planBStopReceiving({ offerRtpParameters });
    this._replaceMediaSection(mediaSection);
  }
  sendSctpAssociation({ offerMediaObject }) {
    const mediaSection = new AnswerMediaSection({
      iceParameters: this._iceParameters,
      iceCandidates: this._iceCandidates,
      dtlsParameters: this._dtlsParameters,
      sctpParameters: this._sctpParameters,
      plainRtpParameters: this._plainRtpParameters,
      offerMediaObject,
    } as any);
    this._addMediaSection(mediaSection);
  }
  receiveSctpAssociation({ oldDataChannelSpec = false } = {}) {
    const mediaSection = new OfferMediaSection({
      iceParameters: this._iceParameters,
      iceCandidates: this._iceCandidates,
      dtlsParameters: this._dtlsParameters,
      sctpParameters: this._sctpParameters,
      plainRtpParameters: this._plainRtpParameters,
      mid: "datachannel",
      kind: "application",
      oldDataChannelSpec,
    } as any);
    this._addMediaSection(mediaSection);
  }
  getSdp() {
    this._sdpObject.origin.sessionVersion++;
    return sdpTransform.write(this._sdpObject);
  }
  _addMediaSection(newMediaSection) {
    if (!this._firstMid) this._firstMid = newMediaSection.mid;
    this._mediaSections.push(newMediaSection);
    this._midToIndex.set(newMediaSection.mid, this._mediaSections.length - 1);
    this._sdpObject.media.push(newMediaSection.getObject());
    this._regenerateBundleMids();
  }
  _replaceMediaSection(newMediaSection, reuseMid?) {
    if (typeof reuseMid === "string") {
      const idx = this._midToIndex.get(reuseMid);
      if (idx === undefined) {
        throw new Error(`no media section found for reuseMid '${reuseMid}'`);
      }
      const oldMediaSection = this._mediaSections[idx];
      this._mediaSections[idx] = newMediaSection;
      this._midToIndex.delete(oldMediaSection.mid);
      this._midToIndex.set(newMediaSection.mid, idx);
      this._sdpObject.media[idx] = newMediaSection.getObject();
      this._regenerateBundleMids();
    } else {
      const idx = this._midToIndex.get(newMediaSection.mid);
      if (idx === undefined) {
        throw new Error(
          `no media section found with mid '${newMediaSection.mid}'`,
        );
      }
      this._mediaSections[idx] = newMediaSection;
      this._sdpObject.media[idx] = newMediaSection.getObject();
    }
  }
  _regenerateBundleMids() {
    if (!this._dtlsParameters) return;
    this._sdpObject.groups[0].mids = this._mediaSections
      .filter((mediaSection) => !mediaSection.closed)
      .map((mediaSection) => mediaSection.mid)
      .join(" ");
  }
}
