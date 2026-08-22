import Link from "next/link";
import { TipExperience } from "@/components/TipExperience";

export default async function TipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flow-shell">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Tip a worker</strong><span style={{width:42}}/></header>
        <TipExperience token={token}/>
      </div>
    </main>
  );
}
