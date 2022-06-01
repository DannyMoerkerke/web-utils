export class SpeechSynthesis extends HTMLElement {

  static get observedAttributes() {
    return [];
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
  
      </style>
    `;
  }

  connectedCallback() {
    this.synth = speechSynthesis;
    this.language = this.getAttribute('lang') || 'en';

    const id = setInterval(() => {
      if(this.voices.length) {
        clearInterval(id);
        this.voice = this.voices[0].voiceURI;

        this.dispatchEvent(new CustomEvent('ready'));
      }
    }, 200);
  }

  attributeChangedCallback(attr, oldVal, newVal) {

  }

  get voice() {
    return this._voice;
  }

  set voice(id) {
    this._voice = this.voices.find(({voiceURI}) => voiceURI === id);
  }

  get voices() {
    return this.synth.getVoices().filter(({lang}) => lang.includes(this.language));
  }

  get languages() {
    const separator = this.synth.getVoices()[0].lang.includes('-') ? '-' : '_';
    return [...new Set(this.synth.getVoices().map(({lang}) => lang.split(separator).shift()))].sort();
  }

  speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this._voice;
    utterance.lang = this.language;

    this.synth.speak(utterance);
  }
}

customElements.define('speech-synthesis', SpeechSynthesis);
