import { AppMark } from "@/components/AppMark";

export default function Loading() {
  return <main className="flow-shell customer-flow-page"><div className="flow-page"><section className="tip-flow payment-wait"><div style={{display:"flex",justifyContent:"center"}}><AppMark size={56}/></div><div className="progress-pulse" aria-hidden="true"/><span className="eyebrow">SwiftTip</span><h1>One moment.</h1><p className="lead">Loading the latest SwiftTip state…</p></section></div></main>;
}
