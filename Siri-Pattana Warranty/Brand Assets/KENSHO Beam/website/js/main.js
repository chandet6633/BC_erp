/* KENSHO Beam — Main JS */

// Navbar scroll hide/show
(function() {
  const nav = document.querySelector('.navbar');
  let last = 0;
  window.addEventListener('scroll', () => {
    const cur = window.pageYOffset;
    nav.style.transform = cur > last && cur > 80 ? 'translateY(-100%)' : 'translateY(0)';
    last = cur;
  });
})();

// Mobile hamburger
document.querySelector('.hamburger')?.addEventListener('click', function() {
  document.querySelector('.nav-links').classList.toggle('open');
  this.classList.toggle('active');
});

// Close mobile nav on link click
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
    document.querySelector('.hamburger')?.classList.remove('active');
  });
});

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObs.observe(el));

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    document.querySelectorAll('.faq-item').forEach(i => { if (i !== item) i.classList.remove('open'); });
    item.classList.toggle('open');
  });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const t = document.querySelector(a.getAttribute('href'));
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Counter animation for hero specs
function animateCounters() {
  document.querySelectorAll('.hero-spec .val[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = current.toLocaleString() + suffix;
    }, 30);
  });
}

const heroObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounters(); heroObs.unobserve(e.target); } });
}, { threshold: 0.3 });
const heroSpecs = document.querySelector('.hero-specs');
if (heroSpecs) heroObs.observe(heroSpecs);

// Series Selector
(function() {
  const state = { 1: null, 2: null, 3: null };
  const results = {
    // [budget][driving][bluetooth]
    low:  { city: { no: { s:'LX-15 · ピュアライト', n:'PureLite', r:'งบน้อย ขับในเมือง — PureLite ให้ความสว่าง 15,000lm ราคาเข้าถึงง่ายที่สุด พร้อม CANBUS Ready', p:'฿2,490' }, yes: { s:'LX-15 · ピュアライト', n:'PureLite', r:'งบประมาณจำกัด PureLite เป็นตัวเลือกที่ดีที่สุด ระบบ Bluetooth ต้องอัปเกรดรุ่น', p:'฿2,490' } }, mixed: { no: { s:'LX-15 · ピュアライト', n:'PureLite', r:'ขับผสม งบน้อย — PureLite ยังให้ความสว่างที่ดีกว่าหลอดเดิมมาก', p:'฿2,490' }, yes: { s:'LX-15 · ピュアライト', n:'PureLite', r:'งบจำกัด PureLite เป็นจุดเริ่มต้นที่ดี สามารถอัปเกรดภายหลัง', p:'฿2,490' } }, highway: { no: { s:'LX-15 · ピュアライト', n:'PureLite', r:'แม้งบน้อย PureLite ก็ยังสว่างกว่าหลอดเดิมมาก เป็นจุดเริ่มต้นที่ดี', p:'฿2,490' }, yes: { s:'LX-15 · ピュアライト', n:'PureLite', r:'งบจำกัด เริ่มที่ PureLite ก่อน', p:'฿2,490' } } },
    mid:  { city: { no: { s:'LX-20 · ターボフラックス', n:'TurboFlux ⭐ขายดีที่สุด', r:'ขับในเมือง งบกลาง — TurboFlux 20,000lm สมดุลสมบูรณ์แบบ คุ้มค่าสูงสุด รุ่นขายดีอันดับ 1', p:'฿3,490' }, yes: { s:'LX-20 · ターボフラックス', n:'TurboFlux', r:'งบกลาง ขับเมือง — TurboFlux เป็นตัวเลือกที่ดีที่สุด Bluetooth ต้องอัปเกรดเป็น LumiSync', p:'฿3,490' } }, mixed: { no: { s:'LX-20 · ターボフラックス', n:'TurboFlux ⭐ขายดีที่สุด', r:'ขับผสม — TurboFlux 20,000lm ตอบโจทย์ทั้งในเมืองและทางไกล ประสิทธิภาพสมดุล', p:'฿3,490' }, yes: { s:'LX-20 · ターボフラックス', n:'TurboFlux', r:'งบกลาง TurboFlux เหมาะสม หรืออัปเกรดเป็น LumiSync หากต้องการ Bluetooth', p:'฿3,490' } }, highway: { no: { s:'LX-20 · ターボフラックス', n:'TurboFlux', r:'ทางไกล งบกลาง — TurboFlux ยังสว่างมากในราคาที่จับต้องได้', p:'฿3,490' }, yes: { s:'LX-20 · ターボフラックス', n:'TurboFlux', r:'TurboFlux ดี หรืออัปเกรด LumiSync สำหรับ Bluetooth', p:'฿3,490' } } },
    high: { city: { no: { s:'LX-40 · ルミシンク', n:'LumiSync™', r:'งบสูง ขับเมือง — LumiSync ปรับสีแสงได้ 3000K–6500K มอบประสบการณ์ขับขี่ระดับพรีเมียม', p:'฿5,490' }, yes: { s:'LX-40 · ルミシンク', n:'LumiSync™', r:'นี่คือรุ่นที่ใช่! LumiSync Bluetooth RGB ปรับสีได้ผ่านแอป ไฟระดับ Flagship', p:'฿5,490' } }, mixed: { no: { s:'LX-30 · ハイパービーム', n:'HyperBeam', r:'งบสูง ขับผสม — HyperBeam 30,000lm สว่างสูงสุดในซีรีส์ รองรับทุกสภาพถนน', p:'฿4,490' }, yes: { s:'LX-40 · ルミシンク', n:'LumiSync™', r:'LumiSync ตอบโจทย์ทั้งความสว่างและ Bluetooth สำหรับผู้ขับที่ต้องการทุกอย่าง', p:'฿5,490' } }, highway: { no: { s:'LX-30 · ハイパービーム', n:'HyperBeam', r:'ทางไกล ทางมืด — HyperBeam 30,000lm Dual Turbo Fan IP68 คือตัวเลือกที่สว่างที่สุด', p:'฿4,490' }, yes: { s:'LX-30 · ハイパービーム', n:'HyperBeam', r:'HyperBeam สว่างที่สุด และ LumiSync หากต้องการ Bluetooth — แนะนำ HyperBeam สำหรับทางไกล', p:'฿4,490' } } }
  };

  document.querySelectorAll('.sel-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const step = +this.dataset.step;
      state[step] = this.dataset.val;
      this.closest('.selector-options').querySelectorAll('.sel-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      if (state[1] && state[2] && state[3]) {
        const r = results[state[1]][state[2]][state[3]];
        document.getElementById('resSeries').textContent = r.s;
        document.getElementById('resName').textContent = r.n;
        document.getElementById('resReason').textContent = r.r;
        document.getElementById('resPrice').textContent = r.p + ' / คู่';
        const el = document.getElementById('selectorResult');
        el.classList.add('show');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
})();
