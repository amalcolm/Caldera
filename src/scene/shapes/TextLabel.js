import * as THREE from "three";
import { toCssColor } from "../drawing.js";

export class TextLabel extends THREE.Sprite {
  constructor(text, { position = [0, 0, 0], width = 0.5, height = 0.28, color = "#1f2328", renderOrder = 2 } = {}) {
    const texture = createTextTexture(text, color);

    super(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );

    this.color = color;
    this.text = text;
    this.position.fromArray(position);
    this.scale.set(width, height, 1);
    this.renderOrder = renderOrder;
  }

  setText(text) {
    if (this.text === text) {
      return;
    }

    this.text = text;
    this.material.map.dispose();
    this.material.map = createTextTexture(text, this.color);
    this.material.needsUpdate = true;
  }
}

function createTextTexture(text, color) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = 64;
  const padding = 20;

  context.font = `${fontSize}px Inter, Calabri, sans-serif`;
  const metrics = context.measureText(text);

  canvas.width = Math.ceil(metrics.width + padding * 2);
  canvas.height = fontSize + padding * 2;

  context.font = `${fontSize}px Inter, Calabri, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = toCssColor(color);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
