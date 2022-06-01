export class SpeechRecognition extends HTMLElement {

  static get observedAttributes() {
    return ['lang', 'interim'];
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

      </style>
      
      <div id="container">
        <slot name="start"></slot>
        <slot name="stop"></slot>
      </div>
    `;

    this.recognition = 'webkitSpeechRecognition' in window ? new webkitSpeechRecognition() : null;
  }

  connectedCallback() {
    this.startButton = this.shadowRoot.querySelector('slot[name="start"]').assignedNodes()[0];
    this.stopButton = this.shadowRoot.querySelector('slot[name="stop"]').assignedNodes()[0];

    this.stopButton.disabled = true;


    if(this.recognition) {
      this.recognition.lang = this.getAttribute('lang') || 'en-EN';
      // this.recognition.interimResults = true;
      this.recognition.continuous = true;

      this.startButton.addEventListener('click', this.startRecognition.bind(this));
      this.stopButton.addEventListener('click', this.stopRecognition.bind(this));
      this.recognition.addEventListener('result', this.processSpeech.bind(this));
      this.recognition.addEventListener('end', () => {
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
      });

      this.recognition.addEventListener('audiostart', () => {
      });

      this.recognition.addEventListener('audioend', () => {
      });

      this.recognition.addEventListener('soundstart', () => {
      });

      this.recognition.addEventListener('soundend', () => {
      });

      this.recognition.addEventListener('speechstart', () => {
      });

      this.recognition.addEventListener('speechend', () => {
      });

      this.recognition.addEventListener('error', (e) => {
        console.log('recognition error', e);
      });
    }
    else {
      this.startButton.disabled = true;
    }
  }

  attributeChangedCallback(attr, oldVal, newVal) {
    if(attr === 'lang') {
      this.recognition.lang = newVal;
    }
    if(attr === 'interim') {
      this.recognition.interimResults = this.hasAttribute('interim');
    }
  }

  startRecognition() {
    this.prevText = '';

    try {
      this.recognition.start();
      this.startButton.disabled = true;
      this.stopButton.disabled = false;
    }
    catch(e) {
      console.log('ERROR', e);

      this.recognition.stop();
      this.startButton.disabled = false;
      this.stopButton.disabled = true;
    }
  }

  stopRecognition() {
    this.recognition.stop();
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
  }

  processSpeech(e) {
    const {results, resultIndex} = e;

    if(results === undefined) {
      this.recognition.onend = null;
      this.recognition.stop();

      return;
    }

    [...results].slice(resultIndex).map(result => {
      const {transcript, confidence} = result[0];
      const text = this.formatResult(transcript);
      const finalText = text !== this.prevText ? text : '';

      this.prevText = finalText;

      result.isFinal && confidence > 0 ? this.broadcastResult(finalText) : this.broadcastInterimResult(transcript);
    });
  }

  broadcastResult(result) {
    this.dispatchEvent(new CustomEvent('result', {
      composed: true,
      bubbles: true,
      detail: {result}
    }));
  }

  broadcastInterimResult(result) {
    this.dispatchEvent(new CustomEvent('interim-result', {
      composed: true,
      bubbles: true,
      detail: {result}
    }));
  }

  formatResult(result) {
    return `${result.substr(0, 1).toUpperCase()}${result.substr(1)}. `;
  }
}

customElements.define('speech-recognition', SpeechRecognition);
