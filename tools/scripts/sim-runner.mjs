import { runCheck } from "./lib/repo.mjs";

const days = Number.parseInt(process.argv[2] ?? "", 10);

runCheck(`scaffold economy sim accepts ${days} days`, () => {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Simulation runner requires a positive day count.");
  }

  console.log(
    JSON.stringify(
      {
        days,
        infiniteMoneyLoops: 0,
        progressionDeadlocks: 0,
        scaffold: true
      },
      null,
      2
    )
  );
});
