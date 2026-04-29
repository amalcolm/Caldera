import * as THREE from "three";
import { INK, makeLine, toVector3, updateLine } from "../drawing.js";
import { formatVoltage, isKnownVoltage } from "../voltage.js";
import { Shape } from "./Shape.js";
import { TextLabel } from "./TextLabel.js";

export const STANDARD_OUTPUT_LEAD_LENGTH = 0.28;
const VOLTAGE_LABEL_WIDTH = 0.384;

export class Wire extends Shape {
  constructor({
    from,
    formatValue = formatVoltage,
    hideVoltageLabel = false,
    name = "Wire",
    propagateVoltage = true,
    route = null,
    singleVoltageLabel = "auto",
    to,
    voltage = null,
    waypoints = [],
  } = {}) {
    super({ name });

    this.formatValue = formatValue;
    this.from = from;
    this.hideVoltageLabel = hideVoltageLabel;
    this.propagateVoltage = propagateVoltage;
    this.route = route;
    this.singleVoltageLabel = singleVoltageLabel;
    this.to = to;
    this.voltage = null;
    this.waypoints = waypoints;
    this.line = makeLine([]);
    this.startVoltageLabel = new TextLabel("?V", {
      color: INK,
      height: 0.12,
      renderOrder: 4,
      width: VOLTAGE_LABEL_WIDTH,
    });
    this.endVoltageLabel = new TextLabel("?V", {
      color: INK,
      height: 0.12,
      renderOrder: 4,
      width: VOLTAGE_LABEL_WIDTH,
    });

    this.add(this.line, this.startVoltageLabel, this.endVoltageLabel);
    this.setVoltageLabelHidden(hideVoltageLabel);
    this.setVoltage(voltage);
    this.update();
  }

  update() {
    const routePoints = this.getRoutePoints();

    updateLine(this.line, routePoints);
    this.updateVoltageLabels(routePoints);
  }

  setVoltage(voltage) {
    this.voltage = isKnownVoltage(voltage) ? voltage : null;

    if (this.propagateVoltage && this.from?.voltage !== undefined) {
      this.from.voltage = this.voltage;
    }

    if (this.propagateVoltage && this.to?.voltage !== undefined) {
      this.to.voltage = this.voltage;
    }

    this.startVoltageLabel.setText(this.formatValue(this.voltage));
    this.endVoltageLabel.setText(this.formatValue(this.voltage));
  }

  setVoltageLabelHidden(isHidden) {
    this.hideVoltageLabel = isHidden;
    this.startVoltageLabel.visible = !isHidden;
    this.endVoltageLabel.visible = !isHidden;
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

  updateVoltageLabels(routePoints) {
    if (this.hideVoltageLabel || routePoints.length < 2) {
      return;
    }

    this.startVoltageLabel.position.copy(
      this.getVoltageLabelPosition(this.from, routePoints[0], routePoints[1]),
    );
    this.endVoltageLabel.position.copy(
      this.getVoltageLabelPosition(this.to, routePoints.at(-1), routePoints.at(-2)),
    );

    const sameY = Math.abs(this.startVoltageLabel.position.y - this.endVoltageLabel.position.y) < 0.02;
    const sameX = Math.abs(this.startVoltageLabel.position.x - this.endVoltageLabel.position.x) < 0.02;

    if (sameY && !sameX) {
      if (this.singleVoltageLabel === "end") {
        this.startVoltageLabel.position.set(999, 999, 999);
      } else {
        this.endVoltageLabel.position.set(999, 999, 999);
        this.startVoltageLabel.position.x = (routePoints[0].x + routePoints.at(-1).x) / 2;
      }
    }

    if (sameX && !sameY) {
      if (this.singleVoltageLabel === "start") {
        this.endVoltageLabel.position.set(999, 999, 999);
      } else {
        this.startVoltageLabel.position.set(999, 999, 999);
        this.endVoltageLabel.position.y = Math.min(routePoints[0].y, routePoints.at(-1).y) + 0.05;
      }
    }
  }

  getVoltageLabelPosition(endpoint, point, neighbour) {
    const isVertical = this.isVerticalEndpoint(endpoint, point, neighbour);
    const offset = isVertical
      ? new THREE.Vector3(-0.15, -0.06, 0.02)
      : new THREE.Vector3(point.x < neighbour.x ? 0.13 : -0.15, 0.05, 0.02);

    return point.clone().add(offset);
  }

  isVerticalEndpoint(endpoint, point, neighbour) {
    if (endpoint?.getWorldDirection) {
      const direction = endpoint.getWorldDirection();
      return Math.abs(direction.y) > Math.abs(direction.x);
    }

    return Math.abs(neighbour.y - point.y) > Math.abs(neighbour.x - point.x);
  }
}
