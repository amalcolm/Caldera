import { COMPONENT_BLUE, COMPONENT_STROKE_WIDTH, makeLine, makeLineLoop } from "../drawing.js";
import { Shape } from "./Shape.js";

export class OpAmp extends Shape {
  constructor({ color = COMPONENT_BLUE, position = [0, 0, 0] } = {}) {
    super({ name: "OpAmp", position });

    const leftX = -0.95;
    const rightX = 0.95;
    const inputY = 0.65;

    this.addPort("nonInverting", [leftX, inputY], { kind: "input", signal: "high" });
    this.addPort("inverting", [leftX, -inputY], { kind: "input", signal: "ground" });
    this.addPort("output", [rightX, 0], { kind: "output" });

    this.add(makeLineLoop([[leftX, 1.15], [rightX, 0], [leftX, -1.15]], { color, width: COMPONENT_STROKE_WIDTH }));
    this.addPlusSign(-0.65, inputY, color);
    this.addMinusSign(-0.65, -inputY, color);
  }

  addPlusSign(x, y, color) {
    const size = 0.13;

    this.add(makeLine([[x - size, y], [x + size, y]], { color, width: COMPONENT_STROKE_WIDTH }));
    this.add(makeLine([[x, y - size], [x, y + size]], { color, width: COMPONENT_STROKE_WIDTH }));
  }

  addMinusSign(x, y, color) {
    const size = 0.13;

    this.add(makeLine([[x - size, y], [x + size, y]], { color, width: COMPONENT_STROKE_WIDTH }));
  }
}
