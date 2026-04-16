import "./style.css";
import { CircuitScene } from "./scene/CircuitScene.js";

document.querySelector("#app").innerHTML = `
  <div class="scene-stage" data-scene></div>
`;

const sceneRoot = document.querySelector("[data-scene]");
const circuitScene = new CircuitScene(sceneRoot);

circuitScene.start();
