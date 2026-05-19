import { useState, useEffect, useRef } from "react";

const LETTERS = ['الف','ب','پ','ت','ج','چ','د','ر','ز','س','ش','ف','ک','گ','ل','م','ن','و','ه','ی'];
const ALL_CATS = [
  'اسم دختر','اسم پسر','کشور','شهر ایران','حیوان','میوه','سبزی','رنگ',
  'غذای ایرانی','وسیله نقلیه','لباس','ورزش','اسم گل','نوشیدنی','شیرینی',
  'آلت موسیقی','چیزی که توی آشپزخانه‌ست','چیزی که توی حمام پیدا میشه',
  'چیزی که آدم موقع استرس انجام میده','چیزی که توی پارک میبینی',
  'چیزی که شکستنش ناراحت‌کننده‌ست','چیزی که آدم توی جیبش میذاره',
  'چیزی که موقع قطع برق لازمه','چیزی که صدای بلندی داره',
  'چیزی که توی تابستون لازمه','یه چیز قرمز','یه چیز گرد',
  'چیزی که توی دریا هست','چیزی که بوی خوبی داره','چیزی که گرونه',
  'چیزی که ارزونه','یه شغل بامزه','چیزی که آدم گم میکنه',
  'چیزی که توی زمستون لازمه','یه چیز شیرین','یه چیز ترش',
  'چیزی که توی فرودگاه میبینی','اسم درخت','غذای فست فود',
];
const CAT_EMOJI = {
  'اسم دختر':'👧','اسم پسر':'👦','کشور':'🌍','شهر ایران':'🏙️','حیوان':'🐾','میوه':'🍎',
  'سبزی':'🥦','رنگ':'🎨','غذای ایرانی':'🍲','وسیله نقلیه':'🚗','لباس':'👕','ورزش':'⚽',
  'اسم گل':'🌸','نوشیدنی':'🥤','شیرینی':'🍬','آلت موسیقی':'🎵',
  'چیزی که توی آشپزخانه‌ست':'🍳','چیزی که توی حمام پیدا میشه':'🚿',
  'چیزی که آدم موقع استرس انجام میده':'😤','چیزی که توی پارک میبینی':'🌳',
  'چیزی که شکستنش ناراحت‌کننده‌ست':'💔','چیزی که آدم توی جیبش میذاره':'👜',
  'چیزی که موقع قطع برق لازمه':'🕯️','چیزی که صدای بلندی داره':'📢',
  'چیزی که توی تابستون لازمه':'☀️','یه چیز قرمز':'🔴','یه چیز گرد':'⭕',
  'چیزی که توی دریا هست':'🌊','چیزی که بوی خوبی داره':'🌺','چیزی که گرونه':'💎',
  'چیزی که ارزونه':'💰','یه شغل بامزه':'🤹','چیزی که آدم گم میکنه':'🔍',
  'چیزی که توی زمستون لازمه':'❄️','یه چیز شیرین':'🍯','یه چیز ترش':'🍋',
  'چیزی که توی فرودگاه میبینی':'✈️','اسم درخت':'🌲','غذای فست فود':'🍔',
};

const SCORE_OPTS = [
  { key:'correct', label:'درست',   pts:10, color:'#16A34A', bg:'rgba(22,163,74,0.12)',  border:'rgba(22,163,74,0.4)',  emoji:'✅' },
  { key:'dup',     label:'تکراری', pts:5,  color:'#D97706', bg:'rgba(217,119,6,0.12)',  border:'rgba(217,119,6,0.4)',  emoji:'🔁' },
  { key:'wrong',   label:'غلط',    pts:0,  color:'#DC2626', bg:'rgba(220,38,38,0.12)',  border:'rgba(220,38,38,0.4)',  emoji:'❌' },
];

function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }
function pickCats() { return shuffle(ALL_CATS).slice(0, 8); }

// ── styles ────────────────────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#0D0921;}
  ::-webkit-scrollbar{width:0;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes popIn{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(155,109,255,0.4),0 8px 30px rgba(91,47,219,0.5)}50%{box-shadow:0 0 36px rgba(155,109,255,0.75),0 8px 40px rgba(91,47,219,0.7)}}
  @keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-9px)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.55}}
`;

// ── LetterOrb ─────────────────────────────────────────────────────────────────
function LetterOrb({ letter, size=80, glow=false }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0,
      background:'linear-gradient(145deg,#A78BFA,#5B21B6)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38, fontWeight:900, color:'#fff',
      fontFamily:'Vazirmatn,sans-serif',
      animation: glow ? 'glow 2.2s ease-in-out infinite' : 'popIn 0.35s ease',
    }}>
      {letter}
    </div>
  );
}

// ── PrimaryBtn ────────────────────────────────────────────────────────────────
function PrimaryBtn({ children, onClick, disabled, color='#7C3AED' }) {
  const [pr, setPr] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onPointerDown={()=>setPr(true)} onPointerUp={()=>setPr(false)} onPointerLeave={()=>setPr(false)}
      style={{
        width:'100%', border:'none', borderRadius:15, padding:'15px 20px', cursor:disabled?'default':'pointer',
        background:`linear-gradient(135deg,${color},${color}bb)`,
        color:'#fff', fontFamily:'Vazirmatn,sans-serif', fontWeight:800, fontSize:15,
        boxShadow: pr||disabled ? 'none' : `0 6px 22px ${color}55`,
        transform: pr ? 'scale(0.97)' : 'scale(1)',
        opacity: disabled ? 0.4 : 1,
        transition:'transform 0.1s,box-shadow 0.1s',
      }}>
      {children}
    </button>
  );
}

// ── TimerRing ─────────────────────────────────────────────────────────────────
function TimerRing({ pct, timeLeft }) {
  const r=26, c=2*Math.PI*r;
  const col = pct>0.4?'#A78BFA':pct>0.2?'#F59E0B':'#EF4444';
  return (
    <div style={{position:'relative',width:64,height:64,flexShrink:0}}>
      <svg width={64} height={64} style={{transform:'rotate(-90deg)'}}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="#1E1540" strokeWidth={5}/>
        <circle cx={32} cy={32} r={r} fill="none" stroke={col} strokeWidth={5}
          strokeDasharray={`${c*pct} ${c}`} strokeLinecap="round"
          style={{transition:'stroke-dasharray 1s linear,stroke 0.5s'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'Vazirmatn,sans-serif'}}>
        <span style={{fontSize:15,fontWeight:900,color:col,lineHeight:1}}>{timeLeft}</span>
        <span style={{fontSize:9,color:'#5B4A8A'}}>ث</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function SettingsScreen({ settings, setSettings, onStart }) {
  const { timerOn, timerSec } = settings;
  const presets = [{v:30,l:'۳۰ث'},{v:60,l:'۶۰ث'},{v:90,l:'۹۰ث'},{v:120,l:'۲د'},{v:180,l:'۳د'}];
  return (
    <div style={{flex:1,overflowY:'auto',padding:'30px 20px 40px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{textAlign:'center',animation:'fadeUp 0.4s ease'}}>
        <div style={{fontSize:58,marginBottom:10,animation:'bounce 2.5s ease infinite'}}>🎯</div>
        <h1 style={{fontFamily:'Vazirmatn,sans-serif',fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-0.5px',margin:0}}>اسم فامیل</h1>
        <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:13,color:'#7C6FAD',marginTop:6}}>بازی کلاسیک فارسی</p>
      </div>

      {/* Timer */}
      <div style={{background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(167,139,250,0.2)',borderRadius:20,padding:20,animation:'fadeUp 0.4s ease 0.1s both'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:timerOn?18:0}}>
          <div>
            <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:15,fontWeight:700,color:'#DDD6FE',margin:0}}>⏱ تایمر</p>
            <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:'#5B4A8A',margin:'3px 0 0'}}>{timerOn?`${timerSec} ثانیه`:'بدون محدودیت'}</p>
          </div>
          <div onClick={()=>setSettings(s=>({...s,timerOn:!s.timerOn}))} style={{
            width:52,height:28,borderRadius:99,cursor:'pointer',position:'relative',
            background:timerOn?'linear-gradient(135deg,#A78BFA,#5B21B6)':'#1E1540',
            transition:'background 0.2s',
            boxShadow:timerOn?'0 2px 10px rgba(167,139,250,0.4)':'none',
          }}>
            <div style={{
              position:'absolute',top:3,
              right:timerOn?3:'auto',left:timerOn?'auto':3,
              width:22,height:22,borderRadius:'50%',background:'#fff',
              boxShadow:'0 2px 6px rgba(0,0,0,0.3)',transition:'all 0.2s',
            }}/>
          </div>
        </div>
        {timerOn && (
          <>
            <input type="range" min={30} max={300} step={5} value={timerSec}
              onChange={e=>setSettings(s=>({...s,timerSec:+e.target.value}))}
              style={{width:'100%',accentColor:'#A78BFA',marginBottom:14,cursor:'pointer'}}/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {presets.map(p=>(
                <button key={p.v} onClick={()=>setSettings(s=>({...s,timerSec:p.v}))} style={{
                  fontFamily:'Vazirmatn,sans-serif',fontSize:12,fontWeight:700,
                  padding:'6px 14px',borderRadius:99,border:'none',cursor:'pointer',
                  background:timerSec===p.v?'linear-gradient(135deg,#A78BFA,#5B21B6)':'rgba(167,139,250,0.1)',
                  color:timerSec===p.v?'#fff':'#7C6FAD',
                  boxShadow:timerSec===p.v?'0 3px 10px rgba(167,139,250,0.3)':'none',
                  transition:'all 0.15s',
                }}>{p.l}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,animation:'fadeUp 0.4s ease 0.2s both'}}>
        {[
          ['📂','۸ دسته','در هر دور'],
          ['✅','۱۰ امتیاز','جواب درست'],
          ['🔁','۵ امتیاز','جواب تکراری'],
          ['❌','۰ امتیاز','جواب غلط/خالی'],
        ].map(([e,t,s])=>(
          <div key={t} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(167,139,250,0.12)',borderRadius:14,padding:'14px 10px',textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:4}}>{e}</div>
            <div style={{fontFamily:'Vazirmatn,sans-serif',fontSize:14,fontWeight:800,color:'#DDD6FE'}}>{t}</div>
            <div style={{fontFamily:'Vazirmatn,sans-serif',fontSize:11,color:'#5B4A8A',marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{animation:'fadeUp 0.4s ease 0.3s both'}}>
        <PrimaryBtn onClick={onStart} color="#7C3AED">🎮 شروع بازی</PrimaryBtn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INTRO
// ══════════════════════════════════════════════════════════════════════════════
function IntroScreen({ round, totalScore, onStartRound, onSettings }) {
  const [spinning, setSpinning] = useState(false);
  const [preview, setPreview] = useState('؟');

  const doSpin = () => {
    if (spinning) return;
    setSpinning(true);
    let count = 0;
    const iv = setInterval(()=>{
      setPreview(LETTERS[Math.floor(Math.random()*LETTERS.length)]);
      count++;
      if (count > 18) { clearInterval(iv); setSpinning(false); onStartRound(); }
    }, 70);
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'36px 24px',gap:28}}>
      <div style={{textAlign:'center',animation:'fadeUp 0.4s ease'}}>
        <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:'#5B4A8A',marginBottom:4}}>{round>0?`دور ${round+1}`:''}</p>
        <h2 style={{fontFamily:'Vazirmatn,sans-serif',fontSize:26,fontWeight:900,color:'#fff',margin:0}}>
          {round===0?'آماده‌ای؟ 🎯':'دور بعدی! 🚀'}
        </h2>
      </div>

      <div onClick={doSpin} style={{cursor:spinning?'default':'pointer',animation:'fadeUp 0.5s ease 0.1s both'}}>
        <LetterOrb letter={preview} size={130} glow={!spinning}/>
      </div>

      {totalScore>0 && (
        <div style={{textAlign:'center',animation:'fadeUp 0.4s ease 0.15s both'}}>
          <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:'#5B4A8A',marginBottom:6}}>امتیاز کل</p>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:8,
            background:'rgba(167,139,250,0.1)',border:'1.5px solid rgba(167,139,250,0.25)',
            borderRadius:99,padding:'8px 20px',
          }}>
            <span style={{fontSize:16}}>⭐</span>
            <span style={{fontFamily:'Vazirmatn,sans-serif',fontWeight:900,fontSize:22,color:'#DDD6FE'}}>{totalScore}</span>
          </div>
        </div>
      )}

      <div style={{width:'100%',display:'flex',flexDirection:'column',gap:10,animation:'fadeUp 0.4s ease 0.2s both'}}>
        <PrimaryBtn onClick={doSpin} color="#7C3AED" disabled={spinning}>
          {spinning?'🎲 در حال قرعه‌کشی...':'🎲 قرعه‌کشی و شروع!'}
        </PrimaryBtn>
        <button onClick={onSettings} style={{
          border:'1.5px solid rgba(167,139,250,0.2)',borderRadius:14,padding:'13px 20px',
          background:'transparent',color:'#7C6FAD',fontFamily:'Vazirmatn,sans-serif',
          fontWeight:700,fontSize:14,cursor:'pointer',width:'100%',
        }}>⚙️ تنظیمات</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAYING
// ══════════════════════════════════════════════════════════════════════════════
function PlayingScreen({ letter, cats, answers, setAnswers, timerOn, timerSec, onReveal }) {
  const [timeLeft, setTimeLeft] = useState(timerSec);
  const ansRef = useRef(answers);
  useEffect(()=>{ ansRef.current=answers; },[answers]);

  useEffect(()=>{
    if (!timerOn) return;
    const iv = setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){ clearInterval(iv); onReveal(ansRef.current); return 0; }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(iv);
  },[]);

  const pct = timerOn ? timeLeft/timerSec : 1;

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{
        background:'#0D0921',borderBottom:'1px solid rgba(167,139,250,0.12)',
        padding:'14px 18px',display:'flex',alignItems:'center',gap:14,
        position:'sticky',top:0,zIndex:20,
      }}>
        <LetterOrb letter={letter} size={50} glow/>
        <div style={{flex:1}}>
          <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:10,color:'#5B4A8A',margin:0}}>حرف این دور</p>
          <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:14,fontWeight:700,color:'#DDD6FE',margin:'3px 0 0'}}>
            {cats.length} دسته — جواب بده!
          </p>
        </div>
        {timerOn
          ? <TimerRing pct={pct} timeLeft={timeLeft}/>
          : <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:11,color:'#5B4A8A',background:'rgba(167,139,250,0.08)',borderRadius:99,padding:'5px 12px'}}>∞ آزاد</span>
        }
      </div>

      {/* Fields */}
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px 110px',display:'flex',flexDirection:'column',gap:10}}>
        {cats.map((cat,i)=>(
          <div key={cat} style={{
            background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(167,139,250,0.13)',
            borderRadius:16,padding:'12px 14px',
            animation:`fadeUp 0.3s ease ${i*0.045}s both`,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>{CAT_EMOJI[cat]||'📝'}</span>
              <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:13,fontWeight:600,color:'#C4B5FD'}}>{cat}</span>
            </div>
            <input dir="rtl"
              value={answers[i]||''}
              onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))}
              placeholder={`با حرف «${letter}» ...`}
              style={{
                width:'100%',border:'none',outline:'none',
                background:'rgba(167,139,250,0.07)',borderRadius:10,
                padding:'10px 13px',fontFamily:'Vazirmatn,sans-serif',
                fontSize:15,fontWeight:600,color:'#EDE9FE',direction:'rtl',
              }}/>
          </div>
        ))}
      </div>

      {/* FAB */}
      <div style={{position:'fixed',bottom:24,left:18,right:18,maxWidth:394,margin:'0 auto',zIndex:30}}>
        <PrimaryBtn onClick={()=>onReveal(answers)} color="#DC2626">
          🏁 تموم شد! نتیجه رو ببین
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVEAL — manual scoring
// ══════════════════════════════════════════════════════════════════════════════
function RevealScreen({ letter, cats, answers, round, prevTotal, onNext, onSettings }) {
  const [scoring, setScoring] = useState(()=>Object.fromEntries(cats.map((_,i)=>[i,null])));
  const [confirmed, setConfirmed] = useState(false);

  const pickedCount = cats.filter((_,i)=>scoring[i]!==null).length;
  const allPicked = pickedCount===cats.length;

  const roundScore = cats.reduce((s,_,i)=>{
    const o=SCORE_OPTS.find(x=>x.key===scoring[i]);
    return s+(o?o.pts:0);
  },0);

  const setOne = (i, key) => {
    if (confirmed) return;
    setScoring(sc=>({...sc,[i]:key}));
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column'}}>

      {/* Score hero */}
      <div style={{
        background: confirmed
          ? 'linear-gradient(135deg,#166534,#14532D)'
          : 'linear-gradient(135deg,#4C1D95,#2E1065)',
        padding:'22px 20px 30px',position:'relative',overflow:'hidden',
        transition:'background 0.5s',
      }}>
        <div style={{position:'absolute',top:-50,left:-50,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.04)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <LetterOrb letter={letter} size={56}/>
          <div style={{flex:1}}>
            <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:'rgba(255,255,255,0.5)',margin:0}}>دور {round}</p>
            <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.85)',margin:'4px 0 0'}}>
              {confirmed ? '✅ امتیازها ثبت شد!' : `برای هر فیلد قضاوت کن  ${pickedCount}/${cats.length}`}
            </p>
          </div>
          <div style={{textAlign:'center'}}>
            <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:10,color:'rgba(255,255,255,0.45)',margin:'0 0 2px'}}>این دور</p>
            <p style={{fontFamily:'Vazirmatn,sans-serif',fontSize:38,fontWeight:900,color:'#fff',margin:0,lineHeight:1}}>
              +{roundScore}
            </p>
          </div>
        </div>
        {prevTotal>0 && (
          <div style={{
            marginTop:12,display:'inline-flex',alignItems:'center',gap:6,
            background:'rgba(255,255,255,0.08)',borderRadius:99,padding:'5px 14px',
          }}>
            <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:'rgba(255,255,255,0.75)'}}>
              امتیاز کل: {prevTotal + (confirmed?roundScore:0)}
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px 140px',display:'flex',flexDirection:'column',gap:12}}>
        {cats.map((cat,i)=>{
          const val=(answers[i]||'').trim();
          const picked=scoring[i];
          const opt=SCORE_OPTS.find(o=>o.key===picked);

          return (
            <div key={cat} style={{
              background: picked ? `rgba(${picked==='correct'?'22,163,74':picked==='dup'?'217,119,6':'220,38,38'},0.08)` : 'rgba(255,255,255,0.04)',
              border:`1.5px solid ${picked ? opt.border : 'rgba(167,139,250,0.13)'}`,
              borderRadius:18,padding:'14px 14px 13px',
              animation:`fadeUp 0.35s ease ${i*0.05}s both`,
              transition:'background 0.2s,border 0.2s',
            }}>
              {/* Label row */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                <span style={{fontSize:19}}>{CAT_EMOJI[cat]||'📝'}</span>
                <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:'#9B8BC4',flex:1}}>{cat}</span>
                {picked && <span style={{fontSize:18,animation:'popIn 0.3s ease'}}>{opt.emoji}</span>}
              </div>

              {/* Answer display */}
              <div style={{
                background:'rgba(0,0,0,0.3)',borderRadius:10,padding:'10px 14px',marginBottom:11,
                fontFamily:'Vazirmatn,sans-serif',fontSize:15,fontWeight:700,direction:'rtl',
                color: val ? (picked ? opt.color : '#EDE9FE') : '#4A3F6B',
              }}>
                {val || '— بدون جواب —'}
              </div>

              {/* Score buttons */}
              {!confirmed ? (
                <div style={{display:'flex',gap:8}}>
                  {SCORE_OPTS.map(o=>{
                    const active=picked===o.key;
                    return (
                      <button key={o.key} onClick={()=>setOne(i,o.key)} style={{
                        flex:1,border:`2px solid ${active?o.border:'rgba(167,139,250,0.15)'}`,
                        borderRadius:12,padding:'9px 4px',cursor:'pointer',
                        background:active?o.bg:'transparent',
                        color:active?o.color:'#5B4A8A',
                        fontFamily:'Vazirmatn,sans-serif',fontWeight:700,
                        transition:'all 0.15s',
                      }}>
                        <div style={{fontSize:17,marginBottom:2}}>{o.emoji}</div>
                        <div style={{fontSize:11}}>{o.label}</div>
                        <div style={{fontSize:10,opacity:0.7,marginTop:1}}>+{o.pts}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  display:'inline-flex',alignItems:'center',gap:6,
                  background:opt?opt.bg:'rgba(167,139,250,0.08)',
                  borderRadius:99,padding:'5px 13px',
                  animation:'slideUp 0.3s ease',
                }}>
                  <span style={{fontSize:14}}>{opt?opt.emoji:'⬜'}</span>
                  <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:12,color:opt?opt.color:'#7C6FAD',fontWeight:700}}>
                    {opt?opt.label:'قضاوت نشد'} — +{opt?opt.pts:0} امتیاز
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom sticky bar */}
      <div style={{
        position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',
        width:'100%',maxWidth:430,
        background:'linear-gradient(to top,#0D0921 60%,transparent)',
        padding:'10px 18px 28px',display:'flex',flexDirection:'column',gap:10,zIndex:30,
      }}>
        {/* Running score */}
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',
          background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.18)',
          borderRadius:14,padding:'11px 16px',
        }}>
          <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:13,color:'#7C6FAD'}}>
            {confirmed?'مجموع کل':'جمع این دور'}
          </span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:14}}>⭐</span>
            <span style={{fontFamily:'Vazirmatn,sans-serif',fontSize:22,fontWeight:900,color:'#DDD6FE'}}>
              {confirmed ? prevTotal+roundScore : roundScore}
            </span>
          </div>
        </div>

        {!confirmed ? (
          <PrimaryBtn onClick={()=>setConfirmed(true)} disabled={!allPicked} color="#16A34A">
            {allPicked ? '✅ ثبت امتیازها' : `⏳ هنوز ${cats.length-pickedCount} فیلد مانده`}
          </PrimaryBtn>
        ) : (
          <div style={{display:'flex',gap:10}}>
            <button onClick={onSettings} style={{
              flex:'0 0 auto',width:52,border:'1.5px solid rgba(167,139,250,0.2)',
              borderRadius:14,background:'transparent',color:'#7C6FAD',cursor:'pointer',fontSize:18,
            }}>⚙️</button>
            <div style={{flex:1}}>
              <PrimaryBtn onClick={()=>onNext(roundScore)} color="#7C3AED">🎮 دور بعدی</PrimaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [phase, setPhase] = useState('settings');
  const [settings, setSettings] = useState({ timerOn:true, timerSec:90 });
  const [round, setRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [letter, setLetter] = useState('');
  const [cats, setCats] = useState([]);
  const [answers, setAnswers] = useState({});

  const handleStartRound = () => {
    const l = LETTERS[Math.floor(Math.random()*LETTERS.length)];
    setLetter(l);
    setCats(pickCats());
    setAnswers({});
    setRound(r=>r+1);
    setPhase('playing');
  };

  const handleReveal = (ans) => {
    setAnswers(ans);
    setPhase('reveal');
  };

  const handleNextRound = (roundScore) => {
    setTotalScore(t=>t+roundScore);
    setPhase('intro');
  };

  return (
    <div style={{
      width:'100%',maxWidth:430,margin:'0 auto',
      minHeight:'100vh',background:'#0D0921',
      display:'flex',flexDirection:'column',direction:'rtl',
      position:'relative',overflow:'hidden',
    }}>
      <style>{STYLE}</style>

      {/* bg blobs */}
      <div style={{position:'fixed',top:-100,right:-100,width:280,height:280,borderRadius:'50%',background:'rgba(124,92,252,0.07)',pointerEvents:'none',zIndex:0}}/>
      <div style={{position:'fixed',bottom:-70,left:-70,width:200,height:200,borderRadius:'50%',background:'rgba(91,47,219,0.05)',pointerEvents:'none',zIndex:0}}/>

      {/* status bar */}
      <div style={{display:'flex',justifyContent:'space-between',padding:'14px 22px 0',fontFamily:'Vazirmatn,sans-serif',fontSize:12,fontWeight:600,color:'#3D3060',position:'relative',zIndex:1}}>
        <span>۱۲:۴۵</span>
        <div style={{display:'flex',gap:6}}><span>📶</span><span>🔋</span></div>
      </div>

      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative',zIndex:1}}>
        {phase==='settings' && <SettingsScreen settings={settings} setSettings={setSettings} onStart={()=>setPhase('intro')}/>}
        {phase==='intro' && <IntroScreen round={round} totalScore={totalScore} onStartRound={handleStartRound} onSettings={()=>setPhase('settings')}/>}
        {phase==='playing' && <PlayingScreen key={round} letter={letter} cats={cats} answers={answers} setAnswers={setAnswers} timerOn={settings.timerOn} timerSec={settings.timerSec} onReveal={handleReveal}/>}
        {phase==='reveal' && <RevealScreen key={'r'+round} letter={letter} cats={cats} answers={answers} round={round} prevTotal={totalScore} onNext={handleNextRound} onSettings={()=>setPhase('settings')}/>}
      </div>
    </div>
  );
}