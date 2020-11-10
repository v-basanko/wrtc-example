'use strict';

const RTCPeerConnection = require('wrtc').RTCPeerConnection;
const recorder = require('./recorder');
const Connection = require('./connection');

const TIME_TO_CONNECTED = 10000;
const TIME_TO_HOST_CANDIDATES = 3000; 
const TIME_TO_RECONNECTED = 10000;

class WebRtcConnection extends Connection {

    get iceConnectionState() {
        return this.peerConnection.iceConnectionState;
    }

    get localDescription() {
        return this.descriptionToJSON(this.peerConnection.localDescription, true);       
    }

    get remoteDescription() {
        return this.descriptionToJSON(this.peerConnection.remoteDescription);
    }
        
    get signalingState() {
        return this.peerConnection.signalingState;   
    }

    constructor(id) {
        super(id);
        this.peerConnection = new RTCPeerConnection({
            sdpSemantics: "unified-plan",
            iceServers: [{
                'urls': 'stun:stun.l.google.com:19302',
                'urls': 'stun:stun.l.google.com:19302',
                'urls': 'stun:stun1.l.google.com:19302',
                'urls': 'stun:stun2.l.google.com:19302',
                'urls': 'stun:stun3.l.google.com:19302',
                'urls': 'stun:stun4.l.google.com:19302'
            }]
        });
        


        recorder(this.peerConnection);
        this.connectionTimer = setTimeout(() => {
            if (this.peerConnection.iceConnectionState !== 'connected'
              && this.peerConnection.iceConnectionState !== 'completed') {
                this.close();
            }
        }, TIME_TO_CONNECTED);

        this.reconnectionTimer = null;
        this.peerConnection.addEventListener('error',(err)=>{console.log('ERR PC: ', err)});
        this.peerConnection.addEventListener('iceconnectionstatechange',()=>this.onIceConnectionStateChange());
    }

    async doOffer() {
        const offer = await this.peerConnection.createOffer({});
        console.log('DO OFFER: ', this.peerConnection);
        await this.peerConnection.setLocalDescription(offer);
        try {
            await this.waitUntilIceGatheringStateComplete();
        } catch (error) {
            console.log('ERROR: ',error);
            this.close();
            throw error;
        }
    }

    async applyAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    close() {
        this.peerConnection.removeEventListener('iceconnectionstatechange', ()=>this.onIceConnectionStateChange());
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        if(this.reconnectionTimer) {
            clearTimeout(this.reconnectionTimer);
            this.reconnectionTimer = null;
        }
        this.peerConnection.close();
        super.close();
    }

    onIceConnectionStateChange() {
        console.log(this.peerConnection.iceConnectionState);
        if (this.peerConnection.iceConnectionState === 'connected'
          || this.peerConnection.iceConnectionState === 'completed') {
            if (this.connectionTimer) {
                clearTimeout(this.connectionTimer);
                this.connectionTimer = null;
            }
            clearTimeout(this.reconnectionTimer);
            this.reconnectionTimer = null;
        } else if (this.peerConnection.iceConnectionState === 'disconnected'
                  || this.peerConnection.iceConnectionState === 'failed') {
            if(!this.connectionTimer && !this.reconnectionTimer) {
                this.reconnectionTimer = setTimeout(() => {
                    this.close();
                }, TIME_TO_RECONNECTED);
            }
        }
    }

    descriptionToJSON(description, shouldDisableTrickleIce) {
        return !description ? {} : {
            type: description.type,
            sdp: shouldDisableTrickleIce ? description.sdp.replace(/\r\na=ice-options:trickle/g, '') : description.sdp
        };
    }

    async  waitUntilIceGatheringStateComplete() {
        if (this.peerConnection.iceGatheringState === 'complete') {
            return;
        }
  
        const deferred = {};
        deferred.promise = new Promise((resolve, reject) => {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });
  
        const timeout = setTimeout(() => {
            this.peerConnection.removeEventListener('icecandidate', onIceCandidate);
            deferred.reject(new Error('Timed out waiting for host candidates'));
        }, TIME_TO_HOST_CANDIDATES);
  
        const onIceCandidate = ({ candidate })=>{
            if (!candidate) {
                clearTimeout(timeout);
                this.peerConnection.removeEventListener('icecandidate', onIceCandidate);
                deferred.resolve();
            }
        };
  
        this.peerConnection.addEventListener('icecandidate', onIceCandidate);
  
        await deferred.promise;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            iceConnectionState: this.iceConnectionState,
            localDescription: this.localDescription,
            remoteDescription: this.remoteDescription,
            signalingState: this.signalingState
        };
    }

    
}

module.exports = WebRtcConnection;
