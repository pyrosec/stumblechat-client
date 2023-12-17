import { Transport } from "./transport";
export declare function detectDevice(): string;
export declare class Device {
    _loaded: any;
    _recvRtpCapabilities: any;
    _canProduceByKind: any;
    _sctpCapabilities: any;
    _handlerName: any;
    _extendedRtpCapabilities: any;
    _handlerFactory: any;
    constructor({ handlerName, handlerFactory, Handler }?: any);
    get handlerName(): any;
    get loaded(): any;
    get rtpCapabilities(): any;
    get sctpCapabilities(): any;
    load({ routerRtpCapabilities }: {
        routerRtpCapabilities: any;
    }): Promise<void>;
    canProduce(kind: any): any;
    createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, appData, }: {
        id: any;
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        iceServers: any;
        iceTransportPolicy: any;
        additionalSettings: any;
        proprietaryConstraints: any;
        appData?: {};
    }): Transport;
    createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, appData, }: {
        id: any;
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        iceServers: any;
        iceTransportPolicy: any;
        additionalSettings: any;
        proprietaryConstraints: any;
        appData?: {};
    }): Transport;
    _createTransport({ direction, id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, proprietaryConstraints, appData, }: {
        direction: any;
        id: any;
        iceParameters: any;
        iceCandidates: any;
        dtlsParameters: any;
        sctpParameters: any;
        iceServers: any;
        iceTransportPolicy: any;
        additionalSettings: any;
        proprietaryConstraints: any;
        appData?: {};
    }): Transport;
}
