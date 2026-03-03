import { useState, useEffect } from "react";
import emailjs from '@emailjs/browser';

// ============================================================================
// AKIO — Modern Light Theme
// EmailJS: service_kdua8yu, template_m21km6g, XGJ_fnnjHMkDZU2UM
// ============================================================================

// Initialize EmailJS
emailjs.init('XGJ_fnnjHMkDZU2UM');

const copy = {
  en: {
    nav: ["Services", "Products", "Story", "About", "Contact"],
    cta: "Get in Touch",
    eyebrow: "Custom Software · Belgrade",
    h1a: "We don't just",
    h1b: "build software.",
    h1c: "We summon it.",
    hero_sub: "From schools to studios, clinics to cafes — beautifully crafted software that fits your world. No templates. No compromises.",
    btn1: "See Our Work",
    btn2: "Let's Talk",
    svc_label: "What We Do",
    svc_h: "Services that",
    svc_em: "transform",
    svc_sub: "We don't just write code — we solve problems and create experiences.",
    svcs: [
      { n:"01", icon:"⬡", t:"Custom Development", d:"Bespoke web & mobile apps built exactly to your specs. React, Node, Flutter — we speak your tech language." },
      { n:"02", icon:"◈", t:"UI/UX Design", d:"Interfaces your users will love. We make complex things feel simple, intuitive, and beautiful." },
      { n:"03", icon:"⟡", t:"SaaS Products", d:"Multi-tenant platforms with subscriptions, analytics, and everything you need to scale confidently." },
    ],
    prd_label: "Our Products",
    prd_h: "Ready-to-use",
    prd_em: "solutions",
    prd_sub: "Battle-tested products you can start using today.",
    fp_badge: "Flagship Product",
    fp_title: "SchoolHub",
    fp_desc: "Complete school management — grades, attendance, homework, parent portal, admissions. Cambridge curriculum ready and built to scale with your institution.",
    fp_feats: ["Multi-tenant SaaS architecture","Custom branding per school","Parent & Teacher portals","Cambridge grading system","Admissions management"],
    fp_btn: "Get Started",
    future: [
      { icon:"💃", tag:"Dance · Yoga · Fitness", name:"Studio Hub" },
      { icon:"🦷", tag:"Dental · Medical", name:"Clinic OS" },
      { icon:"🏢", tag:"Real Estate", name:"Property Suite" },
    ],
    soon: "Coming Soon",
    story_label: "The Name",
    story_h: "Why",
    story_em: "Akio?",
    story: [
      "It started with a spell.",
      "When we were thinking about what to call this studio, we kept coming back to one idea: software should feel like magic. Not in a vague, hand-wavy sense — but in the sense that it should appear exactly when you need it, do exactly what you ask, and make you feel like anything is possible.",
      "That's when we thought of Accio — the summoning charm from Harry Potter. With a single word, you call what you need directly to you. No searching. No waiting. Just intention, and then: it's there.",
      "Akio is our version of that. A name built on the belief that great software doesn't complicate your life — it summons solutions into it. Every product we build, every line of code we write, carries that same intention: to bring exactly what you need, right to where you are.",
    ],
    why_label: "Why Us",
    why_h: "Your partner,",
    why_em: "not just your vendor",
    why: [
      { icon:"◈", t:"Fast Delivery", d:"From idea to launch in weeks, not months." },
      { icon:"⬡", t:"Reliable", d:"Built to scale with your business." },
      { icon:"⟡", t:"Always Available", d:"Ongoing support when you need it." },
      { icon:"✦", t:"Quality First", d:"Clean code, beautiful design." },
    ],
    abt_label: "The Maker",
    abt_h: "Hi, I'm",
    abt_em: "Mia 👋",
    abt_p1: "Full-stack developer based in Belgrade, Serbia. I believe great software should feel like magic — powerful yet effortless to use.",
    abt_p2: "After years of building solutions for schools and businesses, I founded Akio to bring enterprise-quality software to organizations of all sizes.",
    abt_open: "Open for projects",
    cnt_label: "Contact",
    cnt_h: "Let's build something",
    cnt_em: "amazing",
    cnt_sub: "Have a project in mind? I'd love to hear about it.",
    f_name:"Name", f_email:"Email", f_msg:"Message",
    f_ph_n:"Your name", f_ph_e:"you@example.com", f_ph_m:"Tell me about your project...",
    f_btn:"Send Message",
    f_sending:"Sending...",
    f_or:"Or email directly:",
    f_ok_h:"Message Sent!", f_ok_s:"I'll get back to you within 24 hours.",
    f_err:"Something went wrong. Please try again or email directly.",
    footer:"© 2026 Akio. Crafted with 💜 in Belgrade.",
    flinks:["Privacy","Terms"],
    lang_switch:"SR",
    uptime: "Uptime this month",
    add_school: "Add Your School",
    add_school_sub: "Get started today",
    tenants: "Active Tenants",
    add_tenant: "Add your school",
  },
  sr: {
    nav: ["Usluge","Proizvodi","Priča","O nama","Kontakt"],
    cta: "Kontaktiraj nas",
    eyebrow: "Studio za razvoj softvera · Beograd",
    h1a: "Mi ne samo",
    h1b: "pravimo softver.",
    h1c: "Mi ga prizivamo.",
    hero_sub: "Od škola do studija, klinika do kafića — pažljivo dizajnirani softver koji odgovara tvom svetu. Bez šablona. Bez kompromisa.",
    btn1: "Pogledaj Radove",
    btn2: "Razgovarajmo",
    svc_label: "Šta Radimo",
    svc_h: "Usluge koje",
    svc_em: "transformišu",
    svc_sub: "Ne pišemo samo kod — rešavamo probleme i kreiramo iskustva.",
    svcs: [
      { n:"01", icon:"⬡", t:"Custom Razvoj", d:"Web i mobilne aplikacije po meri. React, Node, Flutter — govorimo tvoj tehnički jezik." },
      { n:"02", icon:"◈", t:"UI/UX Dizajn", d:"Interfejsi koje će tvoji korisnici obožavati. Pravimo kompleksno jednostavnim i lepim." },
      { n:"03", icon:"⟡", t:"SaaS Proizvodi", d:"Multi-tenant platforme sa pretplatama, analitikom i svim što ti treba za skaliranje." },
    ],
    prd_label: "Naši Proizvodi",
    prd_h: "Rešenja",
    prd_em: "odmah dostupna",
    prd_sub: "Provereni proizvodi koje možeš početi koristiti danas.",
    fp_badge: "Flagship Proizvod",
    fp_title: "SchoolHub",
    fp_desc: "Kompletno upravljanje školom — ocene, prisustvo, domaći, portal za roditelje, upis. Spreman za Cambridge nastavni plan i program.",
    fp_feats: ["Multi-tenant SaaS arhitektura","Prilagođen brending po školi","Portali za roditelje i nastavnike","Cambridge sistem ocenjivanja","Upravljanje upisom"],
    fp_btn: "Započni",
    future: [
      { icon:"💃", tag:"Ples · Joga · Fitnes", name:"Studio Hub" },
      { icon:"🦷", tag:"Stomatološki · Medicinski", name:"Clinic OS" },
      { icon:"🏢", tag:"Nekretnine", name:"Property Suite" },
    ],
    soon: "Uskoro",
    story_label: "Ime",
    story_h: "Zašto",
    story_em: "Akio?",
    story: [
      "Počelo je jednom čarolijom.",
      "Kada smo razmišljali kako da nazovemo ovaj studio, stalno smo se vraćali jednoj ideji: softver treba da se oseti kao magija. Ne u nejasnom smislu — već u smislu da treba da se pojavi tačno kada ti zatreba, uradi tačno ono što tražiš, i neka te navede da osećaš da je sve moguće.",
      "Tada smo pomislili na Accio — čaroliju prizivanja iz Harija Potera. Jednom jedinom rečju, dozivate ono što vam treba direktno do vas. Bez traženja. Bez čekanja. Samo namera, i onda: tu je.",
      "Akio je naša verzija toga. Ime izgrađeno na uverenju da dobar softver ne komplikuje tvoj život — već priziva rešenja u njega. Svaki proizvod koji napravimo nosi istu nameru: da donese tačno ono što ti treba, tamo gde se nalaziš.",
    ],
    why_label: "Zašto Mi",
    why_h: "Tvoj partner,",
    why_em: "ne samo prodavac",
    why: [
      { icon:"◈", t:"Brza Isporuka", d:"Od ideje do lansiranja za nedelje, ne mesece." },
      { icon:"⬡", t:"Pouzdanost", d:"Izgrađeno da raste sa tvojim biznisom." },
      { icon:"⟡", t:"Uvek Dostupni", d:"Trajna podrška kada ti zatreba." },
      { icon:"✦", t:"Kvalitet Prvo", d:"Čist kod, lep dizajn." },
    ],
    abt_label: "Osnivač",
    abt_h: "Zdravo, ja sam",
    abt_em: "Mia 👋",
    abt_p1: "Full-stack developer iz Beograda. Verujem da dobar softver treba da se oseti kao magija — moćan, ali lak za korišćenje.",
    abt_p2: "Nakon godina izgradnje rešenja za škole i preduzeća, osnovala sam Akio da donesem enterprise-kvalitetni softver organizacijama svih veličina.",
    abt_open: "Slobodna za projekte",
    cnt_label: "Kontakt",
    cnt_h: "Hajde da izgradimo nešto",
    cnt_em: "neverovatno",
    cnt_sub: "Imaš projekat na umu? Volela bih da čujem sve o njemu.",
    f_name:"Ime", f_email:"Imejl", f_msg:"Poruka",
    f_ph_n:"Tvoje ime", f_ph_e:"ti@primer.com", f_ph_m:"Ispričaj mi o svom projektu...",
    f_btn:"Pošalji Poruku",
    f_sending:"Šaljem...",
    f_or:"Ili piši direktno:",
    f_ok_h:"Poruka Poslata!", f_ok_s:"Odgovorićemo u roku od 24 sata.",
    f_err:"Nešto nije u redu. Pokušaj ponovo ili piši direktno.",
    footer:"© 2026 Akio. Napravljeno sa 💜 u Beogradu.",
    flinks:["Privatnost","Uslovi"],
    lang_switch:"EN",
    uptime: "Dostupnost ovog meseca",
    add_school: "Dodaj Školu",
    add_school_sub: "Počni danas",
    tenants: "Aktivni Klijenti",
    add_tenant: "Dodaj svoju školu",
  }
};

const G = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --brand:#9812b4;--soft:#e1c3ef;--deep:#55046d;
  --bg:#fdf9ff;--bg2:#f5effe;--surface:#fff;
  --border:#ead5f5;--text-hi:#1a0022;--text-md:#6b3d7d;--text-lo:#a07db0;
  --font:'Montserrat',sans-serif;
}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text-hi);font-family:var(--font);font-weight:300;overflow-x:hidden;line-height:1.65}
body::after{content:'';position:fixed;inset:0;background-image:radial-gradient(var(--soft) 1px,transparent 1px);background-size:30px 30px;opacity:0.22;pointer-events:none;z-index:0}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--brand);border-radius:2px}

/* orbs */
.orb{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0}
.o1{width:560px;height:560px;background:var(--brand);top:-180px;right:-120px;opacity:.13}
.o2{width:380px;height:380px;background:var(--soft);bottom:60px;left:-80px;opacity:.28}

/* nav */
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(253,249,255,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);padding:0 48px;height:66px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-img{height:38px;width:auto;transition:transform .3s}
.logo-img:hover{transform:scale(1.05)}
.logo-name{font-weight:800;font-style:italic;font-size:18px;letter-spacing:.04em;color:var(--deep)}
.nav-right{display:flex;align-items:center;gap:28px}
.nav-links{display:flex;gap:26px;list-style:none}
.nav-links a{font-size:12px;font-weight:600;letter-spacing:.05em;color:var(--text-md);text-decoration:none;transition:color .25s}
.nav-links a:hover{color:var(--brand)}
.lang-btn{font-size:11px;font-weight:700;letter-spacing:.14em;padding:6px 14px;background:transparent;border:1.5px solid var(--border);border-radius:20px;color:var(--text-md);cursor:pointer;transition:all .25s;font-family:var(--font)}
.lang-btn:hover{border-color:var(--brand);color:var(--brand);background:rgba(152,18,180,.04)}
.btn-p{padding:10px 20px;background:var(--brand);color:#fff;border:none;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:700;letter-spacing:.06em;border-radius:8px;box-shadow:0 4px 16px rgba(152,18,180,.3);transition:all .3s;text-decoration:none;display:inline-block}
.btn-p:hover{background:var(--deep);box-shadow:0 6px 24px rgba(85,4,109,.4);transform:translateY(-1px)}
.btn-o{padding:10px 20px;background:transparent;color:var(--text-md);border:1.5px solid var(--border);cursor:pointer;font-family:var(--font);font-size:12px;font-weight:600;letter-spacing:.06em;border-radius:8px;transition:all .3s;text-decoration:none;display:inline-block}
.btn-o:hover{border-color:var(--brand);color:var(--brand);background:rgba(152,18,180,.04)}

/* hero */
.hero{position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;padding:108px 48px 80px}
.hero-in{max-width:1160px;margin:0 auto;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--brand);margin-bottom:24px}
.eline{width:24px;height:2px;background:var(--brand);border-radius:1px}
h1.ht{font-size:clamp(38px,5.2vw,68px);font-weight:300;line-height:1.1;color:var(--text-hi);margin-bottom:24px;letter-spacing:-.01em}
h1.ht strong{font-weight:900;font-style:italic;color:var(--deep);display:block}
h1.ht em{font-style:italic;font-weight:800;background:linear-gradient(135deg,var(--brand),var(--deep));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;display:block}
.hero-sub{font-size:15.5px;font-weight:300;color:var(--text-md);line-height:1.8;max-width:450px;margin-bottom:36px}
.hero-btns{display:flex;gap:12px;flex-wrap:wrap}

/* hero card */
.hcard{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:24px;box-shadow:0 16px 50px rgba(152,18,180,.09),0 2px 12px rgba(0,0,0,.04);position:relative}
.hcard::before{content:'';position:absolute;top:0;left:22px;right:22px;height:2px;background:linear-gradient(90deg,transparent,var(--brand),transparent);border-radius:1px}
.cbar{display:flex;align-items:center;gap:6px;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--border)}
.cdot{width:9px;height:9px;border-radius:50%}
.clabel{margin-left:auto;font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--text-lo)}
.mrow{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:9px;border:1px solid transparent;margin-bottom:7px;cursor:default;transition:all .25s}
.mrow:hover{background:var(--bg2);border-color:var(--border)}
.mavt{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:800;letter-spacing:.03em}
.mn{font-size:12.5px;font-weight:700;color:var(--text-hi);margin-bottom:1px}
.ms{font-size:10.5px;font-weight:300;color:var(--text-lo)}
.mpill{font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:20px}
.cstat{margin-top:12px;padding:11px 13px;background:var(--bg2);border-radius:9px;display:flex;justify-content:space-between;align-items:center}
.cslbl{font-size:10.5px;font-weight:300;color:var(--text-lo)}
.csval{font-size:14px;font-weight:800;color:#10b981}

/* marquee */
.mq-wrap{position:relative;z-index:1;background:var(--brand);overflow:hidden;padding:12px 0}
.mq-track{display:flex;width:max-content;animation:mq 28s linear infinite}
@keyframes mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.mq-item{display:flex;align-items:center;gap:9px;padding:0 32px;font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.7);white-space:nowrap}
.mq-star{color:rgba(255,255,255,.45);font-size:7px}

/* section base */
section{position:relative;z-index:1}
.si{max-width:1160px;margin:0 auto;padding:88px 48px}
.slbl{display:flex;align-items:center;gap:10px;font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--brand);margin-bottom:16px}
.slbl::before{content:'';width:18px;height:2px;background:var(--brand);border-radius:1px}
h2.sh{font-size:clamp(28px,3.8vw,50px);font-weight:300;line-height:1.12;color:var(--text-hi);margin-bottom:16px;letter-spacing:-.01em}
h2.sh strong{font-weight:900;font-style:italic;color:var(--deep)}
h2.sh em{font-style:italic;font-weight:900;color:var(--brand)}
.ssub{font-size:15.5px;font-weight:300;color:var(--text-md);max-width:480px;line-height:1.78;margin-bottom:52px}

/* services */
.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.sc{background:var(--surface);border:1px solid var(--border);border-radius:15px;padding:38px 30px;transition:all .35s;position:relative;overflow:hidden}
.sc::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--brand),var(--soft));transform:scaleX(0);transform-origin:left;transition:transform .35s}
.sc:hover{box-shadow:0 10px 36px rgba(152,18,180,.11);transform:translateY(-4px)}
.sc:hover::after{transform:scaleX(1)}
.snum{font-size:10.5px;font-weight:700;letter-spacing:.2em;color:var(--text-lo);margin-bottom:20px}
.sico{width:48px;height:48px;border-radius:11px;background:var(--bg2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:19px;margin-bottom:20px;transition:background .3s}
.sc:hover .sico{background:var(--soft)}
.stit{font-size:16px;font-weight:700;color:var(--deep);margin-bottom:11px}
.sdesc{font-size:13.5px;font-weight:300;color:var(--text-md);line-height:1.75}

/* products */
.pb{background:var(--bg2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.fpb{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:52px;box-shadow:0 8px 36px rgba(152,18,180,.07);position:relative;overflow:hidden;margin-bottom:22px}
.fpb::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--brand),var(--soft))}
.fpbg{position:absolute;top:16px;right:36px;font-size:150px;font-weight:900;font-style:italic;color:rgba(152,18,180,.04);line-height:1;pointer-events:none;letter-spacing:-.05em}
.fpg{display:grid;grid-template-columns:1fr 1fr;gap:54px;align-items:start}
.fptag{display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:20px;background:rgba(152,18,180,.07);border:1px solid rgba(152,18,180,.2);font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--brand);margin-bottom:16px}
.fph3{font-size:36px;font-weight:900;font-style:italic;color:var(--deep);margin-bottom:13px;letter-spacing:-.01em}
.fpdesc{font-size:14.5px;font-weight:300;color:var(--text-md);line-height:1.8;margin-bottom:26px}
.fpul{list-style:none;margin-bottom:30px}
.fpul li{display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:400;color:var(--text-md);padding:4px 0}
.fpul li::before{content:'▸';color:var(--brand);font-size:9px;flex-shrink:0}
.fpp{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:20px}
.fppt{font-size:9.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--text-lo);margin-bottom:14px}
.pr{display:flex;align-items:center;justify-content:space-between;padding:11px;border-radius:9px;margin-bottom:7px;border:1px solid transparent;transition:all .25s;cursor:default}
.pr:hover{background:var(--surface);border-color:var(--border)}
.fg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.fc{background:var(--surface);border:1.5px dashed var(--border);border-radius:13px;padding:26px 20px;text-align:center;transition:all .3s}
.fc:hover{border-color:var(--soft);background:var(--bg2)}
.fci{font-size:26px;margin-bottom:9px;opacity:.6}
.fct{font-size:9.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--text-lo);margin-bottom:5px}
.fcn{font-size:13.5px;font-weight:700;color:var(--text-lo);margin-bottom:5px}
.fcs{font-size:9.5px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--soft)}

/* story */
.stbg{background:var(--surface);border-top:1px solid var(--border)}
.stgrid{max-width:1160px;margin:0 auto;padding:88px 48px;display:grid;grid-template-columns:1fr 1.45fr;gap:72px;align-items:center}
.stvis{background:linear-gradient(135deg,var(--bg2),rgba(225,195,239,.5));border-radius:18px;padding:52px 36px;border:1px solid var(--border);text-align:center;position:relative;overflow:hidden}
.stglow{position:absolute;width:200px;height:200px;background:radial-gradient(circle,rgba(152,18,180,.18),transparent 70%);border-radius:50%;top:-60px;right:-60px;filter:blur(40px)}
.stspell{font-size:58px;font-weight:900;font-style:italic;color:var(--deep);letter-spacing:-.02em;line-height:1;margin-bottom:8px}
.stsub{font-size:11px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:var(--brand);margin-bottom:24px}
.stquote{padding:16px;background:rgba(255,255,255,.75);border-radius:11px;backdrop-filter:blur(6px);font-size:13px;font-weight:300;color:var(--text-md);line-height:1.7;font-style:italic}
.sttxt p{font-size:15px;font-weight:300;color:var(--text-md);line-height:1.9;margin-bottom:16px}
.sttxt p:first-child{font-size:19px;font-weight:700;font-style:italic;color:var(--deep);line-height:1.5}

/* why */
.wb{background:var(--bg2);border-top:1px solid var(--border)}
.wg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;border-radius:14px;border:1px solid var(--border)}
.wc{background:var(--surface);padding:38px 26px;text-align:center;transition:background .3s;border-radius:12px;border:1px solid var(--border)}
.wc:hover{background:var(--bg2)}
.wi{font-size:26px;margin-bottom:14px;display:block}
.wt{font-size:14.5px;font-weight:700;color:var(--deep);margin-bottom:7px}
.wd{font-size:12.5px;font-weight:300;color:var(--text-lo);line-height:1.65}

/* about */
.abg{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center}
.afrm{aspect-ratio:1;background:linear-gradient(135deg,var(--bg2),rgba(225,195,239,.45));border:1px solid var(--border);border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.abgl{font-size:190px;font-weight:900;font-style:italic;color:rgba(152,18,180,.06);line-height:1;pointer-events:none}
.abav{position:absolute;width:86px;height:86px;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;font-size:38px;border:3px solid #fff;box-shadow:0 8px 28px rgba(152,18,180,.35)}
.abbdg{position:absolute;bottom:-10px;right:-10px;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:11px 14px}
.bopen{font-size:11.5px;font-weight:700;color:#10b981;display:flex;align-items:center;gap:5px}
.blbl{font-size:9.5px;font-weight:300;color:var(--text-lo);margin-bottom:3px;letter-spacing:.1em}

/* contact */
.cbg{background:var(--bg);border-top:1px solid var(--border)}
.cw{max-width:640px;margin:0 auto}
.cf{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:44px;box-shadow:0 8px 36px rgba(152,18,180,.07);position:relative;overflow:hidden}
.cf::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--brand),var(--soft))}
.fr2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.fg2{margin-bottom:14px}
.fl{display:block;font-size:10.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--text-lo);margin-bottom:6px}
.fi{width:100%;background:var(--bg2);border:1.5px solid var(--border);border-radius:8px;padding:11px 15px;color:var(--text-hi);font-family:var(--font);font-size:13.5px;font-weight:300;outline:none;transition:all .25s}
.fi:focus{border-color:var(--brand);background:#fff;box-shadow:0 0 0 3px rgba(152,18,180,.08)}
.fi::placeholder{color:var(--text-lo)}
.fsub{width:100%;padding:13px;background:var(--brand);color:#fff;border:none;cursor:pointer;font-family:var(--font);font-size:12.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-radius:8px;box-shadow:0 6px 22px rgba(152,18,180,.3);transition:all .3s;margin-top:8px}
.fsub:hover:not(:disabled){background:var(--deep);box-shadow:0 8px 28px rgba(85,4,109,.4);transform:translateY(-1px)}
.fsub:disabled{opacity:.7;cursor:not-allowed}
.fsucc{text-align:center;padding:44px 0}
.fsi{font-size:44px;margin-bottom:14px}
.fsh{font-size:21px;font-weight:900;font-style:italic;color:var(--deep);margin-bottom:9px}
.fss{font-size:14.5px;font-weight:300;color:var(--text-md)}
.ferr{text-align:center;padding:14px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.2);border-radius:8px;color:#dc2626;font-size:13px;margin-bottom:14px}
.for{text-align:center;margin-top:22px;font-size:12.5px;font-weight:300;color:var(--text-lo)}
.for a{color:var(--brand);text-decoration:none;font-weight:700}
.for a:hover{text-decoration:underline}

/* footer */
footer{position:relative;z-index:1;border-top:1px solid var(--border);padding:32px 48px;background:var(--surface)}
.fi2{max-width:1160px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.fcopy{font-size:12px;font-weight:300;color:var(--text-lo)}
.fll{display:flex;gap:22px}
.fll a{font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-lo);text-decoration:none;transition:color .25s}
.fll a:hover{color:var(--brand)}

/* fade in */
.fu{opacity:0;transform:translateY(26px);animation:fu .72s cubic-bezier(.22,1,.36,1) forwards}
@keyframes fu{to{opacity:1;transform:translateY(0)}}
.d1{animation-delay:.05s}.d2{animation-delay:.18s}.d3{animation-delay:.32s}.d4{animation-delay:.46s}.d5{animation-delay:.6s}

@media(max-width:900px){
  nav{padding:0 20px}
  .nav-links,.btn-p{display:none}
  .hero{padding:90px 22px 56px}
  .hero-in,.fpg,.stgrid,.abg{grid-template-columns:1fr;gap:36px}
  .si{padding:64px 22px}
  .sg,.fg,.wg{grid-template-columns:1fr}
  .wg{grid-template-columns:1fr 1fr}
  .fpb{padding:28px 20px}
  .fpbg{display:none}
  .fr2{grid-template-columns:1fr}
  .fi2{flex-direction:column;gap:14px;text-align:center}
  footer{padding:28px 22px}
}
`;

export default function AkioLanding() {
  const [lang, setLang] = useState("en");
  const [formState, setFormState] = useState('idle'); // idle, sending, success, error
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const t = copy[lang];
  const isEn = lang === "en";

  // Set document title
  useEffect(() => {
    document.title = "Akio · Custom Software Studio";
    
    // Update favicon
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = '/Logo(1)_transparent.png';
    document.head.appendChild(link);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState('sending');

    try {
      await emailjs.send(
        'service_kdua8yu',
        'template_z2w59yg',
        
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
          to_email: 'mia5ko@proton.me',
        }
      );
      setFormState('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('EmailJS error:', error);
      setFormState('error');
    }
  };

  const mqItems = isEn
    ? ["Custom Software","School Management","React & Node.js","Multi-tenant SaaS","UI/UX Design","Belgrade Serbia","Fast Delivery"]
    : ["Custom Softver","Upravljanje Školom","React & Node.js","Multi-tenant SaaS","UI/UX Dizajn","Beograd Srbija","Brza Isporuka"];

  return (
    <>
      <style>{G}</style>
      <div className="orb o1" />
      <div className="orb o2" />

      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <img src="/Logo(1)_transparent.png" alt="Akio" className="logo-img" />
        </a>
        <div className="nav-right">
          <ul className="nav-links">
            {t.nav.map((n,i)=>(
              <li key={i}><a href={["#services","#products","#story","#about","#contact"][i]}>{n}</a></li>
            ))}
          </ul>
          <button className="lang-btn" onClick={()=>setLang(l=>l==="en"?"sr":"en")}>{t.lang_switch}</button>
          <a href="#contact" className="btn-p">{t.cta}</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-in">
          <div>
            <div className="eyebrow fu d1"><span className="eline"/>{t.eyebrow}</div>
            <h1 className="ht fu d2">
              {t.h1a}
              <strong>{t.h1b}</strong>
              <em>{t.h1c}</em>
            </h1>
            <p className="hero-sub fu d3">{t.hero_sub}</p>
            <div className="hero-btns fu d4">
              <a href="#products" className="btn-p">{t.btn1} →</a>
              <a href="#contact" className="btn-o">{t.btn2}</a>
            </div>
          </div>

          <div className="hcard fu d5">
            <div className="cbar">
              <div className="cdot" style={{background:"#ff5f57"}}/>
              <div className="cdot" style={{background:"#ffbd2e"}}/>
              <div className="cdot" style={{background:"#28c941"}}/>
              <span className="clabel">SchoolHub · Admin</span>
            </div>
            {[
              {i:"GS",n:"Green School",s:isEn?"37 students":"37 učenika",c:"#10b981",p:isEn?"Active":"Aktivan",pc:"rgba(16,185,129,.1)",pt:"#10b981"},
              {i:"CA",n:"Cambridge Academy",s:isEn?"124 students":"124 učenika",c:"#9812b4",p:"Demo",pc:"rgba(152,18,180,.1)",pt:"#9812b4"},
              {i:"+",n:t.add_school,s:t.add_school_sub,c:"#e1c3ef",p:null,pc:null,pt:null},
            ].map((r,i)=>(
              <div key={i} className="mrow">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className="mavt" style={{background:`${r.c}1a`,color:r.c,border:`1px solid ${r.c}33`}}>{r.i}</div>
                  <div><div className="mn">{r.n}</div><div className="ms">{r.s}</div></div>
                </div>
                {r.p && <span className="mpill" style={{background:r.pc,color:r.pt}}>{r.p}</span>}
              </div>
            ))}
            <div className="cstat">
              <span className="cslbl">{t.uptime}</span>
              <span className="csval">99.9%</span>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="mq-wrap">
        <div className="mq-track">
          {[...Array(2)].flatMap((_,r)=>mqItems.map((item,i)=>(
            <div key={`${r}-${i}`} className="mq-item"><span className="mq-star">★</span>{item}</div>
          )))}
        </div>
      </div>

      {/* SERVICES */}
      <section id="services">
        <div className="si">
          <div className="slbl">{t.svc_label}</div>
          <h2 className="sh">{t.svc_h} <em>{t.svc_em}</em></h2>
          <p className="ssub">{t.svc_sub}</p>
          <div className="sg">
            {t.svcs.map((s,i)=>(
              <div key={i} className="sc">
                <div className="snum">{s.n}</div>
                <div className="sico">{s.icon}</div>
                <div className="stit">{s.t}</div>
                <p className="sdesc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="pb">
        <div className="si">
          <div className="slbl">{t.prd_label}</div>
          <h2 className="sh">{t.prd_h} <em>{t.prd_em}</em></h2>
          <p className="ssub">{t.prd_sub}</p>

          <div className="fpb">
            <div className="fpbg">S</div>
            <div className="fpg">
              <div>
                <div className="fptag">★ {t.fp_badge}</div>
                <h3 className="fph3">{t.fp_title}</h3>
                <p className="fpdesc">{t.fp_desc}</p>
                <ul className="fpul">{t.fp_feats.map((f,i)=><li key={i}>{f}</li>)}</ul>
                <a href="#contact" className="btn-p">{t.fp_btn} →</a>
              </div>
              <div>
                <div className="fpp">
                  <div className="fppt">{t.tenants}</div>
                  {[
                    {i:"GS",n:"Green School",s:isEn?"37 students":"37 učenika",c:"#10b981",st:isEn?"● Live":"● Uživo",stc:"#10b981"},
                    {i:"CA",n:"Cambridge Academy",s:isEn?"124 students":"124 učenika",c:"#9812b4",st:"◌ Demo",stc:"#9812b4"},
                  ].map((r,i)=>(
                    <div key={i} className="pr">
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div className="mavt" style={{background:`${r.c}1a`,color:r.c,border:`1px solid ${r.c}33`}}>{r.i}</div>
                        <div><div className="mn">{r.n}</div><div className="ms">{r.s}</div></div>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:r.stc}}>{r.st}</span>
                    </div>
                  ))}
                  <div style={{marginTop:12,padding:"11px 13px",background:"rgba(152,18,180,.05)",borderRadius:9,border:"1.5px dashed rgba(152,18,180,.2)",textAlign:"center",cursor:"pointer",fontSize:12.5,fontWeight:600,color:"var(--text-lo)"}}>
                    + {t.add_tenant}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="fg">
            {t.future.map((p,i)=>(
              <div key={i} className="fc">
                <div className="fci">{p.icon}</div>
                <div className="fct">{p.tag}</div>
                <div className="fcn">{p.name}</div>
                <div className="fcs">{t.soon}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STORY */}
      <section id="story" className="stbg">
        <div className="stgrid">
          <div>
            <div className="stvis">
              <div className="stglow"/>
              <div className="stspell">Accio</div>
              <div className="stsub">The Summoning Charm</div>
              <div className="stquote">
                {isEn
                  ? '"A single word. You call what you need — and it comes to you."'
                  : '"Jedna jedina reč. Dozovete ono što vam treba — i ono dolazi."'}
              </div>
            </div>
          </div>
          <div>
            <div className="slbl">{t.story_label}</div>
            <h2 className="sh">{t.story_h} <em>{t.story_em}</em></h2>
            <div className="sttxt">
              {t.story.map((p,i)=><p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="wb">
        <div className="si">
          <div style={{textAlign:"center",marginBottom:52}}>
            <div className="slbl" style={{justifyContent:"center"}}>{t.why_label}</div>
            <h2 className="sh" style={{textAlign:"center"}}>{t.why_h} <em>{t.why_em}</em></h2>
          </div>
          <div className="wg">
            {t.why.map((w,i)=>(
              <div key={i} className="wc">
                <span className="wi">{w.icon}</span>
                <div className="wt">{w.t}</div>
                <div className="wd">{w.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{borderTop:"1px solid var(--border)"}}>
        <div className="si">
          <div className="abg">
            <div>
              <div className="slbl">{t.abt_label}</div>
              <h2 className="sh">{t.abt_h} <em>{t.abt_em}</em></h2>
              <p style={{fontSize:14.5,fontWeight:300,color:"var(--text-md)",lineHeight:1.85,marginBottom:14}}>{t.abt_p1}</p>
              <p style={{fontSize:14.5,fontWeight:300,color:"var(--text-md)",lineHeight:1.85}}>{t.abt_p2}</p>
              <div style={{marginTop:22,display:"inline-flex",alignItems:"center",gap:7,padding:"7px 15px",background:"rgba(16,185,129,.07)",border:"1px solid rgba(16,185,129,.2)",borderRadius:20}}>
                <span style={{width:6,height:6,background:"#10b981",borderRadius:"50%",display:"inline-block"}}/>
                <span style={{fontSize:11.5,fontWeight:700,color:"#10b981"}}>{t.abt_open}</span>
              </div>
            </div>
            <div style={{position:"relative"}}>
              <div className="afrm">
                <div className="abgl">A</div>
                <div className="abav">👩‍💻</div>
              </div>
              <div className="abbdg">
                <div className="blbl">{isEn?"Location":"Lokacija"}</div>
                <div className="bopen">🇷🇸 Belgrade, Serbia</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="cbg">
        <div className="si">
          <div style={{textAlign:"center",marginBottom:44}}>
            <div className="slbl" style={{justifyContent:"center"}}>{t.cnt_label}</div>
            <h2 className="sh" style={{textAlign:"center"}}>{t.cnt_h} <em>{t.cnt_em}</em></h2>
            <p style={{fontSize:15.5,fontWeight:300,color:"var(--text-md)"}}>{t.cnt_sub}</p>
          </div>
          <div className="cw">
            <div className="cf">
              {formState === 'success' ? (
                <div className="fsucc">
                  <div className="fsi">✦</div>
                  <div className="fsh">{t.f_ok_h}</div>
                  <div className="fss">{t.f_ok_s}</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {formState === 'error' && (
                    <div className="ferr">{t.f_err}</div>
                  )}
                  <div className="fr2">
                    <div>
                      <label className="fl">{t.f_name}</label>
                      <input 
                        className="fi" 
                        type="text" 
                        placeholder={t.f_ph_n} 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="fl">{t.f_email}</label>
                      <input 
                        className="fi" 
                        type="email" 
                        placeholder={t.f_ph_e} 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="fg2">
                    <label className="fl">{t.f_msg}</label>
                    <textarea 
                      className="fi" 
                      rows={5} 
                      placeholder={t.f_ph_m} 
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="fsub"
                    disabled={formState === 'sending'}
                  >
                    {formState === 'sending' ? t.f_sending : `${t.f_btn} →`}
                  </button>
                </form>
              )}
            </div>
            <p className="for">{t.f_or} <a href="mailto:mia5ko@proton.me">mia5ko@proton.me</a></p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="fi2">
          <a href="#" className="nav-logo" style={{gap:9}}>
            <img src="/Logo(1)_transparent.pngg" alt="Akio" style={{height:28}} />
          </a>
          <p className="fcopy">{t.footer}</p>
          <div className="fll">
            <a href="/privacy">{t.flinks[0]}</a>
            <a href="/terms">{t.flinks[1]}</a>
          </div>
        </div>
      </footer>
    </>
  );
}