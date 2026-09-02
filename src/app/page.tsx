import PilotLanding from "./pilot-landing";
import PlannerClient from "./planner-client";

export default function Home() {
  return process.env.RAUMLY_PUBLIC_PILOT_MODE === "true"
    ? <PilotLanding />
    : <PlannerClient />;
}
