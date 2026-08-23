import Link from "next/link";
import { AppMark } from "@/components/AppMark";

export default function UnavailablePage() {
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><div className="brand-lockup"><AppMark size={34}/><strong>SwiftTip</strong></div><span style={{width:42}}/></header><section className="tip-flow empty-state-polished" style={{paddingTop:70}}><span className="empty-icon">i</span><span className="eyebrow">Access unavailable</span><h1>This area isn't available for this session.</h1><p>Use the account authorised for this Worker, Venue or Admin area, or return to the customer home screen.</p><Link className="button button-primary button-large" href="/">Return to SwiftTip</Link></section></div></main>;
}
