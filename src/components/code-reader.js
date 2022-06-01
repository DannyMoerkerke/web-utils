
export class CodeReader extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --video-width: 100%;
          --video-height: auto;
          --video-background-color: #cccccc;
          --dialog-background-color: #ffffff;
          --dialog-backdrop-background-color: #cecece;
        }
        
        #container {
          position: relative;
          width: var(--video-width);
          background-color: var(--video-background-color);
        }
        
        @media screen and (min-width: 1024px) {
          #container {
            min-width: 400px;
            min-height: 300px;
          }
        }
        
        #video-container {
          position: relative;
          overflow: hidden;
          height: var(--video-height);
          max-height: var(--video-height);
        }
        
        video {
          width: 100%;
          display: block;
          object-fit: cover;
        }
        
        canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        #data-canvas {
          visibility: hidden;
        }
        
        #drawing-canvas {
          background-color: transparent;
        }
        
        #frame {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: transparent;
          transform-origin: center center;
          transform: scale(1.1);
          transition: transform .3s ease-out;
        }
        
        :host([capturing]) #frame {
          transform: scale(0.7);
        }
        
        .corner {
          position: absolute;
          width: 50px;
          height: 50px;
          border: 3px solid #ffff00;
          clip-path: polygon(0 48px, 48px 48px, 48px 0, 0 0);
        }
        
        .top-left {
          top: 0;
          left: 0;
        }
        
        .top-right {
          top: 0;
          right: 0;
          transform: rotate(90deg);
        }
        
        .bottom-right {
          bottom: 0;
          right: 0;
          transform: rotate(180deg);
        }
        
        .bottom-left {
          bottom: 0;
          left: 0;
          transform: rotate(-90deg);
        }
        
        dialog {
          width: min(50ch, 100vw);
          border: 1px solid #cccccc;
          transform-origin: center center;
          animation: fade-in-slide-in .3s;
          background-color: var(--dialog-background-color);
        }
    
        dialog::backdrop {
          opacity: .4;
          background-color: var(--dialog-backdrop-background-color;
        }
    
        @keyframes fade-in-slide-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      </style>
            
      <div id="container">
        <div id="video-container">
          <canvas id="data-canvas"></canvas>
          <video autoplay playsinline></video>
          <canvas id="drawing-canvas"></canvas>
          
          <div id="frame">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-right"></div>
            <div class="corner bottom-left"></div>
          </div>
        </div>

        <dialog part="dialog">
          <h3>No access to camera</h3>
          <p>
            Your device does not have permission to access the camera and microphone. Please enable this in your device's 
            settings.
          </p>
          <button id="close">OK</button>
        </dialog>
      </div>
    `;

    this.capturing = false;
    this.animationFrameId = null;

    this.constraints = {
      audio: false,
      video: {
        facingMode: 'environment'
      }
    };

    this.permissionDialog = this.shadowRoot.querySelector('dialog');
    this.closeButton = this.shadowRoot.querySelector('#close');
    this.video = this.shadowRoot.querySelector('video');
    this.dataCanvas = this.shadowRoot.querySelector('#data-canvas');
    this.drawingCanvas = this.shadowRoot.querySelector('#drawing-canvas');
    this.dataCtx = this.dataCanvas.getContext('2d');
    this.drawingCtx = this.drawingCanvas.getContext('2d');

    this.closeButton.addEventListener('click', () => this.permissionDialog.close());
  }

  get capturing() {
    this.hasAttribute('capturing');
  }

  set capturing(isCapturing) {
    isCapturing ? this.setAttribute('capturing', '') : this.removeAttribute('capturing');
  }

  connectedCallback() {
    this.video.onplaying = async () => {
      this.dataCanvas.width = this.dataCanvas.offsetWidth;
      this.dataCanvas.height = this.dataCanvas.offsetHeight;
      this.drawingCanvas.width = this.dataCanvas.offsetWidth;
      this.drawingCanvas.height = this.dataCanvas.offsetHeight;

      const formats = await BarcodeDetector.getSupportedFormats();

      this.barcodeDetector = new BarcodeDetector({formats});
      this.decode();
    }
  }

  async scan() {
    try {
      this.code = null;

      if(this.stream instanceof MediaStream) {
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.offsetWidth, this.drawingCanvas.offsetHeight)
        this.decode();
      }
      else {
        this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);

        this.startVideo();
      }
    }
    catch(e) {
      console.log(e);
      this.permissionDialog.showModal();
    }
  }

  stopScan() {
    clearTimeout(this.scanId);

    this.stream.getTracks().forEach(track => track.stop());
    this.video.srcObject = null;
    this.capturing = false;
  }

  startVideo() {
    this.video.srcObject = this.stream;
  }

  drawLine(begin, end) {
    this.drawingCtx.beginPath();
    this.drawingCtx.setLineDash([10, 5]);
    this.drawingCtx.lineJoin = 'round';
    this.drawingCtx.moveTo(begin.x, begin.y);
    this.drawingCtx.lineTo(end.x, end.y);
    this.drawingCtx.lineWidth = 2;
    this.drawingCtx.strokeStyle = '#FF3B58';
    this.drawingCtx.stroke();
  }

  drawFrame() {
    this.drawingCtx.drawImage(this.video, 0, 0, this.dataCanvas.width, this.dataCanvas.height);
  }

  drawCornerPoints(cornerPoints) {
    const [topLeftCorner, topRightCorner, bottomRightCorner, bottomLeftCorner] = cornerPoints;

    this.drawLine(topLeftCorner, topRightCorner);
    this.drawLine(topRightCorner, bottomRightCorner);
    this.drawLine(bottomRightCorner, bottomLeftCorner);
    this.drawLine(bottomLeftCorner, topLeftCorner);
  }

  async decode() {
    if(this.code) {
      clearTimeout(this.scanId);
      return false;
    }

    this.capturing = true;

    try {
      let imgData = this.getImageData(this.video);
      const barcodes = await this.barcodeDetector.detect(imgData);
      imgData = null;

      const code = barcodes.length > 0 ? barcodes[0] : undefined;

      if(code && code.rawValue !== '') {
        clearTimeout(this.scanId);
        this.code = code;

        this.drawFrame();

        const {cornerPoints} = code;
        this.drawCornerPoints(cornerPoints)

        this.capturing = false;

        setTimeout(() => {
          this.dispatchEvent(new CustomEvent('result', {
            detail: {code}
          }));
        }, 500);
      }
      else {
        this.scanId = setTimeout(this.decode.bind(this), 1000);
      }
    } catch (e) {
      console.log('error', e);
    }
  }

  getImageData(source) {
    this.dataCtx.drawImage(source, 0, 0, this.dataCanvas.width, this.dataCanvas.height);

    return this.dataCtx.getImageData(0, 0, this.dataCanvas.width, this.dataCanvas.height);
  }

}

customElements.define('code-reader', CodeReader);
