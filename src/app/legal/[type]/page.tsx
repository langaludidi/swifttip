import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

type Terms={terms_type:string;version_code:string;title:string;content_body:string;content_format:string;content_hash:string;published_at:string;effective_from:string};
const types:Record<string,string>={
  "worker-terms":"worker_terms",
  "venue-terms":"venue_terms",
  "customer-transaction-terms":"customer_transaction_terms",
  "privacy":"privacy_notice"
};

export default async function LegalPage({params}:{params:Promise<{type:string}>}){
  const {type}=await params;
  const termsType=types[type];
  if(!termsType)notFound();
  const config=getServerConfig();
  let terms:Terms|null=null;
  if(config.databaseConfigured){
    const supabase=await createSupabaseServerClient();
    const {data}=await supabase.rpc("get_effective_terms",{p_terms_type:termsType});
    terms=((data??[]) as Terms[])[0]??null;
  }
  return <main className="flow-shell"><div className="flow-page"><header className="simple-header"><Link className="back-link" href="/">←</Link><strong>SwiftTip legal</strong><span style={{width:42}}/></header>
    {!terms?<section className="tip-flow"><span className="eyebrow">Not yet published</span><h1>This SwiftTip document is not effective yet.</h1><p className="lead">SwiftTip will not ask a Worker, Venue user or customer to accept a legal version that has not been formally published and made available for review.</p><p className="prototype-warning">No acceptance action is available on this page.</p></section>:
    <article className="tip-flow"><span className="eyebrow">Effective document · {terms.version_code}</span><h1>{terms.title}</h1><p className="lead">Effective {new Date(terms.effective_from).toLocaleDateString("en-ZA")}. This content is bound to the recorded SHA-256 content hash below.</p><div className="dashboard-section" style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{terms.content_body}</div><div className="dashboard-section"><div className="list-row"><strong>Version</strong><span>{terms.version_code}</span></div><div className="list-row"><strong>Published</strong><span>{new Date(terms.published_at).toLocaleDateString("en-ZA")}</span></div><div><strong>Content hash</strong><div className="meta" style={{overflowWrap:"anywhere",marginTop:6}}>{terms.content_hash}</div></div></div><p className="fee-note">Published SwiftTip legal text is immutable in the database. A change requires a new version rather than silently altering a version already accepted.</p></article>}
  </div></main>;
}
