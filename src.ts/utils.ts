import sdpTransform from "sdp-transform";
export function clone(data) {
  if (typeof data !== "object") return {};
  return JSON.parse(JSON.stringify(data));
}
export function generateRandomNumber() {
  return Math.round(Math.random() * 10000000);
}
export function extractRtpCapabilities({ sdpObject }) {
  const codecsMap = new Map();
  const headerExtensions = [];
  let gotAudio = false;
  let gotVideo = false;
  for (const m of sdpObject.media) {
    const kind = m.type;
    switch (kind) {
      case "audio": {
        if (gotAudio) continue;
        gotAudio = true;
        break;
      }
      case "video": {
        if (gotVideo) continue;
        gotVideo = true;
        break;
      }
      default: {
        continue;
      }
    }
    for (const rtp of m.rtp) {
      const codec = {
        kind: kind,
        mimeType: `${kind}/${rtp.codec}`,
        preferredPayloadType: rtp.payload,
        clockRate: rtp.rate,
        channels: rtp.encoding,
        parameters: {},
        rtcpFeedback: [],
      };
      codecsMap.set(codec.preferredPayloadType, codec);
    }
    for (const fmtp of m.fmtp || []) {
      const parameters = sdpTransform.parseParams(fmtp.config);
      const codec = codecsMap.get(fmtp.payload);
      if (!codec) continue;
      if (parameters && parameters["profile-level-id"])
        parameters["profile-level-id"] = String(parameters["profile-level-id"]);
      codec.parameters = parameters;
    }
    for (const fb of m.rtcpFb || []) {
      const codec = codecsMap.get(fb.payload);
      if (!codec) continue;
      const feedback = {
        type: fb.type,
        parameter: fb.subtype,
      };
      if (!feedback.parameter) delete feedback.parameter;
      codec.rtcpFeedback.push(feedback);
    }
    for (const ext of m.ext || []) {
      if (ext["encrypt-uri"]) continue;
      const headerExtension = {
        kind: kind,
        uri: ext.uri,
        preferredId: ext.value,
      };
      headerExtensions.push(headerExtension);
    }
  }
  const rtpCapabilities = {
    codecs: Array.from(codecsMap.values()),
    headerExtensions: headerExtensions,
  };
  return rtpCapabilities;
}
export function extractDtlsParameters({ sdpObject }) {
  const mediaObject = (sdpObject.media || []).find(
    (m) => m.iceUfrag && m.port !== 0,
  );
  if (!mediaObject) throw new Error("no active media section found");
  const fingerprint = mediaObject.fingerprint || sdpObject.fingerprint;
  let role;
  switch (mediaObject.setup) {
    case "active":
      role = "client";
      break;
    case "passive":
      role = "server";
      break;
    case "actpass":
      role = "auto";
      break;
  }
  const dtlsParameters = {
    role,
    fingerprints: [
      {
        algorithm: fingerprint.type,
        value: fingerprint.hash,
      },
    ],
  };
  return dtlsParameters;
}
export function getCname({ offerMediaObject }) {
  const ssrcCnameLine = (offerMediaObject.ssrcs || []).find(
    (line) => line.attribute === "cname",
  );
  if (!ssrcCnameLine) return "";
  return ssrcCnameLine.value;
}
export function applyCodecParameters({
  offerRtpParameters,
  answerMediaObject,
}) {
  for (const codec of offerRtpParameters.codecs) {
    const mimeType = codec.mimeType.toLowerCase();
    if (mimeType !== "audio/opus") continue;
    const rtp = (answerMediaObject.rtp || []).find(
      (r) => r.payload === codec.payloadType,
    );
    if (!rtp) continue;
    answerMediaObject.fmtp = answerMediaObject.fmtp || [];
    let fmtp = answerMediaObject.fmtp.find(
      (f) => f.payload === codec.payloadType,
    );
    if (!fmtp) {
      fmtp = {
        payload: codec.payloadType,
        config: "",
      };
      answerMediaObject.fmtp.push(fmtp);
    }
    const parameters = sdpTransform.parseParams(fmtp.config);
    switch (mimeType) {
      case "audio/opus": {
        const spropStereo = codec.parameters["sprop-stereo"];
        if (spropStereo !== undefined) parameters.stereo = spropStereo ? 1 : 0;
        break;
      }
    }
    fmtp.config = "";
    for (const key of Object.keys(parameters)) {
      if (fmtp.config) fmtp.config += ";";
      fmtp.config += `${key}=${parameters[key]}`;
    }
  }
}
export function getRtpEncodings({ offerMediaObject, track }) {
  let firstSsrc;
  const ssrcs = new Set();
  for (const line of offerMediaObject.ssrcs || []) {
    if (line.attribute !== "msid") continue;
    const trackId = line.value.split(" ")[1];
    if (trackId === track.id) {
      const ssrc = line.id;
      ssrcs.add(ssrc);
      if (!firstSsrc) firstSsrc = ssrc;
    }
  }
  if (ssrcs.size === 0)
    throw new Error(
      `a=ssrc line with msid information not found [track.id:${track.id}]`,
    );
  const ssrcToRtxSsrc = new Map();
  for (const line of offerMediaObject.ssrcGroups || []) {
    if (line.semantics !== "FID") continue;
    let [ssrc, rtxSsrc] = line.ssrcs.split(/\s+/);
    ssrc = Number(ssrc);
    rtxSsrc = Number(rtxSsrc);
    if (ssrcs.has(ssrc)) {
      ssrcs.delete(ssrc);
      ssrcs.delete(rtxSsrc);
      ssrcToRtxSsrc.set(ssrc, rtxSsrc);
    }
  }
  for (const ssrc of ssrcs) {
    ssrcToRtxSsrc.set(ssrc, null);
  }
  const encodings = [];
  for (const [ssrc, rtxSsrc] of ssrcToRtxSsrc) {
    const encoding: any = {
      ssrc,
    };
    if (rtxSsrc)
      encoding.rtx = {
        ssrc: rtxSsrc,
      };
    encodings.push(encoding);
  }
  return encodings;
}
export function addLegacySimulcast({ offerMediaObject, track, numStreams }) {
  if (numStreams <= 1) throw new TypeError("numStreams must be greater than 1");
  let firstSsrc;
  let firstRtxSsrc;
  let streamId;
  const ssrcMsidLine = (offerMediaObject.ssrcs || []).find((line) => {
    if (line.attribute !== "msid") return false;
    const trackId = line.value.split(" ")[1];
    if (trackId === track.id) {
      firstSsrc = line.id;
      streamId = line.value.split(" ")[0];
      return true;
    } else {
      return false;
    }
  });
  if (!ssrcMsidLine)
    throw new Error(
      `a=ssrc line with msid information not found [track.id:${track.id}]`,
    );
  (offerMediaObject.ssrcGroups || []).some((line) => {
    if (line.semantics !== "FID") return false;
    const ssrcs = line.ssrcs.split(/\s+/);
    if (Number(ssrcs[0]) === firstSsrc) {
      firstRtxSsrc = Number(ssrcs[1]);
      return true;
    } else {
      return false;
    }
  });
  const ssrcCnameLine = offerMediaObject.ssrcs.find(
    (line) => line.attribute === "cname" && line.id === firstSsrc,
  );
  if (!ssrcCnameLine)
    throw new Error(
      `a=ssrc line with cname information not found [track.id:${track.id}]`,
    );
  const cname = ssrcCnameLine.value;
  const ssrcs = [];
  const rtxSsrcs = [];
  for (let i = 0; i < numStreams; ++i) {
    ssrcs.push(firstSsrc + i);
    if (firstRtxSsrc) rtxSsrcs.push(firstRtxSsrc + i);
  }
  offerMediaObject.ssrcGroups = offerMediaObject.ssrcGroups || [];
  offerMediaObject.ssrcs = offerMediaObject.ssrcs || [];
  offerMediaObject.ssrcGroups.push({
    semantics: "SIM",
    ssrcs: ssrcs.join(" "),
  });
  for (let i = 0; i < ssrcs.length; ++i) {
    const ssrc = ssrcs[i];
    offerMediaObject.ssrcs.push({
      id: ssrc,
      attribute: "cname",
      value: cname,
    });
    offerMediaObject.ssrcs.push({
      id: ssrc,
      attribute: "msid",
      value: `${streamId} ${track.id}`,
    });
  }
  for (let i = 0; i < rtxSsrcs.length; ++i) {
    const ssrc = ssrcs[i];
    const rtxSsrc = rtxSsrcs[i];
    offerMediaObject.ssrcs.push({
      id: rtxSsrc,
      attribute: "cname",
      value: cname,
    });
    offerMediaObject.ssrcs.push({
      id: rtxSsrc,
      attribute: "msid",
      value: `${streamId} ${track.id}`,
    });
    offerMediaObject.ssrcGroups.push({
      semantics: "FID",
      ssrcs: `${ssrc} ${rtxSsrc}`,
    });
  }
}
