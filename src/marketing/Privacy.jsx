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
.orb{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0}
.o1{width:560px;height:560px;background:var(--brand);top:-180px;right:-120px;opacity:.13}
.o2{width:380px;height:380px;background:var(--soft);bottom:60px;left:-80px;opacity:.28}

nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(253,249,255,.88);backdrop-filter:blur(18px);border-bottom:1px solid var(--border);padding:0 48px;height:66px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-name{font-weight:800;font-style:italic;font-size:18px;letter-spacing:.04em;color:var(--deep)}
.btn-p{padding:10px 20px;background:var(--brand);color:#fff;border:none;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:700;letter-spacing:.06em;border-radius:8px;box-shadow:0 4px 16px rgba(152,18,180,.3);transition:all .3s;text-decoration:none;display:inline-block}
.btn-p:hover{background:var(--deep);transform:translateY(-1px)}

.page{position:relative;z-index:1;padding:120px 48px 88px;max-width:800px;margin:0 auto}

.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:10.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--brand);margin-bottom:20px}
.eline{width:24px;height:2px;background:var(--brand);border-radius:1px}

h1{font-size:clamp(32px,4.5vw,58px);font-weight:300;line-height:1.1;color:var(--text-hi);margin-bottom:10px;letter-spacing:-.01em}
h1 em{font-style:italic;font-weight:900;color:var(--deep)}

.meta{font-size:12px;font-weight:300;color:var(--text-lo);letter-spacing:.08em;margin-bottom:52px;padding-bottom:28px;border-bottom:1px solid var(--border)}

.section{margin-bottom:44px}
h2{font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--deep);margin-bottom:14px;display:flex;align-items:center;gap:10px}
h2::before{content:'';width:14px;height:2px;background:var(--brand);border-radius:1px;flex-shrink:0}
p{font-size:14.5px;font-weight:300;color:var(--text-md);line-height:1.9;margin-bottom:12px}
ul{list-style:none;margin:10px 0 12px 0}
ul li{font-size:14px;font-weight:300;color:var(--text-md);line-height:1.85;padding:3px 0;display:flex;align-items:flex-start;gap:9px}
ul li::before{content:'▸';color:var(--brand);font-size:9px;flex-shrink:0;margin-top:6px}
a{color:var(--brand);font-weight:600;text-decoration:none}
a:hover{text-decoration:underline}

.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:28px 32px;margin-bottom:44px;position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--brand),var(--soft))}

footer{position:relative;z-index:1;border-top:1px solid var(--border);padding:28px 48px;background:var(--surface);margin-top:0}
.fi2{max-width:1160px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.fcopy{font-size:12px;font-weight:300;color:var(--text-lo)}
.fll{display:flex;gap:22px}
.fll a{font-size:10.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-lo);text-decoration:none;transition:color .25s}
.fll a:hover{color:var(--brand)}

@media(max-width:768px){
  nav{padding:0 20px}
  .page{padding:100px 22px 64px}
  footer{padding:28px 22px}
  .fi2{flex-direction:column;gap:14px;text-align:center}
}
`;

export default function Privacy() {
  return (
    <>
      <style>{G}</style>
      <div className="orb o1" />
      <div className="orb o2" />

      <nav>
        <a href="/" className="nav-logo">
          <img src="/Logo(1)_transparent.png" alt="E-Diary" style={{height:36}} />
        </a>
        <a href="/" className="btn-p">← Back to Home</a>
      </nav>

      <div className="page">
        <div className="eyebrow"><span className="eline"/>Legal</div>
        <h1>Privacy <em>Policy</em></h1>
        <p className="meta">Last updated: January 2026</p>

        <div className="card">
          <p>We take your privacy seriously. This policy explains what data we collect, why we collect it, and how we protect it. We only collect what we actually need.</p>
        </div>

        <div className="section">
          <h2>Who We Are</h2>
          <p>E-Diary is a school management platform. You can reach us at <a href="mailto:mia5ko@proton.me">mia5ko@proton.me</a>.</p>
        </div>

        <div className="section">
          <h2>What We Collect</h2>
          <p>When you use our website or contact us, we may collect:</p>
          <ul>
            <li>Your name and email address when you fill out the contact form</li>
            <li>The content of messages you send us</li>
            <li>Basic usage data such as pages visited and time spent (via analytics, if enabled)</li>
            <li>Technical data such as browser type and IP address for security purposes</li>
          </ul>
          <p>We do not collect payment information directly — any transactions are handled by trusted third-party processors.</p>
        </div>

        <div className="section">
          <h2>How We Use Your Data</h2>
          <p>We use the information you provide solely to:</p>
          <ul>
            <li>Respond to your inquiries and project requests</li>
            <li>Provide and improve our services</li>
            <li>Send relevant updates if you've opted in</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We never sell your data. We never share it with advertisers. Full stop.</p>
        </div>

        <div className="section">
          <h2>Third-Party Services</h2>
          <p>Our website uses the following third-party services which may process your data:</p>
          <ul>
            <li><strong style={{color:"var(--deep)"}}>EmailJS</strong> — to route contact form submissions to our inbox</li>
            <li><strong style={{color:"var(--deep)"}}>Google Fonts</strong> — to load our site typography (Montserrat)</li>
          </ul>
          <p>Each of these services has their own privacy policy governing their data practices.</p>
        </div>

        <div className="section">
          <h2>Cookies</h2>
          <p>Our website uses minimal cookies necessary for basic functionality. We do not use tracking cookies or advertising cookies. You can disable cookies in your browser settings without affecting your ability to use the site.</p>
        </div>

        <div className="section">
          <h2>Your Rights</h2>
          <p>Under GDPR and applicable Serbian data protection law, you have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Request correction or deletion of your data</li>
            <li>Object to how we process your data</li>
            <li>Request that we restrict processing of your data</li>
            <li>Lodge a complaint with your local data protection authority</li>
          </ul>
          <p>To exercise any of these rights, email us at <a href="mailto:mia5ko@proton.me">mia5ko@proton.me</a> and we'll respond within 30 days.</p>
        </div>

        <div className="section">
          <h2>Data Retention</h2>
          <p>We retain contact form submissions for up to 12 months. If you become a client, we retain project-related communications for the duration of the engagement plus 3 years for legal and accounting purposes.</p>
        </div>

        <div className="section">
          <h2>Security</h2>
          <p>We use industry-standard practices to protect your data — encrypted connections (HTTPS), secure email, and limited access controls. No system is 100% secure, but we take reasonable and proportionate measures.</p>
        </div>

        <div className="section">
          <h2>Changes to This Policy</h2>
          <p>We may update this policy occasionally. When we do, we'll update the date at the top of this page. Continued use of our site after changes constitutes acceptance of the updated policy.</p>
        </div>

        <div className="section">
          <h2>Contact</h2>
          <p>Questions about this policy? Reach us at <a href="mailto:mia5ko@proton.me">mia5ko@proton.me</a> — we're a small studio and we actually read our emails.</p>
        </div>
      </div>

      <footer>
        <div className="fi2">
          <a href="/" className="nav-logo">
            <img src="//Logo(1)_transparent.png" alt="E-Diary" style={{height:26}} />
          </a>
          <p className="fcopy">© 2026 E-Diary</p>
          <div className="fll">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
      </footer>
    </>
  );
}
