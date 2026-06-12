import { applyCommand } from "./commands";
import { createInitialGameState } from "./state";
import type {
  AuditEvent,
  CommandFailure,
  GameCommandResult,
  GameEvent,
  GameState
} from "./types";

export type ReplayCommandsOptions =
  | {
      readonly initialState: GameState;
      readonly commands: readonly unknown[];
      readonly stopOnFailure?: boolean;
    }
  | {
      readonly seed: string;
      readonly contentVersion?: string;
      readonly commands: readonly unknown[];
      readonly stopOnFailure?: boolean;
    };

export interface ReplayCommandsResult {
  readonly initialState: GameState;
  readonly finalState: GameState;
  readonly results: readonly GameCommandResult[];
  readonly events: readonly GameEvent[];
  readonly audit: readonly AuditEvent[];
  readonly failures: readonly CommandFailure[];
}

export function replayCommands(options: ReplayCommandsOptions): ReplayCommandsResult {
  const initialState =
    "initialState" in options
      ? options.initialState
      : createInitialGameState(
          options.contentVersion === undefined
            ? { seed: options.seed }
            : {
                seed: options.seed,
                contentVersion: options.contentVersion
              }
        );

  let state = initialState;
  const results: GameCommandResult[] = [];
  const events: GameEvent[] = [];
  const audit: AuditEvent[] = [];
  const failures: CommandFailure[] = [];

  for (const command of options.commands) {
    const result = applyCommand(state, command);

    results.push(result);
    events.push(...result.events);
    audit.push(...result.audit);

    if (result.ok) {
      state = result.state;
      continue;
    }

    failures.push(result.failure);

    if (options.stopOnFailure === true) {
      break;
    }
  }

  return {
    initialState,
    finalState: state,
    results,
    events,
    audit,
    failures
  };
}
