export class NetworkInformation extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        slot {
          display: none;
        }
        
        :host([status="online"]) slot[name="online"] {
          display: block;
        }
        
        :host([status="offline"]) slot[name="offline"] {
          display: block;
        }

      </style>
      
      <div id="container">
        <slot name="online"></slot>
        <slot name="offline"></slot>
      </div>
    `;
  }

  connectedCallback() {
    const connection = navigator.connection;

    if(connection) {
      connection.addEventListener('change', this.networkChanged.bind(this));
    }

    this.status = navigator.onLine ? 'online' : 'offline';

    this.dispatchEvent(new CustomEvent(this.status, {composed: true, bubbles: true}))

    window.addEventListener('offline', () => this.setNetworkStatus());
    window.addEventListener('online', () => this.setNetworkStatus());
  }

  setNetworkStatus() {
    this.status = navigator.onLine ? 'online' : 'offline';
    this.dispatchEvent(new CustomEvent(this.status));
  }

  networkChanged({target}) {
    const {effectiveType, type, downlink, rtt} = target;

    const connection = {
      effectiveType,
      type,
      downlink,
      rtt
    };

    this.dispatchEvent(new CustomEvent('change', {
      composed: true,
      bubbles: true,
      detail: {connection}
    }));
  }

  get status() {
    return this.getAttribute('status');
  }

  set status(status) {
    this.setAttribute('status', status);
  }
}

customElements.define('network-information', NetworkInformation);
