export declare class MediaSection {
    _mediaObject: any;
    _planB: any;
    constructor({ iceParameters, iceCandidates, dtlsParameters, planB }: {
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        planB?: boolean;
    });
    get mid(): string;
    get closed(): boolean;
    getObject(): any;
    setIceParameters(iceParameters: any): void;
    disable(): void;
    close(): void;
}
export declare class AnswerMediaSection extends MediaSection {
    constructor({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, plainRtpParameters, planB, offerMediaObject, offerRtpParameters, answerRtpParameters, codecOptions, extmapAllowMixed, }: {
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        plainRtpParameters: any;
        planB?: boolean;
        offerMediaObject: any;
        offerRtpParameters: any;
        answerRtpParameters: any;
        codecOptions: any;
        extmapAllowMixed?: boolean;
    });
    setDtlsRole(role: any): void;
}
export declare class OfferMediaSection extends MediaSection {
    _planB: any;
    _mediaObject: any;
    constructor({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, plainRtpParameters, planB, mid, kind, offerRtpParameters, streamId, trackId, oldDataChannelSpec, }: {
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        plainRtpParameters: any;
        planB?: boolean;
        mid: any;
        kind: any;
        offerRtpParameters: any;
        streamId: any;
        trackId: any;
        oldDataChannelSpec?: boolean;
    });
    setDtlsRole(role: any): void;
    planBReceive({ offerRtpParameters, streamId, trackId }: {
        offerRtpParameters: any;
        streamId: any;
        trackId: any;
    }): void;
    planBStopReceiving({ offerRtpParameters }: {
        offerRtpParameters: any;
    }): void;
}
export declare function getCodecName(codec: any): string;
export declare class RemoteSdp {
    _planB: any;
    _plainRtpParameters: any;
    _iceCandidates: any;
    _iceParameters: any;
    _sctpParameters: any;
    _firstMid: any;
    _dtlsParameters: any;
    _midToIndex: any;
    _sdpObject: any;
    _mediaSections: any;
    constructor({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, plainRtpParameters, planB, }: {
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        plainRtpParameters: any;
        planB?: boolean;
    });
    updateIceParameters(iceParameters: any): void;
    updateDtlsRole(role: any): void;
    getNextMediaSectionIdx(): {
        idx: number;
        reuseMid: any;
    } | {
        idx: any;
        reuseMid?: undefined;
    };
    send({ offerMediaObject, reuseMid, offerRtpParameters, answerRtpParameters, codecOptions, extmapAllowMixed, }: {
        offerMediaObject: any;
        reuseMid: any;
        offerRtpParameters: any;
        answerRtpParameters: any;
        codecOptions: any;
        extmapAllowMixed?: boolean;
    }): void;
    receive({ mid, kind, offerRtpParameters, streamId, trackId }: {
        mid: any;
        kind: any;
        offerRtpParameters: any;
        streamId: any;
        trackId: any;
    }): void;
    disableMediaSection(mid: any): void;
    closeMediaSection(mid: any): void;
    planBStopReceiving({ mid, offerRtpParameters }: {
        mid: any;
        offerRtpParameters: any;
    }): void;
    sendSctpAssociation({ offerMediaObject }: {
        offerMediaObject: any;
    }): void;
    receiveSctpAssociation({ oldDataChannelSpec }?: {
        oldDataChannelSpec?: boolean;
    }): void;
    getSdp(): any;
    _addMediaSection(newMediaSection: any): void;
    _replaceMediaSection(newMediaSection: any, reuseMid?: any): void;
    _regenerateBundleMids(): void;
}
