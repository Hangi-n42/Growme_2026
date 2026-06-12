import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import "./styles/base.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: "game",
  backgroundColor: "#1f2a25",
  scene: [BootScene]
};

new Phaser.Game(config);
