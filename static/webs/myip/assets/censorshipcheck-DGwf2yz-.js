import{u as m,a as f,b as c,d as e,n as d,t as n,w as g,z as C,A as R,i as u,F as _,k as b,g as v,h as w,R as S,o as l,f as p,p as T,j as E}from"./vendor-Dww-ccMT.js";import{_ as D}from"./index-cTDpMoY0.js";const L={name:"CensorshipCheck",setup(){const s=m(),r=f(()=>s.state.isDarkMode),i=f(()=>s.state.isMobile);return{isDarkMode:r,isMobile:i}},data(){return{highRiskCountries:["CN","RU","TR","SA"],censorshipResults:[],censorshipCheckStatus:"idle",isBlocked:!1,isDown:!1,blockedCountries:[],queryURL:"",errorMsg:""}},methods:{validateInput(s){s.match(/^https?:\/\//)||(s="http://"+s);try{const i=new URL(s).hostname;if(i.match(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i))return i}catch{}return this.errorMsg=this.$t("censorshipcheck.invalidURL"),null},onSubmit(){this.$trackEvent("Section","StartClick","CensorshipCheck"),this.errorMsg="",this.censorshipResults=[],this.censorshipCheckStatus="idle",this.isBlocked=!1,this.isDown=!1,this.blockedCountries=[];const s=this.validateInput(this.queryURL);s&&this.startHttpCheck(s)},startHttpCheck(){this.$trackEvent("Section","StartClick","CensorshipCheck");const s=this.validateInput(this.queryURL);if(!s)return;let r=0;const i=async()=>{this.censorshipCheckStatus="running";try{const t=await fetch("https://api.globalping.io/v1/measurements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({locations:[{country:"CN",limit:2},{country:"RU",limit:2},{country:"TR",limit:2},{country:"SA",limit:2},{country:"JP"},{country:"US"},{country:"CA"},{country:"IT"},{country:"FI"},{country:"AU"},{country:"FR"},{country:"DE"}],target:s,type:"http",measurementOptions:{request:{host:s,path:"/",method:"HEAD"},port:443,protocol:"HTTPS"}})});if(!t.ok)throw new Error(`HTTP error! status: ${t.status}`);return await t.json()}catch(t){console.error("Error sending HTTP request:",t),this.errorMsg=this.$t("censorshipcheck.fetchError")}},h=async t=>{try{const a=await fetch(`https://api.globalping.io/v1/measurements/${t}`);if(!a.ok)throw new Error(`HTTP error! status: ${a.status}`);const o=await a.json();this.processHttpResults(o),o.status==="in-progress"&&r<5?(setTimeout(()=>h(t),3e3),r++):this.censorshipResults.length===0?(this.censorshipCheckStatus="error",this.errorMsg=this.$t("censorshipcheck.fetchError")):(this.correctResult(),this.calResult(this.censorshipResults),this.censorshipCheckStatus="finished")}catch(a){console.error("Error fetching HTTP results:",a)}};i().then(t=>{t&&t.id&&setTimeout(()=>{h(t.id)},3e3)})},processHttpResults(s){const r=s.results.filter(i=>i.result.status==="finished"||i.result.status==="failed"||i.result.status==="in-progress").filter(i=>i.result.rawOutput!==null).map(i=>({country:i.probe.country,city:i.probe.city,network:i.probe.network,status:i.result.status,headers:i.result.rawHeaders?"OK":""}));this.censorshipResults=r},correctResult(){this.censorshipResults.forEach(s=>{s.status==="in-progress"&&(s.status="failed")}),this.censorshipResults=[...this.censorshipResults.sort((s,r)=>{const i=this.highRiskCountries.indexOf(s.country),h=this.highRiskCountries.indexOf(r.country);return i!==-1&&h!==-1?i-h:i!==-1?-1:h!==-1?1:s.country.localeCompare(r.country)})]},calResult(s){let r=[];this.highRiskCountries.forEach(t=>{s.filter(o=>o.country===t).every(o=>o.status==="failed"&&o.headers==="")&&r.push(t)});const i=s.filter(t=>!this.highRiskCountries.includes(t.country));i.filter(t=>t.status==="failed"&&t.headers==="").length>i.length/2?(r=[],this.isBlocked=!1,this.isDown=!0):this.isBlocked=r.length>0,this.blockedCountries=r},beforeEnter(s){s.style.height="0"},enter(s,r){s.classList.add("collapsing"),s.style.height="fit-content",s.addEventListener("transitionend",r)},leave(s,r){s.style.height="0",s.addEventListener("transitionend",r)}}},y=s=>(T("data-v-3a1d23a2"),s=s(),E(),s),M={class:"mtr-test-section mb-4"},B={class:"jn-title2"},U={class:"text-secondary"},H={class:"row"},j={class:"col-12 mb-3"},N={class:"card-body"},q={class:"col-12 col-md-auto"},I={for:"queryURL",class:"col-form-label"},O={class:"input-group mb-2 mt-2"},P=["disabled","placeholder"],A=["disabled"],F={key:0},z={key:1,class:"spinner-grow spinner-grow-sm","aria-hidden":"true"},V={class:"jn-placeholder"},x={key:0,class:"text-danger"},K={key:0,id:"censorshipresult",class:"row"},G={class:"col-md-6 col-12"},J={class:"fs-4 alert alert-info"},Q={class:"table-responsive text-nowrap"},W={scope:"col"},X={scope:"col"},Y={scope:"col"},Z={scope:"col"},$={key:0,class:"spinner-border spinner-border-sm","aria-hidden":"true"},ss={class:"col-md-6 col-12"},es={class:"fs-4 alert alert-success"},ts={class:"table-responsive text-nowrap"},os={scope:"col"},rs={scope:"col"},is={scope:"col"},ns={scope:"col"},cs={key:0,class:"spinner-border spinner-border-sm","aria-hidden":"true"},ls={key:0},hs=["data-bs-theme"],as={key:0},ds=y(()=>e("i",{class:"bi bi-emoji-frown"},null,-1)),us={key:1},ps={key:0},ks=y(()=>e("i",{class:"bi bi-emoji-smile"},null,-1)),ys={key:1},fs=y(()=>e("i",{class:"bi bi-emoji-expressionless"},null,-1)),_s={class:"opacity-75 fst-italic"};function bs(s,r,i,h,t,a){return l(),c("div",M,[e("div",B,[e("h2",{id:"CensorshipCheck",class:d({"mobile-h2":h.isMobile})},"🚧 "+n(s.$t("censorshipcheck.Title")),3)]),e("div",U,[e("p",null,n(s.$t("censorshipcheck.Note")),1)]),e("div",H,[e("div",j,[e("div",{class:d(["card jn-card",{"dark-mode dark-mode-border":h.isDarkMode}])},[e("div",N,[e("div",q,[e("label",I,n(s.$t("censorshipcheck.Note2")),1)]),e("div",O,[g(e("input",{type:"text",class:d(["form-control",{"dark-mode":h.isDarkMode}]),disabled:t.censorshipCheckStatus==="running",placeholder:s.$t("censorshipcheck.Placeholder"),"onUpdate:modelValue":r[0]||(r[0]=o=>t.queryURL=o),onKeyup:r[1]||(r[1]=R((...o)=>a.onSubmit&&a.onSubmit(...o),["enter"])),name:"queryURL",id:"queryURL","data-1p-ignore":""},null,42,P),[[C,t.queryURL]]),e("button",{class:"btn btn-primary",onClick:r[2]||(r[2]=(...o)=>a.onSubmit&&a.onSubmit(...o)),disabled:t.censorshipCheckStatus==="running"},[t.censorshipCheckStatus!=="running"?(l(),c("span",F,n(s.$t("censorshipcheck.Run")),1)):(l(),c("span",z))],8,A)]),e("div",V,[t.errorMsg?(l(),c("p",x,n(t.errorMsg),1)):u("",!0)]),t.censorshipResults.length>0?(l(),c("div",K,[e("div",G,[e("h3",J,n(s.$t("censorshipcheck.TestGroup")),1),e("div",Q,[e("table",{class:d(["table table-hover",{"table-dark":h.isDarkMode}])},[e("thead",null,[e("tr",null,[e("th",W,n(s.$t("censorshipcheck.Country")),1),e("th",X,n(s.$t("censorshipcheck.Status")),1),e("th",Y,n(s.$t("censorshipcheck.City")),1),e("th",Z,n(s.$t("censorshipcheck.Network")),1)])]),e("tbody",null,[(l(!0),c(_,null,b(t.censorshipResults.filter(o=>t.highRiskCountries.includes(o.country)),(o,k)=>(l(),c("tr",{key:o.country+"-"+o.city+"-"+k},[e("td",null,[e("span",{class:d("jn-fl fi fi-"+o.country.toLowerCase())},null,2),p(" "+n(o.country),1)]),e("td",null,[e("i",{class:d(["bi",{"bi-x-circle-fill text-danger":o.status==="failed","bi-check-circle-fill text-success":o.status==="finished"}])},null,2),o.status==="in-progress"?(l(),c("span",$)):u("",!0)]),e("td",null,n(o.city),1),e("td",null,n(o.network),1)]))),128))])],2)])]),e("div",ss,[e("h3",es,n(s.$t("censorshipcheck.ControlGroup")),1),e("div",ts,[e("table",{class:d(["table table-hover",{"table-dark":h.isDarkMode}])},[e("thead",null,[e("tr",null,[e("th",os,n(s.$t("censorshipcheck.Country")),1),e("th",rs,n(s.$t("censorshipcheck.Status")),1),e("th",is,n(s.$t("censorshipcheck.City")),1),e("th",ns,n(s.$t("censorshipcheck.Network")),1)])]),e("tbody",null,[(l(!0),c(_,null,b(t.censorshipResults.filter(o=>!t.highRiskCountries.includes(o.country)),(o,k)=>(l(),c("tr",{key:o.country+"-"+o.city+"-"+k},[e("td",null,[e("span",{class:d("jn-fl fi fi-"+o.country.toLowerCase())},null,2),p(" "+n(o.country),1)]),e("td",null,[e("i",{class:d(["bi",{"bi-x-circle-fill text-danger":o.status==="failed","bi-check-circle-fill text-success":o.status==="finished"}])},null,2),o.status==="in-progress"?(l(),c("span",cs)):u("",!0)]),e("td",null,n(o.city),1),e("td",null,n(o.network),1)]))),128))])],2)])])])):u("",!0),v(S,{onBeforeEnter:a.beforeEnter,onEnter:a.enter,onLeave:a.leave},{default:w(()=>[t.censorshipCheckStatus==="finished"?(l(),c("div",ls,[e("div",{class:d(["alert",{"alert-info":t.isDown,"alert-danger":t.isBlocked,"alert-success":!t.isBlocked&&!t.isDown}]),"data-bs-theme":h.isDarkMode?"dark":""},[t.isBlocked?(l(),c("span",as,[ds,p(" "+n(s.$t("censorshipcheck.isBlocked")),1)])):(l(),c("span",us,[t.isDown?(l(),c("span",ys,[fs,p(" "+n(s.$t("censorshipcheck.isDown")),1)])):(l(),c("span",ps,[ks,p(" "+n(s.$t("censorshipcheck.notBlocked")),1)]))])),e("span",_s,"( "+n(s.$t("censorshipcheck.Note3"))+" )",1)],10,hs)])):u("",!0)]),_:1},8,["onBeforeEnter","onEnter","onLeave"])])],2)])])])}const Cs=D(L,[["render",bs],["__scopeId","data-v-3a1d23a2"]]);export{Cs as default};