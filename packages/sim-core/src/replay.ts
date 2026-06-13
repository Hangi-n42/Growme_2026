import { applyCommand } from "./commands";
import { createInitialGameState } from "./state";
import type {
  AuditEvent,
  CommandFailure,
  GameContentState,
  GameCommandResult,
  GameEvent,
  GameState
} from "./types";

export type ReplayCommandsOptions =
  | {
      readonly initialState: GameState;
      readonly content?: GameContentState;
      readonly commands: readonly unknown[];
      readonly stopOnFailure?: boolean;
    }
  | {
      readonly seed: string;
      readonly contentVersion?: string;
      readonly content?: GameContentState;
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
      : createInitialGameState({
          seed: options.seed,
          ...(options.contentVersion === undefined ? {} : { contentVersion: options.contentVersion })
        });

  let state = initialState;
  const results: GameCommandResult[] = [];
  const events: GameEvent[] = [];
  const audit: AuditEvent[] = [];
  const failures: CommandFailure[] = [];
  const commandContext = options.content === undefined ? undefined : { content: options.content };

  for (const command of options.commands) {
    const result = applyCommand(state, command, commandContext);

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
