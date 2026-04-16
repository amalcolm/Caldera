import * as THREE from "three";
import { makeLine, toVector3, updateLine } from "../drawing.js";
import { Shape } from "./Shape.js";

export const STANDARD_OUTPUT_LEAD_LENGTH = 0.28;

export class Wire extends Shape {
  constructor({ from, to, route = null, waypoints = [], name = "Wire" } = {}) {
    super({ name });

    this.from = from;
    this.route = route;
    this.to = to;
    this.waypoints = waypoints;
    this.line = makeLine([]);

    this.add(this.line);
    this.update();
  }

  update() {
    updateLine(this.line, this.getRoutePoints());
  }

  getRoutePoints() {
    const start = this.resolveLocal(this.from);
    const end = this.resolveLocal(this.to);

    if (this.route) {
      return this.route({ end, start }).map(toVector3);
    }

    if (this.waypoints.length > 0 || !this.hasHorizontalOutputLead()) {
      return [start, ...this.waypoints.map(toVector3), end];
    }

    const leadDirection = this.from.getWorldDirection();
    const leadEnd = this.worldToLocal(
      this.resolve(this.from).add(leadDirection.multiplyScalar(STANDARD_OUTPUT_LEAD_LENGTH)),
    );
    const route = [start, leadEnd];

    if (Math.abs(leadEnd.y - end.y) > 0.001) {
      route.push(new THREE.Vector3(leadEnd.x, end.y, leadEnd.z));
    }

    route.push(end);
    return route;
  }

  hasHorizontalOutputLead() {
    return this.from?.kind === "output" && this.from?.getWorldDirection;
  }

  resolve(endpoint) {
    if (endpoint?.getWorldPosition) {
      return endpoint.getWorldPosition();
    }

    return toVector3(endpoint);
  }

  resolveLocal(endpoint) {
    return this.worldToLocal(this.resolve(endpoint).clone());
  }
}
