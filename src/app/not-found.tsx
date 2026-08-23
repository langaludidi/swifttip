import Link from "next/link";
import { AppMark } from "@/components/AppMark";

export default function NotFound() {
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><section className="tip-flow empty-state-polished" style={{paddingTop:70}}><div style={{display:"flex",justifyContent:"center",marginBottom:8}}><AppMark size={56}/></div><span className="empty-icon">?</span><span className="eyebrow">Not found</span><h1>We couldn't find that SwiftTip page.</h1><p>The Worker code, receipt, transaction or link may be unavailable or no longer valid.</p><Link className="button button-primary button-large" href="/">Return to SwiftTip</Link></section></div></main>;
}
