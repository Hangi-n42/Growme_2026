export interface NpcScheduleProbe {
  readonly residentId: string;
  readonly checkedHours: number;
  readonly unresolvedLocations: number;
}

export function createNpcScheduleProbe(residentId: string): NpcScheduleProbe {
  return {
    residentId,
    checkedHours: 24,
    unresolvedLocations: 0
  };
}
