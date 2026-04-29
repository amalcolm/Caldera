import { COMPONENT_BLUE } from "../drawing.js";
import { SUPPLY_VOLTAGE } from "../voltage.js";
import { Digipot } from "./Digipot.js";
import { GroundSymbol } from "./GroundSymbol.js";
import { Resistor } from "./Resistor.js";
import { Shape } from "./Shape.js";
import { VoltageSource } from "./VoltageSource.js";
import { STANDARD_OUTPUT_LEAD_LENGTH, Wire } from "./Wire.js";

const RAIL_CENTER_X = -0.18;
const RAIL_WITH_RESISTOR_SOURCE_X = 0.14;
const RAIL_RESISTOR_X = -0.38;
const RAIL_RESISTOR_SCALE = 0.55;
const SUPPLY_Y = 1.28;
const GROUND_Y = -1.55;
const GROUND_NODE_Y = -1.10;
const DEFAULT_RAIL_RESISTANCE = "68K";

export class PoweredDigipot extends Shape {
  constructor({
    color = COMPONENT_BLUE,
    groundResistance = DEFAULT_RAIL_RESISTANCE,
    label = "",
    position = [0, 0, 0],
    supplyResistance = DEFAULT_RAIL_RESISTANCE,
    voltage = SUPPLY_VOLTAGE,
  } = {}) {
    super({ name: "PoweredDigipot", position });

    const hasSupplyResistor = isPresentResistance(supplyResistance);
    const hasGroundResistor = isPresentResistance(groundResistance);

    this.supply = new VoltageSource({
      color,
      label: "3.3 V",
      outputDirection: [-1, 0, 0],
      position: [hasSupplyResistor ? RAIL_WITH_RESISTOR_SOURCE_X : RAIL_CENTER_X, SUPPLY_Y, 0],
      voltage,
    });
    this.ground = new GroundSymbol({
      color,
      position: [hasGroundResistor ? RAIL_WITH_RESISTOR_SOURCE_X : RAIL_CENTER_X, GROUND_Y, 0],
    });
    this.digipot = new Digipot({ color, label });
    this.supplyResistor = this.makeRailResistor({
      color,
      resistance: supplyResistance,
      position: [RAIL_RESISTOR_X, SUPPLY_Y, 0],
    });
    this.groundResistor = this.makeRailResistor({
      color,
      resistance: groundResistance,
      position: [RAIL_RESISTOR_X, GROUND_NODE_Y, 0],
    });

    const leftStandoffRoute = ({ end, start }) => {
      const standoffX = end.x - STANDARD_OUTPUT_LEAD_LENGTH;
      return [start, [standoffX, start.y, 0], [standoffX, end.y, 0], end];
    };
    const shortRoute = ({ end, start }) => [start, end];
    const supplyWires = this.makeRailWires({
      from: this.supply.port("output"),
      resistor: this.supplyResistor,
      route: leftStandoffRoute,
      shortRoute,
      to: this.digipot.port("topInput"),
    });
    const groundWires = this.makeRailWires({
      from: this.ground.port("node"),
      resistor: this.groundResistor,
      route: leftStandoffRoute,
      shortRoute,
      to: this.digipot.port("bottomInput"),
    });

    this.internalWires = [...supplyWires, ...groundWires];

    this.ports.set("output", this.digipot.port("wiper"));
    this.add(
      this.supply,
      this.ground,
      this.digipot,
      ...[this.supplyResistor, this.groundResistor].filter(Boolean),
      ...this.internalWires,
    );
  }

  update() {
    this.internalWires.forEach((wire) => wire.update());
  }

  evaluateVoltage() {
    this.supply.evaluateVoltage();
    this.ground.evaluateVoltage();
    this.evaluateRail(this.supply.port("output"), this.supplyResistor);
    this.evaluateRail(this.ground.port("node"), this.groundResistor);
    this.digipot.evaluateVoltage();
  }

  makeRailResistor({ color, position, resistance }) {
    if (!isPresentResistance(resistance)) {
      return null;
    }

    const resistor = new Resistor({
      color,
      inputSide: "right",
      position,
      value: resistance,
    });
    resistor.scale.setScalar(RAIL_RESISTOR_SCALE);

    return resistor;
  }

  makeRailWires({ from, resistor, route, shortRoute, to }) {
    if (!resistor) {
      return [
        new Wire({
          from,
          route,
          to,
        }),
      ];
    }

    return [
      new Wire({
        from,
        hideVoltageLabel: true,
        route: shortRoute,
        to: resistor.port("input"),
      }),
      new Wire({
        from: resistor.port("output"),
        route,
        to,
      }),
    ];
  }

  evaluateRail(from, resistor) {
    const wire = this.internalWires.find((candidate) => candidate.from === from);

    wire?.setVoltage(from.voltage);

    if (!resistor) {
      return;
    }

    resistor.evaluateVoltage();

    this.internalWires
      .find((candidate) => candidate.from === resistor.port("output"))
      ?.setVoltage(resistor.port("output").voltage);
  }
}

function isPresentResistance(resistance) {
  return resistance !== null && resistance !== false;
}
