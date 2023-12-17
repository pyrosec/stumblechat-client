export declare const RTP_PROBATOR_MID = "probator";
export declare const RTP_PROBATOR_SSRC = 1234;
export declare const RTP_PROBATOR_CODEC_PAYLOAD_TYPE = 127;
export declare function validateRtpCapabilities(caps: any): void;
export declare function validateRtpCodecCapability(codec: any): void;
export declare function validateRtcpFeedback(fb: any): void;
export declare function validateRtpHeaderExtension(ext: any): void;
export declare function validateRtpParameters(params: any): void;
export declare function validateRtpCodecParameters(codec: any): void;
export declare function validateRtpHeaderExtensionParameters(ext: any): void;
export declare function validateRtpEncodingParameters(encoding: any): void;
export declare function validateRtcpParameters(rtcp: any): void;
export declare function validateSctpCapabilities(caps: any): void;
export declare function validateNumSctpStreams(numStreams: any): void;
export declare function validateSctpParameters(params: any): void;
export declare function validateSctpStreamParameters(params: any): void;
export declare function getExtendedRtpCapabilities(localCaps: any, remoteCaps: any): {
    codecs: any[];
    headerExtensions: any[];
};
export declare function getRecvRtpCapabilities(extendedRtpCapabilities: any): {
    codecs: any[];
    headerExtensions: any[];
};
export declare function getSendingRtpParameters(kind: any, extendedRtpCapabilities: any): {
    mid: any;
    codecs: any[];
    headerExtensions: any[];
    encodings: any[];
    rtcp: {};
};
export declare function getSendingRemoteRtpParameters(kind: any, extendedRtpCapabilities: any): {
    mid: any;
    codecs: any[];
    headerExtensions: any[];
    encodings: any[];
    rtcp: {};
};
export declare function reduceCodecs(codecs: any, capCodec?: any): any[];
export declare function generateProbatorRtpParameters(videoRtpParameters: any): {
    mid: string;
    codecs: any[];
    headerExtensions: any[];
    encodings: {
        ssrc: number;
    }[];
    rtcp: {
        cname: string;
    };
};
export declare function canSend(kind: any, extendedRtpCapabilities: any): any;
export declare function canReceive(rtpParameters: any, extendedRtpCapabilities: any): any;
export declare function isRtxCodec(codec: any): boolean;
export declare function matchCodecs(aCodec: any, bCodec: any, { strict, modify }?: {
    strict?: boolean;
    modify?: boolean;
}): boolean;
export declare function matchHeaderExtensions(aExt: any, bExt: any): boolean;
export declare function reduceRtcpFeedback(codecA: any, codecB: any): any[];
