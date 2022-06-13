export class ColorPicker extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <slot name="button"></slot>
    `;
  }

  connectedCallback() {
    this.colorPicker = new EyeDropper();
    const slot = this.shadowRoot.querySelector('slot[name="button"]');

    slot.addEventListener('slotchange', () => {
      const [button] = slot.assignedNodes();

      button.addEventListener('click', () => this.pickColor());
    });
  }

  async pickColor() {
    const result = await this.colorPicker.open();
    const {sRGBHex: hex} = result;
    const rgb = this.hexToRgb(hex);

    this.dispatchEvent(new CustomEvent('result', {
      detail: {hex, rgb}
    }));

    console.log({hex, rgb});
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    return result ? `rgb(${result.slice(1).map((x) => parseInt(x, 16))})` : null;
  }
}

customElements.define('color-picker', ColorPicker);
