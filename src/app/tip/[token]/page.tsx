import Link from "next/link";
import { AppMark } from "@/components/AppMark";
import { TipExperience } from "@/components/TipExperience";

export default async function TipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flow-shell">
      <div className="flow-page">
        <header className="simple-header"><Link className="back-link" href="/" aria-label="Back">←</Link><div className="brand-lockup"><AppMark size={34}/><div><strong>SwiftTip</strong><span className="brand-subline">Tip a worker</span></div></div><span style={{width:42}}/></header>
        <TipExperience token={token}/>
      </div>
    </main>
  );
}
