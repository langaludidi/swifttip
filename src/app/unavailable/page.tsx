import Link from "next/link";
import { AppMark } from "@/components/AppMark";

export default function UnavailablePage() {
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>SwiftTip</strong><span style={{width:42}}/></header><section className="tip-flow" style={{textAlign:"center"}}><div style={{display:"flex",justifyContent:"center",marginBottom:18}}><AppMark size={72}/></div><span className="eyebrow">Protected area</span><h1>This area isn't available for this session.</h1><p className="lead">Sign in with the authorised account or return to the SwiftTip home screen.</p><Link className="button button-primary" href="/" style={{marginTop:24}}>Return home</Link></section></div></main>;
}
