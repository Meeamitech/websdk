(function (window) {
  function Event(name) {
    this.name = name;
    this.callbacks = [];
  }

  Event.prototype.registerCallback = function (callback) {
    this.callbacks.push(callback);
  };

  function EventDispatcher() {
    this.events = {};
  }

  EventDispatcher.prototype.registerEvent = function (eventName) {
    var event = new Event(eventName);
    this.events[eventName] = event;
  };

  EventDispatcher.prototype.dispatchEvent = function (eventName, eventArgs) {
    this.events[eventName].callbacks.forEach(function (callback) {
      callback(eventArgs);
    });
  };

  EventDispatcher.prototype.addEventListener = function (eventName, callback) {
    this.events[eventName].registerCallback(callback);
  };

  class MeeamiSdk {
    constructor() {
      this.mNativeInterface = null;
      this.mCallSessions = [];
      this.mLocalStream = null;

      this.mPostToMc = null;
      this.mDomainName = null;
      this.mAppCb = null;
      this.mCallEvtCb = null;
      this.eventDispatcher = new EventDispatcher();
      this.eventDispatcher.registerEvent("init");

      // TODO :: Document this
      this.mConfigParams = {
        authToken: null,
        appId: null,
        domainName: null,
        uri: null,
        displayName: "",
        provServerUri: "prov-cpaasstg.meeamitech.com",
      };

      this.msg_type_enum = {
        HS_VOIP_MC_WEBRTC_MSG_SDP_OFFER: 0,
        HS_VOIP_MC_WEBRTC_MSG_SDP_ANSWER: 1,
        HS_VOIP_MC_WEBRTC_MSG_STM_ADDED: 2,
        HS_VOIP_MC_WEBRTC_MSG_STM_RMVED: 3,
        HS_VOIP_MC_WEBRTC_MSG_OTHER: 4,
        HS_VOIP_MC_WEBRTC_MSG_CREATE_FAILED: 5,
        HS_VOIP_MC_WEBRTC_MSG_SDP_FAILED: 6,
        HS_VOIP_MC_WEBRTC_MSG_INV_FAILED: 7,
        HS_VOIP_MC_WEBRTC_MSG_PUBLISH_FAILED: 8,
        HS_VOIP_MC_WEBRTC_MSG_ACCEPT_FAILED: 9,
      };

      this.connect_mode = {
        HS_VOIP_MODE_RESERVED: 0,
        HS_VOIP_MODE_RECVONLY: 1,
        HS_VOIP_MODE_SENDONLY: 2,
        HS_VOIP_MODE_SENDRECV: 3,
        HS_VOIP_MODE_INACTIVE: 4,
      };

      this.callMode = {
        CALL_MODE_AUDIO: 0,
        CALL_MODE_VIDEO_RECVONLY: 1,
        CALL_MODE_VIDEO_SENDONLY: 2,
        CALL_MODE_VIDEO_SENDRECV: 3,
      };

      this.SystemNotification = {
        INITIALIZATION_SUCCESS: 0,
        INITIALIZATION_FAILED: 1,
        DEINITIALIZATION_SUCCESS: 2,
        ON_OTP_SENT: 3,
        OTP_SEND_FAILED: 4,
        OTP_VERIFICATION_SUCCESS: 5,
        OTP_VERIFICATION_FAILED: 6,
        REGISTRATION_SUCCESS: 7,
        REGISTRATION_FAILED: 8,
        DEREGISTRATION_SUCCESS: 9,
        DEREGISTRATION_FAILED: 10,
        ON_NETWORK_CONNECTED: 11,
        ON_NETWORK_DISCONNECTED: 12,
      };

      this.callmgrNotificationObject = {
        INCOMING_CALL: 0,
        CALL_ENDED: 1,
        SWITCH_CALL_SUCCESS: 2,
        SWITCH_CALL_FAILED: 3,
        INCOMING_CALL_REDIRECTED: 4,
        INCOMING_CALL_REJECTED: 5,
        CONFERENCE_CALL: 6,
        VOICE_MESSAGE_WAIT: 7,
      };

      this.callSessionNotificationObject = {
        CALL_PROGRESS: 0,
        CALL_ANSWER_FAILED: 1,
        CALL_END_FAILED: 2,
        CALL_ENDED: 3,
        REMOTE_HOLD: 4,
        IS_ON_LOCAL_HOLD: 5,
        IS_ON_MUTE: 6,
        CALL_REPLACED: 7,
        CALL_REPLACE_FAILURE: 8,
        CALL_FORWARD_REQUEST: 9,
        CALL_FORWARDED: 10,
        START_VIDEO_REQUEST: 11,
        START_VIDEO_SUCCESS: 12,
        START_VIDEO_FAILED: 13,
        STOP_VIDEO_SUCCESS: 14,
        STOP_VIDEO_FAILED: 15,
        CALL_RING_OUT: 16,
        CALL_EARLY_MEDIA: 17,
        CALL_STATE_CONNECTED: 18,
      };

      //TODO: document this
      this.callNotifications = {
        // combination of callmgrNotificationObject+this.callSessionNotificationObject
        // exposed to user..
        INCOMING_CALL: "INCOMING_CALL",
        CALL_PROGRESS: "CALL_PROGRESS",
        CALL_ENDED: "CALL_ENDED",
        CALL_REJECTED: "CALL_REJECTED",
        CALL_ANSWER_FAILED: "CALL_ANSWER_FAILED",
        CALL_END_FAILED: "CALL_END_FAILED",
        CALL_ANSWER_SUCCESS: "CALL_ANSWER_SUCCESS",
        CALL_RINGING: "CALL_RINGING",
        CALL_CONNECTED: "CALL_CONNECTED",
      };

      this.Errors = {
        MAKE_CALL_FAILED: {
          CODE: 7000,
        },
        ANSWER_CALL_FAILED: {
          CODE: 7001,
        },
        END_CALL_FAILED: {
          CODE: 7002,
        },
      };
      // window.ME = this;
    }

    initHelper(callBack) {
      this.eventDispatcher.registerEvent("MEESDK_INIT");
      this.eventDispatcher.addEventListener("MEESDK_INIT", (obj) => {
        callBack(obj);
      });
      this.mNativeInterface.init("/config", "");
    }

    /**
     *
     *
     * @param {string} configParams.appId
     * @param {string} configParams.authToken
     *
     * @param {string} configParams.email
     * @param {string} configParams.password
     * @param {function} configParams.callsEventCb
     * @returns a promise which onsuccess gives indications.
     * @memberof MeeamiSdk
     */
    init(configParams) {
      // TODO: email password based
      return new Promise((resolve, reject) => {
        this.mNativeInterface = new Module.HsCommonSdkWasmIf();

        console.log(this.mNativeInterface, "ANJNAI");

        this.mPostToMc = Module.cwrap(
          "hs_voip_webrtc_msg_create_and_post",
          "void",
          ["number", "number", "string", "number"]
        );

        // Mandatory params checking..
        if (!(configParams && configParams.appId && configParams.authToken)) {
          reject(new Error("Bad Configuration"));
        }

        setTimeout(() => {
          reject(new Error("Timeout"));
        }, 30000);

        // Mandatory parameters
        this.mConfigParams.authToken = configParams.authToken;
        this.mConfigParams.appId = configParams.appId;

        // Optional
        this.mCallEvtCb = configParams.callsEventCb;

        this.initHelper((res) => {
          resolve(res);
        });
      });
    }

    getContext(callId) {
      for (let cs of this.mCallSessions) {
        if (cs.id == callId) return cs;
      }
      console.trace(
        // console.log(
        "JS-WEBRC: [getContext] couldn't find call context with id ",
        callId
      );
      return null;
    }

    removeContext(callId) {
      console.log(`JS-WEBRC: [removeContext] for callId [${callId}]`);
      for (let i = 0, len = this.mCallSessions.length; i < len; i++) {
        if (this.mCallSessions[i].id == callId) {
          this.mCallSessions.splice(i, 1);
        }
      }
    }

    createCallSessionObject(callId, isVideo, localvideo, remotevideo) {
      console.log(
        `JS-WEBRC: [createCallSessionObject][${callId}] callId(${callId})`
      );
      let obj = {
        id: callId,
        pc: null, // Peerconnection object
        iceCandidates: [],
        localStream: null,
        iceServers: null,
        isVideo: isVideo,
        media_mode: {
          audio: this.connect_mode.HS_VOIP_MODE_SENDRECV,
          video: this.connect_mode.HS_VOIP_MODE_INACTIVE,
        },
        UI: {
          // localVideo: localvideo ? localvideo : document.createElement("video"),
          // remoteVideo: remotevideo
          //   ? remotevideo
          //   : document.createElement("video"),

          localVideo: localvideo,
          remoteVideo: remotevideo,
        },
      };
      obj.answerCall = this.answerCall;
      obj.endCall = this.endCall;
      obj.parent = this;
      return obj;
    }

    startRegistration(uri, displayName, domainName) {
      if (null == this.mNativeInterface) {
        console.log("JS-WEBRTC: [startRegistration] Invalid state");
        return;
      }
      this.mNativeInterface.startRegistrationIf(uri, displayName, domainName);
      return;
    }

    startProvisioning(imsi, appId, serverUri, token) {
      if (null == this.mNativeInterface) {
        console.log("JS-WEBRTC: [startRegistration] Invalid state");
        return;
      }
      this.mNativeInterface.startProvisioning(imsi, appId, serverUri, token);
      return;
    }

    userNameToUri(username) {
      return "sip:" + username + "@" + this.mConfigParams.domainName;
    }

    /**
     *
     *
     * @param {boolean} isVideo
     * @returns
     * @memberof MeeamiSdk
     */
    getMode(isVideo) {
      return isVideo
        ? this.callMode.CALL_MODE_VIDEO_SENDRECV
        : this.callMode.CALL_MODE_AUDIO;
    }

    /**
     * Setting call notification handler.
     *
     * @param {function} callBk
     * @memberof MeeamiSdk
     */
    setCallNotificationHandler(callBk) {
      this.mCallEvtCb = callBk;
    }

    /**
     * Initiating a call.
     *
     * @param {string} username
     * @param {video} config.localVideoElement
     * @param {video} config.remoteVideoElement
     * @param {boolean} config.isVideo
     * @returns {number} callId
     * @memberof MeeamiSdk
     */
    makeCall(username, config) {
      return new Promise((resolve, reject) => {
        let uri = this.userNameToUri(username);

        if (this.mCallEvtCb == null) {
          console.log(
            `JS-WEBRTC : [makeCall] set callback before using this api`
          );
          reject(new Error("set callback before using this api"));
        }

        if (null == this.mNativeInterface) {
          console.log("JS-WEBRTC: [makeCall] Invalid state");
          reject(new Error("Invalid state"));
        }

        let mode;
        if (config && config.isVideo) {
          mode = this.getMode(config.isVideo);
        } else {
          mode = this.getMode(false);
        }

        let callId = this.mNativeInterface.startCall(uri, mode);

        console.log(`JS-WEBRTC : [makeCall][${callId}] mode:${mode}`);

        // calling failed..
        if (callId == 1) {
          console.log(`JS-WEBRTC : [makeCall][${callId}] failed `);
          reject(new Error("Couldn't place call"));
        }

        // TODO :: if local video elements not given.. u should add one?
        let cs;
        let isVideo = config && config.isVideo;
        let localPlayback = isVideo
          ? config.localVideoElement
          : document.createElement("audio");

        localPlayback.muted = true;

        let remotePlayback = isVideo
          ? config.remoteVideoElement
          : document.createElement("audio");

        cs = this.createCallSessionObject(
          callId,
          isVideo,
          localPlayback,
          remotePlayback
        );

        this.mCallSessions.push(cs);
        console.log(this.mCallSessions);
        resolve(cs);
      });
    }

    /**
     *
     * @param {boolean} config.isVideo
     * @param {video} config.localVideo
     * @param {video} config.remoteVideo
     * @returns ??
     * @memberof MeeamiSdk
     */
    answerCall(config) {
      return new Promise((resolve, reject) => {
        if (this.id == null) {
          console.error("JS-WEBRTC : [answerCall] Invalid state");
          reject(new Error("Calls not present"));
        }

        let ctxt = this.parent.getContext(this.id);
        if (ctxt == null) {
          console.error("JS-WEBRTC : [answerCall] Invalid state");
          reject(new Error("Invalid State"));
        }

        if (config && config.isVideo) {
          ctxt.UI.isVideo = true;
          ctxt.UI.localVideo = config.localVideoElement;
          ctxt.UI.localVideo.muted = true;
          ctxt.UI.remoteVideo = config.remoteVideoElement;
        } else {
          ctxt.UI.isVideo = false;
          ctxt.UI.localVideo = document.createElement("audio");
          ctxt.UI.localVideo.muted = true;
          ctxt.UI.remoteVideo = document.createElement("audio");
        }

        ctxt.UI.localVideo.srcObject = this.parent.mLocalStream;

        let mode = this.parent.getMode(config.isVideo);

        console.log(`JS-WEBRTC : [answerCall][${this.id}] mode(${mode}) `);
        let x = this.parent.mNativeInterface.answerCall(this.id, mode);

        if (x == 1) {
          console.log(`JS-WEBRTC : [answerCall][${this.id}] failed `);
          reject(new Error("Something wrong.."));
        }
        resolve();
      });
    }

    /**
     * End call
     *
     * @memberof MeeamiSdk
     */
    endCall() {
      console.log(`JS-WEBRTC : [endCall][${this.id}] `);
      this.parent.mNativeInterface.endCall(this.id);
    }

    removeMedia(pc, audiomode, videomode) {
      console.log(
        `JS-WEBRTC : [removeMedia] audio:${audiomode} video:${videomode}`
      );
      if (
        audiomode == this.connect_mode.HS_VOIP_MODE_INACTIVE ||
        videomode == this.connect_mode.HS_VOIP_MODE_INACTIVE
      ) {
        pc.removeStream(this.mLocalStream);
      }
    }

    async addMedia(constraints, cs) {
      return new Promise(async (resolve, reject) => {
        if (!cs) reject();
        console.log(`JS-WEBRTC : [addMedia] constraints ${constraints}`);
        try {
          this.mLocalStream = await navigator.mediaDevices.getUserMedia(
            constraints
          );

          // cs.pc.addStream(this.mLocalStream);
          // this.mLocalStream.getTracks().forEach((track) => {
          //   await cs.pc.addTrack(track);
          // });
          if (cs.isVideo) {
            cs.pc.addTrack(
              this.mLocalStream.getVideoTracks()[0],
              this.mLocalStream
            );
          } else {
            console.log("NOT adding local video tracks..");
          }
          cs.pc.addTrack(
            this.mLocalStream.getAudioTracks()[0],
            this.mLocalStream
          );
          cs.UI.localVideo.srcObject = this.mLocalStream;

          resolve();
        } catch (err) {
          console.log(`JS-WEBRTC : [addMedia] Get User Media error "${err}"`);
          reject(err);
        }
      });
    }

    async modifyMediaStream(callId, audiomode, videomode) {
      return new Promise(async (resolve, reject) => {
        try {
          console.log(
            `JS-WEBRTC : [modifyMediaStream][${callId}] audio:${audiomode} video:${videomode}`
          );

          // TODO : test purpose
          // audiomode = this.connect_mode.HS_VOIP_MODE_SENDRECV;
          // videomode = this.connect_mode.HS_VOIP_MODE_SENDRECV;

          let callsession = this.getContext(callId);
          if (callsession == null) {
            reject();
          }

          if (
            audiomode == this.connect_mode.HS_VOIP_MODE_SENDRECV &&
            videomode == this.connect_mode.HS_VOIP_MODE_SENDRECV
          ) {
            await this.addMedia({ audio: true, video: true }, callsession);
          } else if (audiomode == this.connect_mode.HS_VOIP_MODE_SENDRECV) {
            await this.addMedia({ audio: true }, callsession);
          } else if (videomode == this.connect_mode.HS_VOIP_MODE_SENDRECV) {
            await this.addMedia({ video: true }, callsession);
          } else if (
            audiomode == this.connect_mode.HS_VOIP_MODE_INACTIVE &&
            videomode == this.connect_mode.HS_VOIP_MODE_INACTIVE
          ) {
            this.removeMedia(callsession.pc, audiomode, videomode);
          }
          resolve();
        } catch (e) {
          console.log(`JS-WEBRTC : [modifyMediaStream][${callId}] error:`, e);
          this.endCall();
          reject();
        }
      });
    }

    closePeerConnection(callId) {
      console.log(`JS-WEBRTC : [closePeerConnection][${callId}]`);
      let callsession = this.getContext(callId);
      if (callsession && callsession.pc) {
        if (this.mLocalStream) {
          this.mLocalStream.getTracks().forEach((track) => {
            track.stop();
          });
        }
        callsession.pc.ontrack = null;
        callsession.pc.onremovetrack = null;
        callsession.pc.onremovestream = null;
        callsession.pc.onicecandidate = null;
        callsession.pc.oniceconnectionstatechange = null;
        callsession.pc.onsignalingstatechange = null;
        callsession.pc.onicegatheringstatechange = null;
        callsession.pc.onnegotiationneeded = null;
        callsession.pc.close();
        callsession.pc = null;
        this.removeContext(callId);
      }
    }

    // call strart will be here..
    async onnegotiationneeded(event, callId) {
      console.log(`JS-WEBRTC : [onnegotiationneeded] ${callId}`);
      let callsession = this.getContext(callId);
      if (callsession == null) {
        return;
      }
      console.log(
        "JS-WEBRTC : [onnegotiationneeded] SignalingState ",
        callsession.pc.signalingState
      );
      if (callsession.pc) {
        try {
          let description = await callsession.pc.createOffer();

          // remote offer might recvd while creating offer
          if (callsession.pc.signalingState != "stable") {
            console.log(
              `JS-WEBRTC : [onnegotiationneeded]  Invalid state "${callsession.pc.signalingState}"`
            );
            return;
          }
          console.log(`JS-WEBRTC : [onnegotiationneeded]  createOffer success`);
          await callsession.pc.setLocalDescription(description);
          console.log(
            "JS-WEBRTC : [onnegotiationneeded] setLocalDescription done"
          );
          console.log(
            `JS-WEBRTC : [onnegotiationneeded]  sending HS_VOIP_MC_WEBRTC_MSG_SDP_OFFER`
          );
          this.mPostToMc(
            callId,
            this.msg_type_enum.HS_VOIP_MC_WEBRTC_MSG_SDP_OFFER,
            description.sdp,
            description.sdp.length
          );
        } catch (err) {
          console.log(
            "JS-WEBRTC : [onnegotiationneeded]  onnegotiationneeded error",
            err
          );
        }
      } else {
        console.log("JS-WEBRTC : [onnegotiationneeded] No session avaialble");
      }
    }

    createPeerConnection(callId, mediaConstraints, iceServers) {
      console.log(`JS-WEBRTC : [createPeerConnection] ${callId}`);
      console.log("JS-WEBRTC: ICE Servers", iceServers);

      // Open stun and turn servers.
      iceServers = {
        iceServers: [
          {
            url: "stun:stun.l.google.com:19302",
          },
          {
            url: "turn:numb.viagenie.ca",
            credential: "muazkh",
            username: "webrtc@live.com",
          },
        ],
      };

      let session = this.getContext(callId);
      if (session == null) {
        console.log(
          `JS-WEBRTC : [createPeerConnection] ${callId} creating ctxt`
        );
        session = this.createCallSessionObject(callId, false, null, null);
        this.mCallSessions.push(session);
      }

      session.media_mode.audio = mediaConstraints.audio
        ? this.connect_mode.HS_VOIP_MODE_SENDRECV
        : this.connect_mode.HS_VOIP_MODE_INACTIVE;
      session.media_mode.video = mediaConstraints.video
        ? this.connect_mode.HS_VOIP_MODE_SENDRECV
        : this.connect_mode.HS_VOIP_MODE_INACTIVE;

      session.iceServers = iceServers;

      session.pc = new RTCPeerConnection(iceServers);

      // Local ICE candidates came..
      session.pc.onicecandidate = (event) => {
        console.log(`JS-WEBRTC : [onicecandidate] ${callId}.`);
        if (event.candidate) {
          let tmp = JSON.stringify({
            ice: event.candidate,
          });
          console.log(
            "JS-WEBRTC : [onicecandidate]" + tmp,
            event.candidate,
            event.candidate.length
          );
          let msg = event.candidate.toJSON().candidate;

          this.mPostToMc(
            callId,
            this.msg_type_enum.HS_VOIP_MC_WEBRTC_MSG_OTHER,
            msg,
            msg.length
          );
        }
      };

      session.pc.ontrack = (event) => {
        console.log(`JS-WEBRTC : ontrack ${callId}`);
        var cs = this.getContext(callId);
        if (cs == null) {
          console.log(`JS-WEBRTC : [ontrack] callId(${callId}) bad state.`);
        }
        if (cs && cs.UI.remoteVideo) {
          console.log(event.streams);
          cs.UI.remoteVideo.srcObject = event.streams[0];
        } else {
          console.log("anjani==no remotevideo element");
        }
      };

      session.pc.onnegotiationneeded = (event) => {
        this.onnegotiationneeded(event, callId);
      };

      session.pc.oniceconnectionstatechange = () => {
        console.log(
          `JS-WEBRTC : [oniceconnectionstatechange]  connection state : ${session.pc.iceConnectionState}`
        );
        switch (session.pc.connectionState) {
          case "closed":
          case "failed":
            this.closePeerConnection();
            break;
        }
      };

      session.pc.onsignalingstatechange = async () => {
        console.log(
          `JS-WEBRTC : [onsignalingstatechange] signalling state : ${session.pc.signalingState}`
        );
        switch (session.pc.signalingState) {
          case "stable":
            var icelen = session.iceCandidates.length;
            for (var i = 0; i < icelen; i++) {
              console.log(
                "JS-WEBRTC : [onsignalingstatechange] adding iceCandidates from Q"
              );
              var candidate = session.iceCandidates.pop();
              try {
                await session.pc.addIceCandidate(
                  new RTCIceCandidate(candidate)
                );
              } catch (e) {
                console.log(
                  "JS-WEBRTC : [onsignalingstatechange] Failed to add ICE Candidates :",
                  e
                );
              }
            }
            break;
          case "closed":
            this.closePeerConnection();
            break;
        }
      };
    }

    async setRemoteDescription(callId, sdp, isOffer) {
      console.log(
        `JS-WEBRTC : [setRemoteDescription] callId(${callId}) isOffer(${isOffer})`
      );
      var callsession = this.getContext(callId);
      if (callsession == null) {
        console.log(
          `JS-WEBRTC : [setRemoteDescription] callId(${callId}) bad state.`
        );
        return;
      }

      var sdp_type = isOffer == 1 ? "offer" : "answer";

      if (callsession && callsession.pc) {
        try {
          await callsession.pc.setRemoteDescription(
            new RTCSessionDescription({
              type: sdp_type,
              sdp: sdp,
            })
          );
          console.log(
            `JS-WEBRTC : [setRemoteDescription][${callId}] done. signallingState:(${callsession.pc.signalingState})`
          );
          if (isOffer) {
            await this.modifyMediaStream(
              callId,
              callsession.media_mode.audio,
              callsession.media_mode.video
            );
            var description = await callsession.pc.createAnswer();
            await callsession.pc.setLocalDescription(description);

            this.mPostToMc(
              callId,
              this.msg_type_enum.HS_VOIP_MC_WEBRTC_MSG_SDP_ANSWER,
              description.sdp,
              description.sdp.length
            );
          }
        } catch (err) {
          console.log(
            `JS-WEBRTC : [setRemoteDescription][${callId}] Handling failed (${err}))`
          );
        }
      } else {
        console.log(
          `JS-WEBRTC : [setRemoteDescription][${callId}] No callsession Object for callId(${callId})`
        );
      }
    }

    receivingRemoteIce(callId, candidate) {
      console.log(
        `JS-WEBRTC : [receivingRemoteIce][${callId}] candidates : (${candidate})`
      );

      let callsession = this.getContext(callId);

      if (callsession == null) {
        console.error("JS-WEBRTC : [receivingRemoteIce] Invalid state");
        return null;
      }

      let iceObj = {
        candidate: candidate,
        sdpMid: 0,
        sdpMLineIndex: 0,
      };

      if (callsession.pc) {
        callsession.pc
          .addIceCandidate(new RTCIceCandidate(iceObj))
          .catch((err) => {
            console.log(
              `JS-WEBRTC : [receivingRemoteIce][${callId}] addIceCandidate failure ${err} ${iceObj}`
            );
          });
      } else {
        console.log(`JS-WEBRTC : [receivingRemoteIce][${callId}]  failure`);
      }
    }

    systemManagerNotification(obj) {
      console.log(
        ">>>>>>>>>>>>>>>>>>>>>>> systemNotification <<<<<<<<<<<<<<<<<<<<<<<<",
        obj.type,
        obj
      );
      let notification = {};
      switch (obj.type) {
        case this.SystemNotification.INITIALIZATION_SUCCESS: {
          this.startProvisioning(
            "+919000000000",
            this.mConfigParams.appId,
            this.mConfigParams.provServerUri,
            this.mConfigParams.authToken
          );
          return;
        }
        case this.SystemNotification.REGISTRATION_SUCCESS: {
          // TODO:: Remove this in production
          addToLog("Registration success");
          notification.code = 200;
          notification.reasonPhrase = "success";
          break;
        }
        case this.SystemNotification.OTP_VERIFICATION_SUCCESS: {
          // TODO:: Remove this in production
          addToLog("Provisioning success");
          this.mConfigParams.uri = obj.data.uid.uri;
          this.mConfigParams.domainName = obj.data.domainName;
          this.mConfigParams.displayName = obj.data.uid.displayName;

          // let domainName = obj.data.domainName;
          // let displyName = obj.data.uid.displyName;

          //TODO: Could be improved??
          this.mConfigParams.uri = obj.data.uid.uri.slice(
            4,
            obj.data.uid.uri.indexOf(obj.data.domainName) - 1
          );

          this.startRegistration(
            this.mConfigParams.uri,
            this.mConfigParams.displayName,
            this.mConfigParams.domainName
          );
          return;
        }
        case this.SystemNotification.INITIALIZATION_FAILED: {
          notification.code = 4000;
          notification.reasonPhrase = "INITIALIZATION_FAILED";
          break;
        }
        case this.SystemNotification.OTP_SEND_FAILED: {
          notification.code = 4001;
          notification.reasonPhrase = "OTP_SEND_FAILED";
          break;
        }
        case this.SystemNotification.OTP_VERIFICATION_FAILED: {
          notification.code = 4002;
          notification.reasonPhrase = "OTP_VERIFICATION_FAILED";
          break;
        }
        case this.SystemNotification.REGISTRATION_FAILED: {
          notification.code = 4003;
          notification.reasonPhrase = "REGISTRATION_FAILED";
          break;
        }
        case this.SystemNotification.DEREGISTRATION_SUCCESS: {
          break;
        }
        case this.SystemNotification.DEREGISTRATION_FAILED: {
          break;
        }
        case this.SystemNotification.DEINITIALIZATION_SUCCESS: {
          break;
        }
      }
      this.eventDispatcher.dispatchEvent("MEESDK_INIT", notification);
    }

    CallManagerNotification(obj) {
      // TODO:: Remove this in production
      console.log(
        `JS-WEBRTC : [CallManagerNotification] ${obj.type} creating ctxt`
      );
      let ev = {};
      switch (obj.type) {
        case this.callmgrNotificationObject.INCOMING_CALL: {
          console.log("INCOMING_CALL..", obj.data.callId);
          ev.type = this.callNotifications.INCOMING_CALL;
          ev.remoteUri = obj.data.remoteUri;
          let session = this.getContext(obj.data.callId);
          if (session == null) {
            console.log(
              `JS-WEBRTC : [CallManagerNotification] ${callId} creating ctxt`
            );
            session = this.createCallSessionObject(
              obj.data.callId,
              false,
              null,
              null
            );
            this.mCallSessions.push(session);
          }

          session.isVideo = obj.data.eCallMode;
          ev.data = session;
          break;
        }
        case this.callmgrNotificationObject.CALL_ENDED: {
          ev.type = this.callNotifications.CALL_ENDED;
          break;
        }
        case this.callmgrNotificationObject.INCOMING_CALL_REJECTED: {
          ev.type = this.callNotifications.CALL_REJECTED;
        }
      }
      this.mCallEvtCb(ev);
    }

    CallSessionNotification(callSessionEvt) {
      // TODO:: Remove this in production
      console.log(
        `JS-WEBRTC : [CallSessionNotification] ${callSessionEvt.type} creating ctxt`
      );
      let notification = {};
      switch (callSessionEvt.type) {
        case this.callSessionNotificationObject.CALL_PROGRESS: {
          notification.type = this.callNotifications.CALL_PROGRESS;
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_ANSWER_FAILED: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_END_FAILED: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_ENDED: {
          notification.type = this.callNotifications.CALL_ENDED;
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.IS_ON_LOCAL_HOLD: {
          notification.type = "";
          notification.data = {};
        }
        case this.callSessionNotificationObject.IS_ON_MUTE: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_REPLACED: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_REPLACE_FAILURE: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_FORWARD_REQUEST: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_FORWARDED: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.START_VIDEO_REQUEST: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.START_VIDEO_SUCCESS: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.START_VIDEO_FAILED: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.STOP_VIDEO_SUCCESS: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.STOP_VIDEO_FAILED: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_RING_OUT: {
          notification.type = this.callNotifications.CALL_RINGING;
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_EARLY_MEDIA: {
          notification.type = "";
          notification.data = {};
          break;
        }
        case this.callSessionNotificationObject.CALL_STATE_CONNECTED: {
          notification.type = this.callNotifications.CALL_CONNECTED;
          notification.data = {};
          break;
        }
      }
      this.mCallEvtCb(notification);
    }
  }

  window.ME = new MeeamiSdk();
})(window);
