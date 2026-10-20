// FS IT Solutions WhatsApp Cloud API webhook — Supabase Edge Function (Deno).
// Deploy as a PUBLIC webhook endpoint (verify_jwt=false); Meta signatures are verified below.
// Required secrets: META_APP_SECRET, META_VERIFY_TOKEN, META_ACCESS_TOKEN,
// META_PHONE_NUMBER_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Never expose these secrets in GitHub Pages or browser code.
import { createClient } from "npm:@supabase/supabase-js@2";
const env=(name:string)=>{const value=Deno.env.get(name);if(!value)throw new Error("Missing "+name);return value};
const enc=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
async function signatureValid(body:string,signature:string|null){
  if(!signature?.startsWith("sha256="))return false;
  const expected=signature.slice(7);
  if(!/^[0-9a-f]{64}$/i.test(expected))return false;
  const key=await crypto.subtle.importKey("raw",enc.encode(env("META_APP_SECRET")),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const actual=hex(new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(body))));
  // Constant-time comparison for valid-length digests.
  let mismatch=0;for(let i=0;i<64;i++)mismatch|=actual.charCodeAt(i)^expected.toLowerCase().charCodeAt(i);
  return mismatch===0;
}
const MENU="Welcome to FS IT Solutions! 👋\n\nReply with a number:\n1. 💻 Buy a laptop\n2. 🔧 Laptop repairs\n3. 🌐 Networking & CCTV\n4. 📄 Request a quotation\n5. 👨‍💻 Speak to a technician\n\nReply MENU to see these options again.";
const replies:Record<string,string>={
 "1":"💻 What is your budget in rand, and what will you use the laptop for? A technician will confirm stock and prices.",
 "2":"🔧 Please send the device brand, model and fault description. Do not send passwords or PINs.",
 "3":"🌐 Do you need installation, maintenance or troubleshooting for networking or CCTV? Please describe the job.",
 "4":"📄 Tell us the products or services required, quantities and specifications. Our team will confirm the quotation.",
 "5":"👨‍💻 A technician will take over. Please describe your request. Reply MENU to restart the automated assistant."
};
const response=(text:string,status=200)=>new Response(text,{status,headers:{"content-type":"text/plain; charset=utf-8"}});
async function sendText(to:string,body:string){
 const phone=env("META_PHONE_NUMBER_ID");
 const result=await fetch("https://graph.facebook.com/v23.0/"+encodeURIComponent(phone)+"/messages",{
  method:"POST",headers:{"authorization":"Bearer "+env("META_ACCESS_TOKEN"),"content-type":"application/json"},
  body:JSON.stringify({messaging_product:"whatsapp",recipient_type:"individual",to,type:"text",text:{preview_url:false,body}})
 });
 if(!result.ok)throw new Error("WhatsApp send failed HTTP "+result.status);
}
Deno.serve(async req=>{
 try{
  if(req.method==="GET"){
   const url=new URL(req.url);
   if(url.searchParams.get("hub.mode")==="subscribe" &&
      url.searchParams.get("hub.verify_token")===env("META_VERIFY_TOKEN")){
     return response(url.searchParams.get("hub.challenge")??"");
   }
   return response("Forbidden",403);
  }
  if(req.method!=="POST")return response("Method not allowed",405);
  const body=await req.text();
  if(body.length>262144)return response("Payload too large",413);
  if(!await signatureValid(body,req.headers.get("x-hub-signature-256")))return response("Forbidden",403);
  const payload=JSON.parse(body);
  if(payload.object!=="whatsapp_business_account")return response("ok");
  const db=createClient(env("SUPABASE_URL"),env("SUPABASE_SERVICE_ROLE_KEY"),{auth:{persistSession:false}});
  for(const entry of payload.entry??[]){
   for(const change of entry.changes??[]){
    if(change.field!=="messages")continue;
    const value=change.value??{};
    if(value.metadata?.phone_number_id!==env("META_PHONE_NUMBER_ID"))continue;
    for(const message of value.messages??[]){
     if(!message.id||!/^\d{6,20}$/.test(message.from??""))continue;
     // Reserve message ID before sending to prevent duplicate replies on webhook retries.
     const {data:reserved,error:reserveError}=await db.from("whatsapp_processed_messages")
      .upsert({message_id:message.id,phone_number:message.from},{onConflict:"message_id",ignoreDuplicates:true})
      .select("message_id");
     if(reserveError)throw reserveError;
     if(!reserved?.length)continue;
     const from=message.from;
     const input=message.type==="text"?(message.text?.body??"").trim().toUpperCase():"";
     const {data:state,error:stateError}=await db.from("whatsapp_conversations").select("human_handover").eq("phone_number",from).maybeSingle();
     if(stateError)throw stateError;
     let handover=state?.human_handover??false;
     if(input==="MENU"||input==="START"){handover=false}
     else if(input==="5"||input==="HUMAN"||input==="AGENT"){handover=true}
     const {error:updateError}=await db.from("whatsapp_conversations").upsert({phone_number:from,human_handover:handover,updated_at:new Date().toISOString()},{onConflict:"phone_number"});
     if(updateError)throw updateError;
     if(handover && input!=="5" && input!=="HUMAN" && input!=="AGENT")continue;
     const answer=input==="MENU"||input==="START"||!input?MENU:(replies[input]??(handover?"A technician will take over.": "Thanks for your message. Our team will review it. Reply MENU for options."));
     await sendText(from,answer);
    }
   }
  }
  return response("ok");
 }catch(e){console.error("Webhook processing failed",e instanceof Error?e.message:"unknown");return response("Server error",500)}
});
