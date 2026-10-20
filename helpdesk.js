"use strict";
const BASE="https://memecdfwzhdicsrpzudw.supabase.co";
const KEY="sb_publishable_ZN48Lu78Ak7TKgjbnZBC-g_s4Gr4fr1";
const $=id=>document.getElementById(id);
let token=null;
const headers=(auth=false)=>({"apikey":KEY,...(auth?{"authorization":"Bearer "+token}:{})});
$("ticketForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const form=e.currentTarget,btn=$("submitBtn"),out=$("submitResult");
 if(!form.reportValidity())return;
 btn.disabled=true;out.textContent="Submitting your request…";
 try{
  const data=Object.fromEntries(new FormData(form).entries());
  const res=await fetch(BASE+"/functions/v1/helpdesk-submit",{method:"POST",headers:{"content-type":"application/json",...headers()},body:JSON.stringify(data)});
  const body=await res.json();
  if(!res.ok||!body.reference)throw Error(body.error||"Unable to submit ticket");
  out.textContent="Ticket created: "+body.reference+". Please keep this reference. Our team will contact you.";
  form.reset();
 }catch(err){out.textContent=(err instanceof Error?err.message:"Submission failed")+". If the helpdesk is not yet activated, email elijahseleka@gmail.com."}
 finally{btn.disabled=false}
});
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const form=e.currentTarget,out=$("loginResult");
 out.textContent="Signing in…";
 try{
  const values=Object.fromEntries(new FormData(form).entries());
  const r=await fetch(BASE+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"content-type":"application/json",...headers()},body:JSON.stringify({email:values.email,password:values.password})});
  const data=await r.json();if(!r.ok||!data.access_token)throw Error("Incorrect login or authentication unavailable");
  token=data.access_token;
  const chk=await fetch(BASE+"/rest/v1/helpdesk_admins?select=user_id&limit=1",{headers:headers(true)});
  const roles=await chk.json();if(!chk.ok||!Array.isArray(roles)||roles.length===0)throw Error("This account is not authorized for helpdesk administration");
  form.hidden=true;$("dashboard").hidden=false;out.textContent="";
  form.reset();await loadTickets();
 }catch(err){token=null;out.textContent=err instanceof Error?err.message:"Login failed"}
});
const statuses=["New","Assigned","In progress","Waiting for customer","Resolved","Closed"];
function el(tag,content){const node=document.createElement(tag);if(content!==undefined)node.textContent=String(content);return node}
async function loadTickets(){
 const out=$("adminResult");out.textContent="Loading tickets…";
 try{
  const r=await fetch(BASE+"/rest/v1/support_tickets?select=id,ticket_no,created_at,customer_name,customer_email,category,description,priority,status,internal_notes&order=created_at.desc&limit=100",{headers:headers(true)});
  if(!r.ok)throw Error("Unable to load tickets (HTTP "+r.status+")");
  const tickets=await r.json();const tbody=$("ticketRows");tbody.replaceChildren();
  for(const t of tickets){
   const tr=el("tr");
   tr.append(el("td","FSIT-"+new Date(t.created_at).getUTCFullYear()+"-"+String(t.ticket_no).padStart(6,"0")));
   const customer=el("td");customer.append(el("strong",t.customer_name),el("div",t.customer_email));tr.append(customer);
   const issue=el("td");issue.append(el("strong",t.category),el("div",t.description));tr.append(issue);
   tr.append(el("td",t.priority));
   const statusCell=el("td"),status=el("select");for(const s of statuses){const option=el("option",s);option.value=s;status.append(option)}status.value=t.status;statusCell.append(status);tr.append(statusCell);
   const notesCell=el("td"),notes=el("textarea");notes.value=t.internal_notes||"";notes.maxLength=5000;notesCell.append(notes);tr.append(notesCell);
   const action=el("td"),save=el("button","Save");save.className="ticketSave";save.type="button";
   save.addEventListener("click",async()=>{
    save.disabled=true;out.textContent="Saving…";
    try{
     const r=await fetch(BASE+"/rest/v1/support_tickets?id=eq."+encodeURIComponent(t.id),{method:"PATCH",headers:{"content-type":"application/json","prefer":"return=minimal",...headers(true)},body:JSON.stringify({status:status.value,internal_notes:notes.value})});
     if(!r.ok)throw Error("Save failed (HTTP "+r.status+")");
     out.textContent="Ticket updated.";
    }catch(err){out.textContent=err instanceof Error?err.message:"Update failed"}
    finally{save.disabled=false}
   });action.append(save);tr.append(action);tbody.append(tr);
  }
  out.textContent=tickets.length+" ticket(s) loaded. Showing latest 100.";
 }catch(err){out.textContent=err instanceof Error?err.message:"Unable to load tickets"}
}
$("refreshBtn").addEventListener("click",loadTickets);
$("logoutBtn").addEventListener("click",()=>{token=null;$("dashboard").hidden=true;$("loginForm").hidden=false;$("ticketRows").replaceChildren();$("loginResult").textContent="Signed out.";});
