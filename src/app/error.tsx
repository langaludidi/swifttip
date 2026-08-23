"use client";

import Link from "next/link";
import { AppMark } from "@/components/AppMark";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><section className="tip-flow empty-state-polished" style={{paddingTop:70}}><div style={{display:"flex",justifyContent:"center",marginBottom:8}}><AppMark size={56}/></div><span className="empty-icon">!</span><span className="eyebrow">Something went wrong</span><h1>SwiftTip couldn't load this screen.</h1><p>Your payment or account state has not been changed by this error screen. Try again, or return home if the problem continues.</p><div className="stack-actions" style={{width:"100%",maxWidth:320}}><button className="button button-primary button-large" onClick={()=>reset()}>Try again</button><Link className="button button-secondary" href="/">Return home</Link></div></section></div></main>;
}
