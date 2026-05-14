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

export default function Terms() {
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
        <h1>Terms of <em>Service</em></h1>
        <p className="meta">Last updated: January 2026</p>

        <div className="card">
          <p>By using this platform, you agree to these terms. We've written them in plain language — no legal maze. If something is unclear, just ask us.</p>
        </div>

        <div className="section">
          <h2>Who These Terms Apply To</h2>
          <p>These Terms of Service apply to all users of the E-Diary school management platform, including teachers, administrators, and parents.</p>
        </div>

        <div className="section">
          <h2>Using the Platform</h2>
          <p>You may use this platform for lawful purposes only. You agree not to:</p>
          <ul>
            <li>Use the platform in any way that violates applicable laws or regulations</li>
            <li>Attempt to gain unauthorized access to any part of our systems</li>
            <li>Share your account credentials with others</li>
            <li>Misrepresent your identity or affiliation</li>
          </ul>
        </div>

        <div className="section">
          <h2>E-Diary Platform</h2>
          <p>Use of the E-Diary platform is subject to your school's agreement. Key terms include:</p>
          <ul>
            <li>Data you enter into the platform remains yours at all times</li>
            <li>We do not share your institution's data with third parties</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>We provide reasonable uptime and will notify you of planned maintenance</li>
          </ul>
        </div>

        <div className="section">
          <h2>Limitation of Liability</h2>
          <p>The platform is provided in good faith. We are not liable for indirect, incidental, or consequential damages including lost profits or data loss.</p>
          <p>We build with care and diligence, but software is complex — we cannot guarantee that the platform will be entirely free of bugs or uninterrupted at all times.</p>
        </div>

        <div className="section">
          <h2>Governing Law</h2>
          <p>These terms are governed by the laws of the Republic of Serbia. Any disputes will be resolved in the competent courts of Belgrade, Serbia, unless otherwise agreed in a separate contract.</p>
        </div>

        <div className="section">
          <h2>Changes to These Terms</h2>
          <p>We may update these terms from time to time. We'll update the date at the top of this page when we do. Continued use of our website or services after changes means you accept the updated terms.</p>
        </div>

        <div className="section">
          <h2>Contact</h2>
          <p>Have a question about these terms? Email us at <a href="mailto:mia5ko@proton.me">mia5ko@proton.me</a> — we're a real small studio and we'll give you a real answer.</p>
        </div>
      </div>

      <footer>
        <div className="fi2">
          <a href="/" className="nav-logo">
            <img src="/Logo(1)_transparent.png" alt="E-Diary" style={{height:26}} />
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
