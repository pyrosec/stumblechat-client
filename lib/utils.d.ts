export declare function clone(data: any): any;
export declare function generateRandomNumber(): number;
export declare function extractRtpCapabilities({ sdpObject }: {
    sdpObject: any;
}): {
    codecs: any[];
    headerExtensions: any[];
};
export declare function extractDtlsParameters({ sdpObject }: {
    sdpObject: any;
}): {
    role: any;
    fingerprints: {
        algorithm: any;
        value: any;
    }[];
};
export declare function getCname({ offerMediaObject }: {
    offerMediaObject: any;
}): any;
export declare function applyCodecParameters({ offerRtpParameters, answerMediaObject, }: {
    offerRtpParameters: any;
    answerMediaObject: any;
}): void;
export declare function getRtpEncodings({ offerMediaObject, track }: {
    offerMediaObject: any;
    track: any;
}): any[];
export declare function addLegacySimulcast({ offerMediaObject, track, numStreams }: {
    offerMediaObject: any;
    track: any;
    numStreams: any;
}): void;
