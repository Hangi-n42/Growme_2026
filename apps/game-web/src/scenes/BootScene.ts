import Phaser from "phaser";
import { createInitialState, type SimState } from "@growme/sim-core";
import { dispatchSimCommand } from "../simBridge";

export class BootScene extends Phaser.Scene {
  private simState: SimState = createInitialState({ seed: "scaffold" });
  private readout?: Phaser.GameObjects.Text;

  constructor() {
    super("BootScene");
  }

  create(): void {
    this.readout = this.add.text(32, 32, this.formatReadout(), {
      color: "#f4f0df",
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      lineSpacing: 8
    });

    this.add.text(32, 160, "Press Space to dispatch a sim-core time command.", {
      color: "#b9d4c2",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px"
    });

    this.input.keyboard?.on("keydown-SPACE", () => {
      const result = dispatchSimCommand(this.simState, {
        type: "advanceTime",
        minutes: 30
      });
      this.simState = result.state;
      this.readout?.setText(this.formatReadout());
    });
  }

  private formatReadout(): string {
    return [
      "Growme 2026",
      `Day ${this.simState.day}`,
      `Minute ${this.simState.minute}`,
      `Energy ${this.simState.player.energy}`,
      `Wallet ${this.simState.player.wallet}`
    ].join("\n");
  }
}
