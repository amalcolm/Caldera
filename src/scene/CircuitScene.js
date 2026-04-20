import * as THREE from "three";
import { C3Pot } from "../model/C3Pot.js";
import { Digipot } from "./shapes/Digipot.js";
import { Gain } from "./shapes/Gain.js";
import { DifferentialAmp } from "./shapes/DifferentialAmp.js";
import { PhotoDiode } from "./shapes/PhotoDiode.js";
import { PoweredDigipot } from "./shapes/PoweredDigipot.js";
import { Slider, formatMultiplier } from "./shapes/Slider.js";
import { Wire } from "./shapes/Wire.js";

export class CircuitScene {
  constructor(mount) {
    this.mount = mount;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.circuitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.worldPointer = new THREE.Vector3();
    this.shapes = [];
    this.dragControls = [];
    this.wires = [];
    this.dragTarget = null;
    this.dragOffsetY = 0;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleDragMove = this.handleDragMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    this.setupRenderer();
    this.setupCamera();
    this.setupCircuit();
  }

  start() {
    this.mount.append(this.renderer.domElement);
    this.resizeObserver.observe(this.mount);
    this.addMouseHandlers();
    this.resize();
  }

  stop() {
    this.resizeObserver.disconnect();
    this.removeMouseHandlers();
    this.renderer.domElement.remove();
  }

  add(shape) {
    shape.addTo(this.scene);
    this.shapes.push(shape);

    if (shape instanceof Wire) {
      this.wires.push(shape);
    }

    return shape;
  }

  render() {
    this.scene.updateMatrixWorld(true);
    this.evaluateVoltages();
    this.shapes.forEach((shape) => shape.update(0, 0));
    this.renderer.render(this.scene, this.camera);
  }

  evaluateVoltages() {
    for (let pass = 0; pass < 6; pass += 1) {
      this.shapes.forEach((shape) => {
        if (!(shape instanceof Wire)) {
          shape.evaluateVoltage?.();
        }
      });

      this.wires.forEach((wire) => {
        wire.setVoltage(wire.from?.voltage ?? null);
      });
    }
  }

  addMouseHandlers() {
    this.renderer.domElement.addEventListener("mousedown", this.handleMouseDown);
    this.renderer.domElement.addEventListener("mousemove", this.handleMouseMove);
    this.renderer.domElement.addEventListener("mouseleave", this.handleMouseLeave);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  removeMouseHandlers() {
    this.renderer.domElement.removeEventListener("mousedown", this.handleMouseDown);
    this.renderer.domElement.removeEventListener("mousemove", this.handleMouseMove);
    this.renderer.domElement.removeEventListener("mouseleave", this.handleMouseLeave);
    window.removeEventListener("mousemove", this.handleDragMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  handleMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    const worldPoint = this.getWorldPoint(event);

    const dragControl = this.findDragControlAt(worldPoint);

    if (!dragControl) {
      return;
    }

    event.preventDefault();
    this.dragTarget = dragControl;
    this.dragOffsetY = this.dragTarget.getWiperDragOffset(worldPoint);
    this.renderer.domElement.style.cursor = "grabbing";
    window.addEventListener("mousemove", this.handleDragMove);
  }

  handleMouseMove(event) {
    if (this.dragTarget) {
      return;
    }

    const worldPoint = this.getWorldPoint(event);
    this.renderer.domElement.style.cursor = this.findDragControlAt(worldPoint) ? "grab" : "default";
  }

  handleMouseLeave() {
    if (!this.dragTarget) {
      this.renderer.domElement.style.cursor = "default";
    }
  }

  handleDragMove(event) {
    if (!this.dragTarget) {
      return;
    }

    if ((event.buttons & 1) !== 1) {
      this.endDrag();
      return;
    }

    event.preventDefault();
    this.dragTarget.dragWiperTo(this.getWorldPoint(event), this.dragOffsetY);
    this.render();
  }

  handleMouseUp(event) {
    if (event.button === 0) {
      this.endDrag();
    }
  }

  endDrag() {
    if (!this.dragTarget) {
      return;
    }

    this.dragTarget.snapWiper();
    this.dragTarget = null;
    this.dragOffsetY = 0;
    this.renderer.domElement.style.cursor = "default";
    window.removeEventListener("mousemove", this.handleDragMove);
    this.render();
  }

  getWorldPoint(event) {
    const bounds = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.ray.intersectPlane(this.circuitPlane, this.worldPointer);

    return this.worldPointer.clone();
  }

  findDragControlAt(worldPoint) {
    return this.dragControls.find((control) => control.containsWiperPoint(worldPoint));
  }

  resize() {
    const width = Math.max(this.mount.clientWidth, 1);
    const height = Math.max(this.mount.clientHeight, 1);
    const aspect = width / height;
    const minimumViewHeight = 7.2;

    let viewWidth = 10.2;
    let viewHeight = viewWidth / aspect;

    if (viewHeight < minimumViewHeight) {
      viewHeight = minimumViewHeight;
      viewWidth = viewHeight * aspect;
    }

    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
    this.render();
  }

  setupRenderer() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf7f4ed, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = "circuit-canvas";
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.setAttribute(
      "aria-label",
      "A two dimensional circuit with powered digipots, a photodiode, differential amplifiers, a slider, and a gain stage.",
    );
  }

  setupCamera() {
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);
  }

  setupCircuit() {
    const photoDiode = this.add(new PhotoDiode({ position: [-3.8, 4.2, 0] }));

    const topPot = this.add(new PoweredDigipot({ label: "top", position: [-3.8,  2.1, 0] }));
    const botPot = this.add(new PoweredDigipot({ label: "bot", position: [-3.8, -2.1, 0] }));
    const midPot = this.add(new        Digipot({ label: "mid", position: [-2.4,  0.0, 0] }));
    this.c3Pot = new C3Pot({
      botDigipot: botPot.digipot,
      inputSignalVoltage: photoDiode.outputVoltage,
      midDigipot: midPot,
      topDigipot: topPot.digipot,
    });
    this.c3Pot.begin();
    this.dragControls = [topPot.digipot, botPot.digipot, midPot];
    
    const differentialAmp1 = this.add(new DifferentialAmp({ multiplier: 200, position: [-0.6, 0.605, 0] }));

    const offsetPot = this.add(new PoweredDigipot({ label: "offset", position: [0.5, -2.1, 0] }));
    const differentialAmp2 = this.add(new DifferentialAmp({
      hasMultiplierInput: true,
      multiplier: 1,
      position: [2.4, 0.0, 0],
    }));
    const ampMultiplierSlider = this.add(new Slider({
      label: "gain",
      leftValue: 0,
      position: [2.4, 1.9, 0],
      rightValue: 255,
      value: 128,
    }));

    this.dragControls.push(offsetPot.digipot, ampMultiplierSlider);

    this.add(new Wire({ from: topPot.port("output"), to: midPot.port("topInput") }));
    this.add(new Wire({ from: botPot.port("output"), to: midPot.port("bottomInput") }));
    this.add(new Wire({ from: midPot.port("wiper"), to: differentialAmp1.port("nonInverting") }));
    this.add(new Wire({ from: photoDiode.port("output"), to: differentialAmp1.port("inverting") }));
    this.add(new Wire({ from: differentialAmp1.port("output"), to: differentialAmp2.port("inverting") }));
    this.add(new Wire({
      formatValue: formatMultiplier,
      from: ampMultiplierSlider.port("output"),
      to: differentialAmp2.port("multiplier"),
    }));
    this.add(new Wire({ from: offsetPot.port("output"), to: differentialAmp2.port("nonInverting") }));
  }

  alignGroundNode(ground, port) {
    this.scene.updateMatrixWorld(true);
    ground.setNodeWorldY(port.getWorldPosition().y);
    this.scene.updateMatrixWorld(true);
  }
}
