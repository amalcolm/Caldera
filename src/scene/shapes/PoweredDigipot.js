import { COMPONENT_BLUE } from "../drawing.js";
import { Digipot } from "./Digipot.js";
import { GroundSymbol } from "./GroundSymbol.js";
import { Shape } from "./Shape.js";
import { VoltageSource } from "./VoltageSource.js";
import { STANDARD_OUTPUT_LEAD_LENGTH, Wire } from "./Wire.js";

export class PoweredDigipot extends Shape {
  constructor({ color = COMPONENT_BLUE, label = "", position = [0, 0, 0] } = {}) {
    super({ name: "PoweredDigipot", position });

    this.supply = new VoltageSource({
      color,
      label: "3.3 V",
      outputDirection: [-1, 0, 0],
      position: [-0.18, 1.28, 0],
    });
    this.ground = new GroundSymbol({ color, position: [-0.18, -1.55, 0] });
    this.digipot = new Digipot({ color, label });
    const leftStandoffRoute = ({ end, start }) => {
      const standoffX = end.x - STANDARD_OUTPUT_LEAD_LENGTH;
      return [start, [standoffX, start.y, 0], [standoffX, end.y, 0], end];
    };

    this.internalWires = [
      new Wire({
        from: this.supply.port("output"),
        route: leftStandoffRoute,
        to: this.digipot.port("topInput"),
      }),
      new Wire({
        from: this.ground.port("node"),
        route: leftStandoffRoute,
        to: this.digipot.port("bottomInput"),
      }),
    ];

    this.ports.set("output", this.digipot.port("wiper"));
    this.add(this.supply, this.ground, this.digipot, ...this.internalWires);
  }

  update() {
    this.internalWires.forEach((wire) => wire.update());
  }
}
