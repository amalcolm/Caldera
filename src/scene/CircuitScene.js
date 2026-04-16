import * as THREE from "three";
import { Digipot } from "./shapes/Digipot.js";
import { Gain } from "./shapes/Gain.js";
import { OpAmp } from "./shapes/OpAmp.js";
import { PhotoDiode } from "./shapes/PhotoDiode.js";
import { PoweredDigipot } from "./shapes/PoweredDigipot.js";
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
    this.digipots = [];
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
    return shape;
  }

  render() {
    this.scene.updateMatrixWorld(true);
    this.shapes.forEach((shape) => shape.update(0, 0));
    this.renderer.render(this.scene, this.camera);
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

    const digipot = this.findDigipotAt(worldPoint);

    if (!digipot) {
      return;
    }

    event.preventDefault();
    this.dragTarget = digipot;
    this.dragOffsetY = this.dragTarget.getWiperDragOffset(worldPoint);
    this.renderer.domElement.style.cursor = "grabbing";
    window.addEventListener("mousemove", this.handleDragMove);
  }

  handleMouseMove(event) {
    if (this.dragTarget) {
      return;
    }

    const worldPoint = this.getWorldPoint(event);
    this.renderer.domElement.style.cursor = this.findDigipotAt(worldPoint) ? "grab" : "default";
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

  findDigipotAt(worldPoint) {
    return this.digipots.find((digipot) => digipot.containsWiperPoint(worldPoint));
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
      "A two dimensional circuit with two powered digipots, a photodiode, and an op amp.",
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
    this.digipots = [topPot.digipot, botPot.digipot, midPot];
    
    const opAmp1 = this.add(new OpAmp({ position: [-0.4, 0.654, 0] }));

    const offsetPot = this.add(new PoweredDigipot({ label: "offset", position: [0.5, -2.1, 0] }));
    const gainPot = this.add(new PoweredDigipot({ label: "gain", position: [3.84, 2.6, 0] }));
    const gain = this.add(new Gain({ position: [4.4, 0.0, 0] }));
    const opAmp2 = this.add(new OpAmp({ position: [2.4, 0.0, 0] }));

    this.digipots.push(offsetPot.digipot, gainPot.digipot);

    this.add(new Wire({ from: topPot.port("output"), to: midPot.port("topInput") }));
    this.add(new Wire({ from: botPot.port("output"), to: midPot.port("bottomInput") }));
    this.add(new Wire({ from: midPot.port("wiper"), to: opAmp1.port("inverting") }));
    this.add(new Wire({ from: photoDiode.port("output"), to: opAmp1.port("nonInverting") }));
    this.add(new Wire({ from: opAmp1.port("output"), to: opAmp2.port("nonInverting") }));
    this.add(new Wire({ from: gainPot.port("output"), to: gain.port("control") }));
    this.add(new Wire({ from: offsetPot.port("output"), to: opAmp2.port("inverting") }));
    this.add(new Wire({ from: opAmp2.port("output"), to: gain.port("input") }));
  }

  alignGroundNode(ground, port) {
    this.scene.updateMatrixWorld(true);
    ground.setNodeWorldY(port.getWorldPosition().y);
    this.scene.updateMatrixWorld(true);
  }
}
