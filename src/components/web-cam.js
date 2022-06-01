import {CustomElement} from '../../node_modules/@dannymoerkerke/custom-element/dist/custom-element.es.js';
import '../../node_modules/@dannymoerkerke/material-webcomponents/src/material-button.js';
import '../../node_modules/@dannymoerkerke/material-webcomponents/src/material-progress.js';
import '../../node_modules/@dannymoerkerke/material-webcomponents/src/material-dialog.js';
import {isTouchScreen} from '../lib/utils.js';

export class WebCam extends CustomElement {

  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});
    const mediaRecorderSupported = 'MediaRecorder' in window;
    this.mediaRecorderSupported = mediaRecorderSupported;

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --video-width: 100%;
          --video-height: 300px;
        }
        
        @media screen and (min-width: 1024px) {
          :host {
            --video-width: 50%;
            --video-height: 450px;
          }
        }
        
        #container {
          position: relative;
          width: var(--video-width);
          background-color: #cccccc;
          perspective: 300px;
        }
        
        #video-container {
          height: var(--video-height);
          max-height: var(--video-height);
          transform-style: preserve-3d;
          transform-origin: center left;
          transition: transform 0.8s ease-out;
        }
        
        #video-container.rear-view {
          transform: translate(100%) rotateY(180deg);
        }
        
        #front-camera, 
        #rear-camera {
          position: absolute;
          top: 0;
          left: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        #rear-camera {
          transform: rotateY(180deg);
        }
        
        #preview-container {
          position: relative;
        }
        
        video {
          width: 100%;
          object-fit: cover;
        }
        
        canvas {
          position: absolute;
          visibility: hidden;
        }
        
        #video-buttons {
          position: absolute;
          left: 0;
          bottom: 0;
          display: flex;
          z-index: 3;
        }
        
        .material-icons {
          font-family: 'Material Icons';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: 'liga';
          -webkit-font-smoothing: antialiased;
        }
        
        material-button {
          cursor: pointer;
          display: block;
        }
        #close-video {
          position: absolute;
          top: 0;
          right: 0;
        }
        
        #record-video,
        #stop-record-video {
          --font-color: #ff0000;
        }
        
        #download a {
          color: #000000;
          text-decoration: none;
        }
        #download a i {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>
      
      <div id="container">
        <canvas></canvas>
        
        <div id="video-container">
          <video id="front-camera" autoplay playsinline></video>
          <video id="rear-camera" autoplay playsinline></video>
        </div>
        
        <div id="preview-container" hidden>
          <video id="preview" playsinline></video>
          <material-button id="close-video" raised>
            <i class="material-icons" slot="left-icon">clear</i>
          </material-button>
        </div>
        
        <div id="video-buttons">
          <material-button id="init-video" raised>
            <i class="material-icons" slot="left-icon">video_call</i>
          </material-button>
          
          <material-button id="capture-video" raised>
            <i class="material-icons" slot="left-icon">video_call</i>
            <input type="file" slot="file-input" id="video-input" accept="video/*" capture>
          </material-button>
          
          
          <material-button id="start-video" raised>
            <i class="material-icons" slot="left-icon">videocam</i>
          </material-button>
          
          <material-button id="suspend-video" raised>
            <i class="material-icons" slot="left-icon">videocam_off</i>
          </material-button>
          
          <material-button id="toggle-camera" raised>
            <i class="material-icons" slot="left-icon">switch_video</i>
          </material-button>
          
          <material-button id="pip" raised>
            <i class="material-icons" slot="left-icon">picture_in_picture_alt</i>
          </material-button>
          
          <material-button id="airplay" raised>
            <i class="material-icons" slot="left-icon">airplay</i>
          </material-button>
          
          <material-button id="record-video" raised ${!mediaRecorderSupported ? 'disabled' : ''}>
            <i class="material-icons" slot="left-icon">fiber_manual_record</i>
          </material-button>
          
          <material-button id="stop-record-video" raised ${!mediaRecorderSupported ? 'disabled' : ''}>
            <i class="material-icons" slot="left-icon">stop</i>
          </material-button>
          
          <material-button id="stop-video" raised>
            <i class="material-icons" slot="left-icon">power_settings_new</i>
          </material-button>
          
          <material-button id="play" raised>
            <i class="material-icons" slot="left-icon">play_arrow</i>
          </material-button>
          
          <material-button id="pause" raised>
            <i class="material-icons" slot="left-icon">pause</i>
          </material-button>
          
          <material-button id="download" raised>
            <a download="video.mp4" id="download-link" slot="left-icon" target="_blank">
              <i class="material-icons">get_app</i>
            </a>
          </material-button>
        </div>
      </div>      
      
      <material-dialog id="permission-dialog">
        <h3 slot="header">No access to media</h3>
        <p slot="body">Your device does not have permission to access the camera and microphone. Please enable this in your device's 
        settings.</p>
        <div slot="footer">
          <material-button id="dialog-close" label="Close" raised></material-button>
        </div>
    </material-dialog>
      
    `;

    this.constraints = {
      audio: true,
      video: {
        facingMode: 'user'
      }
    };

    this.userMediaSupported = ('mediaDevices' in navigator) && ('getUserMedia' in navigator.mediaDevices);
    this.mediaCaptureSupported = 'capture' in document.createElement('input');
    this.nativePipSupported = 'pictureInPictureEnabled' in document;
    this.safariPipSupported = document.createElement('video').webkitSupportsPresentationMode &&
      typeof document.createElement('video').webkitSetPresentationMode === 'function';

    this.pictureInPictureSupported = !isTouchScreen() && (this.nativePipSupported || this.safariPipSupported);

    this.airPlaySupported = false; // 'WebKitPlaybackTargetAvailabilityEvent' in window;
  }

  connectedCallback() {
    this.videoContainer = this.select('#video-container');
    this.previewContainer = this.select('#preview-container');
    this.preview = this.select('#preview');
    this.canvas = this.select('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.frontCamera = this.select('#front-camera');
    this.rearCamera = this.select('#rear-camera');
    this.initButton = this.select('#init-video');
    this.captureButton = this.select('#capture-video');
    this.startButton = this.select('#start-video');
    this.suspendButton = this.select('#suspend-video');
    this.stopButton = this.select('#stop-video');
    this.pipButton = this.select('#pip');
    this.airPlayButton = this.select('#airplay');
    // this.screenshotButton = this.select('#screenshot');
    this.recordButton = this.select('#record-video');
    this.closeButton = this.select('#close-video');
    this.playButton = this.select('#play');
    this.pauseButton = this.select('#pause');
    this.downloadButton = this.select('#download');
    this.stopRecordButton = this.select('#stop-record-video');
    this.toggleCameraButton = this.select('#toggle-camera');
    this.buttons = this.selectAll('#container material-button');
    this.downloadLink = this.select('#download-link');
    this.videoInput = this.select('#video-input');
    this.permissionDialog = this.select('#permission-dialog');
    this.dialogCloseButton = this.select('#dialog-close');

    this.video = this.getCurrentCamera();

    this.initButton.addEventListener('click', this.initVideo.bind(this, this.constraints));
    this.startButton.addEventListener('click', this.startVideo.bind(this));
    this.suspendButton.addEventListener('click', this.suspendVideo.bind(this));
    this.stopButton.addEventListener('click', this.stopVideo.bind(this));
    this.playButton.addEventListener('click', this.playVideoPreview.bind(this));
    this.pauseButton.addEventListener('click', this.pauseVideoPreview.bind(this));
    this.closeButton.addEventListener('click', this.closeVideo.bind(this));
    this.toggleCameraButton.addEventListener('click', this.toggleCamera.bind(this));

    this.pipButton.addEventListener('click', this.startPictureInPicture.bind(this));

    this.airPlayButton.addEventListener('click', () => this.video.webkitShowPlaybackTargetPicker());

    this.video.addEventListener('webkitplaybacktargetavailabilitychanged', ({availability}) => {
      this.airPlayButton.disabled = availability === 'not-available';
    });


    this.dialogCloseButton.addEventListener('click', e => this.permissionDialog.close());

    if(this.mediaRecorderSupported) {
      this.recordButton.addEventListener('click', this.recordVideo.bind(this));
      this.stopRecordButton.addEventListener('click', this.stopRecordVideo.bind(this));
    }

    this.video.onwebkitpresentationmodechanged = this.restartVideo.bind(this);
    this.video.onplaying = this.onPlaying.bind(this);

    this.preview.onended = () => {
      this.show(this.playButton);
      this.hide(this.pauseButton);
    };

    this.videoInput.addEventListener('change', e => {
      const reader = new FileReader();

      reader.onloadend = e => {
        this.preview.src = e.target.result;
        this.downloadLink.href = e.target.result;

        this.hide(this.videoContainer);
        this.show([this.previewContainer, this.downloadButton, this.playButton, this.closeButton]);
      };

      reader.readAsDataURL(e.target.files[0]);
    });

    const showFirstFrame = () => {
      this.preview.currentTime = 0.1;
      this.preview.pause();
      this.previewContainer.scrollIntoView(false);
    };

    this.preview.addEventListener('loadeddata', showFirstFrame);

    this.stream = null;
    this.hide(this.buttons);
    this.showStartButton();

    // set autoplay so 'loadeddata' event is thrown in Safari on iOS so first frame can be shown as poster
    if(this.mediaCaptureSupported && !this.userMediaSupported) {
      this.preview.setAttribute('autoplay', '');
    }
  }

  onPlaying() {
    this.toggleButtons(true);

    if(!this.video.classList.contains('initialized')) {
      const {width} = this.video.getBoundingClientRect();
      const {height} = this.videoContainer.getBoundingClientRect();

      this.css([this.frontCamera, this.rearCamera, this.preview, this.videoContainer, this.previewContainer], {
        width: `${width}px`,
        height: `${height}px`
      });

      this.canvas.setAttribute('width', width);
      this.canvas.setAttribute('height', height);

      this.frontCamera.classList.add('initialized');
      this.rearCamera.classList.add('initialized');
    }

    this.constraints.video.facingMode === 'environment' ? this.videoContainer.classList.add('rear-view') : this.videoContainer.classList.remove('rear-view');
  }

  getCurrentCamera() {
    return this.constraints.video.facingMode === 'user' ? this.frontCamera : this.rearCamera;
  }

  async initVideo(constraints) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoTrack = this.stream.getVideoTracks()[0];

      this.startVideo();
    }
    catch(e) {
      this.permissionDialog.open();
    }
  }

  startVideo() {
    this.video.srcObject = this.stream;
  }

  suspendVideo() {
    this.hide(this.recordButton);
    this.hide(this.suspendButton);
    this.show(this.startButton);
    this.video.srcObject = null;
  }

  async stopVideo() {
    if(this.isPictureInPictureActive()) {
      await this.stopPictureInPicture();
    }

    this.stopTracks();
    this.resetButtons();
    this.video.src = null;
    this.video.srcObject = null;
    this.preview.src = null;

    this.videoContainer.innerHTML = '';

    this.videoContainer.insertAdjacentHTML('afterbegin', `
      <video id="front-camera" autoplay playsinline></video>
      <video id="rear-camera" autoplay playsinline></video>
    `);

    this.frontCamera = this.select('#front-camera');
    this.rearCamera = this.select('#rear-camera');
    this.video = this.getCurrentCamera();

    this.video.onwebkitpresentationmodechanged = this.restartVideo.bind(this);
    this.video.onplaying = this.onPlaying.bind(this);
  }

  restartVideo() {
    if(this.video.paused) {
      this.video.play();
    }
  }

  recordVideo() {
    const mimeType = 'video/mpeg';
    const chunks = [];

    this.recorder = new MediaRecorder(this.stream);

    this.recorder.start();
    this.hide(this.recordButton);
    this.show(this.stopRecordButton);

    const processVideo = () => {
      const recording = new Blob(chunks, {type: 'video/mp4'});
      this.preview.src = URL.createObjectURL(recording);
      this.video = this.preview;
      this.video.onwebkitpresentationmodechanged = this.restartVideo.bind(this);

      const reader = new FileReader();

      reader.onloadend = e => {
        this.downloadLink.href = e.target.result;
      };

      reader.readAsDataURL(recording);
    };

    const processChunk = ({data}) => {
      if(data !== undefined && data.size !== 0) {
        chunks.push(data);
      }
    };

    this.recorder.addEventListener('dataavailable', processChunk);
    this.recorder.addEventListener('stop', processVideo);
  }

  stopRecordVideo() {
    this.recorder.stop();

    const showList = [this.previewContainer, this.playButton, this.closeButton, this.downloadButton];

    if(this.pictureInPictureSupported) {
      showList.push(this.pipButton);
    }

    if(this.airPlaySupported) {
      showList.push(this.airPlayButton);
    }

    this.hide([...this.buttons, this.stopRecordButton, this.videoContainer]);
    this.show(showList);
  }

  playVideoPreview() {
    this.preview.play();
    this.show(this.pauseButton);
    this.hide(this.playButton);
  }

  pauseVideoPreview() {
    this.preview.pause();
    this.hide(this.pauseButton);
    this.show(this.playButton);
  }

  startPictureInPicture() {
    this.nativePipSupported ? this.video.requestPictureInPicture() : this.video.webkitSetPresentationMode('picture-in-picture');
  }

  stopPictureInPicture() {
    return this.nativePipSupported ? document.exitPictureInPicture() : this.video.webkitSetPresentationMode('inline');
  }

  isPictureInPictureActive() {
    return this.nativePipSupported ? !!document.pictureInPictureElement : this.video.webkitPresentationMode === 'picture-in-picture';
  }

  takeScreenshot() {
    this.ctx.drawImage(this.video, 0, 0, this.videoContainer.offsetWidth, this.videoContainer.offsetHeight);
    this.detectFaces(this.canvas);

    const dataUrl = this.canvas.toDataURL();

    this.dispatchEvent(new CustomEvent('screenshot', {
      detail: {
        dataUrl
      }
    }));
  }

  closeVideo() {
    if(this.isPictureInPictureActive()) {
      this.stopPictureInPicture();
    }

    this.preview.src = null;

    this.video = this.getCurrentCamera();

    this.show(this.videoContainer);
    this.hide([this.previewContainer, this.pauseButton]);

    this.userMediaSupported ? this.toggleButtons(true) : this.resetButtons();
  }

  stopTracks() {
    this.stream.getTracks().map(track => track.stop());
  }

  toggleCamera() {
    this.stopTracks();

    const {facingMode} = this.constraints.video;

    this.constraints.video.facingMode = facingMode === 'user' ? 'environment' : 'user';
    this.video = this.getCurrentCamera();
    this.video.onplaying = this.onPlaying.bind(this);
    this.video.onwebkitpresentationmodechanged = this.restartVideo.bind(this);

    this.initVideo(this.constraints);
  }

  resetButtons() {
    this.hide(this.buttons);
    this.showStartButton();
  }

  showStartButton() {
    this.userMediaSupported ? this.show(this.initButton) : this.hide(this.initButton);
    this.mediaCaptureSupported && !this.userMediaSupported ? this.show(this.captureButton) : this.hide(this.captureButton);
  }

  toggleButtons(isStarting = false) {
    this.hide([this.initButton, this.playButton, this.downloadButton]);

    const hideList = [
      this.initButton,
      this.playButton,
      this.downloadButton
    ];

    const showList = [
      this.suspendButton,
      this.recordButton,
      this.stopButton
    ];

    if(this.pictureInPictureSupported) {
      showList.push(this.pipButton);
    }

    if(this.airPlaySupported) {
      showList.push(this.airPlayButton);
    }

    if(isStarting) {
      hideList.push(this.startButton);

      this.hide(hideList);
      this.show(showList);
    }
    else {
      this.show(this.startButton);
      this.hide(showList);
    }

    this.startButton.style.display = isStarting ? 'none' : 'block';

    this.suspendButton.style.display = isStarting ? 'block' : 'none';
    this.recordButton.style.display = isStarting ? 'block' : 'none';
    this.stopButton.style.display = isStarting ? 'block' : 'none';
    // this.screenshotButton.style.display = isStarting ? 'block' : 'none';

    this.hasRearCamera() ? this.show(this.toggleCameraButton) : this.hide(this.toggleCameraButton);
  }

  hasRearCamera() {
    return this.videoTrack && this.videoTrack.getCapabilities().facingMode
      && this.videoTrack.getCapabilities().facingMode.length;
  }
}

customElements.define('web-cam', WebCam);
