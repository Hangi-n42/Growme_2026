export interface EconomySimSummary {
  readonly days: number;
  readonly infiniteMoneyLoops: number;
  readonly progressionDeadlocks: number;
}

export function runEconomyScaffoldSim(days: number): EconomySimSummary {
  return {
    days,
    infiniteMoneyLoops: 0,
    progressionDeadlocks: 0
  };
}
