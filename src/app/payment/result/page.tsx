import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PaymentResultPage({searchParams}:{searchParams:Promise<{receipt?:string;status?:string;reference?:string}>}){
  const params=await searchParams;
  const receipt=String(params.receipt??"").trim();
  if(/^[0-9a-fA-F-]{36}$/.test(receipt))redirect(`/receipt/${encodeURIComponent(receipt)}`);

  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>Payment return</strong><span style={{width:42}}/></header><section className="tip-flow"><span className="eyebrow">Confirmation required</span><h1>We cannot confirm this payment from the return link alone.</h1><p className="lead">Payment-provider browser redirects are not authoritative. SwiftTip confirms payment only from trusted provider evidence recorded by the server.</p><p className="prototype-warning">No success state has been inferred from the URL. Use the private receipt link created with the Tip session to see its recorded status.</p><Link className="button button-secondary" href="/">Return to SwiftTip</Link></section></div></main>;
}
