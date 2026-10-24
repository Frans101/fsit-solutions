// Supabase Edge Function: helpdesk-submit
// Deploy with JWT verification disabled. This is a public, rate-limited intake endpoint.
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Never expose service role credentials in the browser.
import { createClient } from "npm:@supabase/supabase-js@2";
const project = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(project, service, {auth:{persistSession:false}});
const origin="https://frans101.github.io";
const allowed = ["Laptop / desktop repair","Networking & Wi-Fi","CCTV","Printer support","Software / email","Server / backup","Other IT support"];
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","access-control-allow-origin":origin,"vary":"Origin","access-control-allow-headers":"content-type, apikey, authorization, x-client-info","access-control-allow-methods":"POST, OPTIONS","cache-control":"no-store"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return reply(204,{});
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"});
 if(req.headers.get("origin")!==origin)return reply(403,{error:"Origin not allowed"});
 const len=Number(req.headers.get("content-length")||0);
 if(len>12000)return reply(413,{error:"Request too large"});
 try {
  const raw=await req.text();
  if(raw.length>12000)return reply(413,{error:"Request too large"});
  const x=JSON.parse(raw);
  if(typeof x.website==="string"&&x.website.trim())return reply(200,{ok:true}); // honeypot
  const str=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max+1):"";
  const customer_name=str(x.name,100),customer_email=str(x.email,254),customer_phone=str(x.phone,30);
  const category=str(x.category,60),device=str(x.device,150),description=str(x.description,3000),priority=str(x.priority,10);
  if(customer_name.length<2||customer_name.length>100||!/^\S+@\S+\.\S+$/.test(customer_email)||customer_email.length>254
    ||!allowed.includes(category)||description.length<10||description.length>3000||!["Low","Normal","Urgent"].includes(priority)
    ||device.length>150||customer_phone.length>30)return reply(400,{error:"Please check the support request details."});
  // Database-enforced throttling per email address, plus optional platform WAF/rate limiting recommended.
  const {data,error}=await db.rpc("helpdesk_submit_ticket",{
   p_name:customer_name,p_email:customer_email.toLowerCase(),p_phone:customer_phone,
   p_category:category,p_device:device,p_description:description,p_priority:priority
  });
  if(error){console.error("Ticket submission failed",error.code);return reply(429,{error:"Unable to submit now. Please try later or email support."})}
  return reply(201,{ok:true,reference:"FSIT-"+new Date().getUTCFullYear()+"-"+String(data).padStart(6,"0")});
 }catch{return reply(400,{error:"Invalid request"})}
});
