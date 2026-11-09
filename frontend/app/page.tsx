import { CloudAuthGate } from "../components/CloudAuthGate";
import { Studio } from "../components/Studio";
export default function Home() {
  return process.env.NEXT_PUBLIC_PARLONS_CLOUD_SITE === "true" ? (
    <CloudAuthGate />
  ) : (
    <Studio />
  );
}
