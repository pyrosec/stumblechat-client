import { EnhancedEventEmitter } from "./events";
declare class HandlerInterface extends EnhancedEventEmitter {
    constructor();
}
export declare class NodeHandler extends HandlerInterface {
    _sendingRtpParametersByKind: any;
    _direction: any;
    _transportReady: any;
    _remoteSdp: any;
    _pc: any;
    _hadDataChannelMediaSection: any;
    _mapRecvLocalIdInfo: any;
    _hasDataChannelMediaSection: any;
    _nextSendSctpStreamId: number;
    _sendStream: any;
    _mapSendLocalIdTrack: any;
    _nextSendLocalId: any;
    _sendingRemoteRtpParametersByKind: any;
    constructor();
    static createFactory(): () => NodeHandler;
    get name(): string;
    close(): void;
    getNativeRtpCapabilities(): Promise<{
        codecs: any[];
        headerExtensions: any[];
    }>;
    getNativeSctpCapabilities(): Promise<{
        numStreams: {
            OS: number;
            MIS: number;
        };
    }>;
    run({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, extendedRtpCapabilities, }: {
        direction: any;
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        iceServers: any;
        iceTransportPolicy: any;
        additionalSettings: any;
        proprietaryConstraints: any;
        extendedRtpCapabilities: any;
    }): void;
    updateIceServers(iceServers: any): Promise<void>;
    restartIce(iceParameters: any): Promise<void>;
    getTransportStats(): Promise<any>;
    send({ track, encodings, codecOptions, codec }: {
        track: any;
        encodings: any;
        codecOptions: any;
        codec: any;
    }): Promise<{
        localId: string;
        rtpParameters: any;
    }>;
    stopSending(localId: any): Promise<void>;
    replaceTrack(localId: any, track: any): Promise<void>;
    setMaxSpatialLayer(localId: any, spatialLayer: any): Promise<void>;
    setRtpEncodingParameters(localId: any, params: any): Promise<void>;
    getSenderStats(localId: any): Promise<void>;
    sendDataChannel({ ordered, maxPacketLifeTime, maxRetransmits, label, protocol, priority, }: {
        ordered: any;
        maxPacketLifeTime: any;
        maxRetransmits: any;
        label: any;
        protocol: any;
        priority: any;
    }): Promise<{
        dataChannel: any;
        sctpStreamParameters: {
            streamId: number;
            ordered: any;
            maxPacketLifeTime: any;
            maxRetransmits: any;
        };
    }>;
    receive({ trackId, kind, rtpParameters }: {
        trackId: any;
        kind: any;
        rtpParameters: any;
    }): Promise<{
        localId: any;
        track: any;
    }>;
    stopReceiving(localId: any): Promise<void>;
    getReceiverStats(localId: any): Promise<void>;
    receiveDataChannel({ sctpStreamParameters, label, protocol }: {
        sctpStreamParameters: any;
        label: any;
        protocol: any;
    }): Promise<{
        dataChannel: any;
    }>;
    _setupTransport({ localDtlsRole, localSdpObject }: {
        localDtlsRole: any;
        localSdpObject: any;
    }): Promise<void>;
    _assertSendDirection(): void;
    _assertRecvDirection(): void;
}
export {};
