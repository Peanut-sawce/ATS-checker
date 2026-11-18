/* ================= ENGINE v2: critical CV analysis ================= */
const STOP = new Set("a an the and or but if then else of to in on at by for with without from as is are was were be been being am do does did done have has had having this that these those it its they them their there here we you your our us i me my he she his her him not no nor so than too very can could should would shall will may might must about above after again against all also any both each few more most other some such only own same into over under up down out off once during before between through while what which who whom whose when where why how per via etc eg ie within upon".split(" "));
const BOILER = new Set("applicant applicants application applications apply applying position positions role roles job jobs candidate candidates responsible responsibility responsibilities include includes including provision provide provided provides required require requires requirement requirements minimum qualification qualifications education educational experience experienced years year relevant send sent submit submitted email address attention please note advertised company post work working works ability able strong good best new well like also looking seeking join suitably interested following listed available successful monday tuesday wednesday thursday friday saturday sunday january february march april june july august september october november december".split(" "));
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const MON = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const QUALS = [
  { label: "MSCE (Malawi School Certificate of Education)", jd: /\bmsce\b|malawi school certificate/i, cv: /\bmsce\b|malawi school certificate/i },
  { label: "JCE (Junior Certificate)", jd: /\bjce\b|junior certificate/i, cv: /\bjce\b|junior certificate/i },
  { label: "TEVET, Trade Test or City & Guilds certificate", jd: /\btevet\b|trade test|city\s*(?:&|and)\s*guilds/i, cv: /\btevet\b|trade test|city\s*(?:&|and)\s*guilds/i, progress: true },
  { label: "Diploma", jd: /\bdiploma\b/i, cv: /\bdiploma\b/i, progress: true },
  { label: "Bachelor's degree", jd: /\bbachelor|\bb\.?\s?sc\b|\bbsc\b|\bdegree\b/i, cv: /\bbachelor|\bb\.?\s?sc\b|\bbsc\b|\bdegree\b/i, progress: true },
  { label: "Master's degree", jd: /\bmaster'?s?\b|\bm\.?sc\b|\bmba\b/i, cv: /\bmaster'?s?\b|\bm\.?sc\b|\bmba\b/i, progress: true },
  { label: "PhD", jd: /\bph\.?d\b|doctorate/i, cv: /\bph\.?d\b|doctorate/i, progress: true },
  { label: "Driving licence", jd: /driv(?:er|ing)'?s?\s+licen[cs]e/i, cv: /driv(?:er|ing)'?s?\s+licen[cs]e/i }
];
const PRO_CERT = /\b(acca|cima|cpa|cips|pmp|prince2|ccna|cissp|cfa)\b/gi;
const SEC_BEN = /benefit|we offer|remunerat|salary|compensation|conditions/i;
const SEC_DUTY = /responsib|\bduties\b|\broles\b|\btasks\b|what you.{0,12}do|job description|scope of work|key areas/i;
const SEC_REQ = /requirement|qualification|\bskills\b|competenc|looking for|\bessential\b|\bminimum\b|you (?:have|bring)|about you/i;
const LIST_RE = /^\s*(?:[-•●▪■*•]|\d{1,2}[.)]|[a-z][.)])\s+(\S.*)$/i;
const SUB_RE = /^\s*(?:[o○◦▫–]\s+)(\S.*)$/;
const NUMBERED_RE = /^\s*(?:\d{1,2}[.)]|[a-z][.)])\s/i;
const BULLET_RE = /^\s*(?:[•●▪■◦\-*–•]|\d{1,2}[.)])\s+/;
const DESIRABLE_RE = /desirable|prefer(?:red|ably)?|advantage|an asset|added advantage|would be an? /i;

const norm = s => s.toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ");
const words = s => norm(s).match(/[a-z0-9]+(?:[+#][a-z0-9]*)*/g) || [];
const wc = s => (s && s.trim() ? s.trim().split(/\s+/).length : 0);
function stem(w) {
  if (w.length < 4 || /^\d+$/.test(w)) return w;
  let s = w;
  if (/ies$/.test(s)) s = s.replace(/ies$/, "y");
  else if (/s$/.test(s) && !/ss$/.test(s)) s = s.slice(0, -1);
  if (s.length > 5) s = s.replace(/(ing|ed)$/, "");
  if (s.length > 4) s = s.replace(/e$/, "");
  return s;
}
const isTitleCase = s => s.split(/\s+/).filter(w => w.length > 3).every(w => /^[A-Z0-9(]/.test(w));
const clamp01 = x => Math.max(0, Math.min(1, x));
const pct = x => Math.round(x * 100);
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const trimQ = (s, n) => { s = String(s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };

function stemMatch(st, set, longArr) {
  if (set.has(st)) return true;
  if (st.length < 6) return false;
  return longArr.some(c => Math.abs(c.length - st.length) <= 5 && (c.startsWith(st) || st.startsWith(c)));
}
function makeMatcher(text) {
  const set = new Set(words(text).filter(w => !STOP.has(w)).map(stem));
  const longArr = [...set].filter(s => s.length >= 6);
  return st => stemMatch(st, set, longArr);
}

/* ---------- advert parsing ---------- */
function cleanJD(raw) {
  const lines = raw.split(/\r?\n/);
  const idx = lines.findIndex(l => /^\s*(?:\d+[.)]\s*)?(method of application|how to apply|to apply\b|application (?:procedure|instructions|process)|closing date|application deadline)/i.test(l));
  return (idx > 0 ? lines.slice(0, idx) : lines).join("\n").replace(/\S+@\S+|https?:\/\/\S+|www\.\S+/g, " ");
}
function getTitle(body) {
  for (const l of body.split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    if (/vacanc|announcement|we are hiring|job (?:advert|description)|position overview|^about/i.test(l)) continue;
    const t = l.replace(/\([^)]*\)/g, "").replace(/[^\w\s&/-]/g, " ").replace(/\s+/g, " ").trim();
    return wc(t) <= 8 ? t : "";
  }
  return "";
}
function isReqLine(t) {
  return QUALS.some(q => q.jd.test(t)) ||
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b[^.\n]{0,25}\byears?\b/i.test(t) ||
    /\bcredits?\b/i.test(t) || /\b(?:copies of|national identity|id card)\b/i.test(t);
}
function parseJD(body) {
  let kind = "other";
  const out = [];
  for (const raw of body.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) continue;
    const sub = SUB_RE.exec(raw);
    if (sub) { out.push({ text: sub[1].trim(), kind, item: false, sub: true }); continue; }
    const li = LIST_RE.exec(raw);
    const txt = li ? li[1].trim() : t;
    const numbered = NUMBERED_RE.test(raw);
    const secMatch = SEC_BEN.test(txt) || SEC_DUTY.test(txt) || SEC_REQ.test(txt);
    const shortNoStop = wc(txt) <= 8 && !/[.,;]$/.test(txt);
    const headingLike = (!li && shortNoStop && (secMatch || isTitleCase(txt) || txt === txt.toUpperCase())) ||
      (li && numbered && wc(txt) <= 6 && !/[.,;]$/.test(txt) && (secMatch || isTitleCase(txt)));
    if (headingLike) {
      kind = SEC_BEN.test(txt) ? "benefit" : SEC_DUTY.test(txt) ? "duty" : SEC_REQ.test(txt) ? "req" : "other";
      out.push({ text: txt, kind, heading: true });
      continue;
    }
    if (!li && out.length && /^[a-z]/.test(t) && out[out.length - 1].item) { out[out.length - 1].text += " " + t; continue; }
    out.push({ text: txt, kind, item: !!li });
  }
  return out;
}
function advertItems(parsed) {
  let items = parsed.filter(l => l.item && (l.kind === "duty" || l.kind === "req") && !isReqLine(l.text));
  if (items.length < 3) items = parsed.filter(l => l.item && l.kind !== "benefit" && !isReqLine(l.text));
  if (items.length < 3) {
    const cue = /\b(must|required?|should|ability|knowledge|skills?|proficien|familiar|responsib|commitment|committed|background)\b/i;
    const sentences = parsed.filter(l => !l.heading && !l.sub && l.kind !== "benefit")
      .flatMap(l => l.text.split(/(?<=[.;])\s+/)).map(s => s.trim()).filter(s => wc(s) >= 4 && wc(s) <= 35 && cue.test(s) && !isReqLine(s));
    items = items.concat(sentences.map(text => ({ text, kind: "req" })));
  }
  return items.slice(0, 24).map(l => ({ text: l.text.replace(/[.;:,]+$/, "").trim(), kind: l.kind === "req" ? "req" : "duty", desirable: DESIRABLE_RE.test(l.text) }));
}

/* ---------- dates ---------- */
const DATE_RANGE_RE = new RegExp("((?:" + MON + ")[a-z]*\\.?\\s+\\d{4}|\\b(?:19|20)\\d{2})\\s*(?:–|—|-|to)\\s*(present|current|now|date|(?:" + MON + ")[a-z]*\\.?\\s+\\d{4}|\\b(?:19|20)\\d{2})", "i");
function monthIdx(str, isEnd, now) {
  if (/present|current|now|date/i.test(str)) return now.getFullYear() * 12 + now.getMonth();
  const m = new RegExp("(?:(" + MON + ")[a-z]*\\.?\\s+)?(\\d{4})", "i").exec(str);
  if (!m) return null;
  return +m[2] * 12 + (m[1] ? MONTHS[m[1].toLowerCase()] : (isEnd ? 11 : 0));
}
function experienceYears(cv, now) {
  const re = new RegExp("\\b(" + MON + ")[a-z]*\\.?\\s+(\\d{4})\\s*(?:–|—|-|to)\\s*(?:(present|current|now|date)|(?:(" + MON + ")[a-z]*\\.?\\s+)?(\\d{4}))", "gi");
  const iv = []; let m;
  while ((m = re.exec(cv))) {
    const s = +m[2] * 12 + MONTHS[m[1].toLowerCase()];
    const e = m[3] ? now.getFullYear() * 12 + now.getMonth() : (m[4] ? +m[5] * 12 + MONTHS[m[4].toLowerCase()] : +m[5] * 12 + 11);
    if (e >= s) iv.push([s, e + 1]);
  }
  if (!iv.length) return null;
  iv.sort((a, b) => a[0] - b[0]);
  let total = 0, cur = iv[0].slice();
  for (const [s, e] of iv.slice(1)) { if (s <= cur[1]) cur[1] = Math.max(cur[1], e); else { total += cur[1] - cur[0]; cur = [s, e]; } }
  total += cur[1] - cur[0];
  return total / 12;
}
function experienceRequired(body) {
  const re = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:\(\d+\)\s*)?\+?\s*(?:or more\s+)?(?:years?|yrs?)\b/gi;
  let m, best = null;
  while ((m = re.exec(body))) {
    const ctx = body.slice(Math.max(0, m.index - 60), m.index + m[0].length + 80);
    if (!/experience/i.test(ctx)) continue;
    if (/of age/i.test(body.slice(m.index, m.index + m[0].length + 12))) continue;
    const n = NUMW[m[1].toLowerCase()] || +m[1];
    if (!best || n > best) best = n;
  }
  return best;
}

/* ---------- CV parsing ---------- */
const HEADS = {
  summary: /^(?:professional\s+|career\s+|personal\s+)?(?:summary|profile|objective|statement)$/,
  experience: /^(?:work\s+|professional\s+|employment\s+|relevant\s+)?(?:experience|history)$/,
  education: /^(?:education|qualifications|academic(?:\s+\w+)?|education\s+and\s+(?:training|qualifications))$/,
  skills: /^(?:key\s+|core\s+|technical\s+|professional\s+)?(?:skills|competenc(?:ies|es)|skills\s+and\s+(?:competenc(?:ies|es)|abilities))$/,
  certs: /^(?:certifications?|certificates|training|courses|professional\s+(?:development|training))$/,
  languages: /^languages?$/,
  referees: /^(?:referees?|references?)$/,
  volunteer: /^(?:volunteer(?:ing)?(?:\s+experience)?|community\s+service)$/,
  memberships: /^(?:professional\s+)?memberships?$/,
  interests: /^(?:interests|hobbies)$/,
  achievements: /^(?:achievements|accomplishments)$/
};
function headingKey(line) {
  const t = line.trim().replace(/[:\-–—]+$/, "").trim().toLowerCase();
  if (!t || wc(t) > 5 || /[.,;@]/.test(t)) return null;
  return Object.keys(HEADS).find(k => HEADS[k].test(t)) || null;
}
function parseCV(cv) {
  const sec = { header: [] }; let cur = "header";
  for (const l of cv.split(/\r?\n/)) {
    const k = headingKey(l);
    if (k) { cur = k; if (!sec[k]) sec[k] = []; continue; }
    sec[cur].push(l);
  }
  return sec;
}
function parseJobs(expLines, now) {
  const lines = expLines.map(l => l.trim()).filter(Boolean);
  const heads = [];
  lines.forEach((l, i) => { if (!BULLET_RE.test(l) && DATE_RANGE_RE.test(l) && wc(l.replace(DATE_RANGE_RE, "")) <= 14) heads.push(i); });
  return heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1] : lines.length;
    const m = DATE_RANGE_RE.exec(lines[h]);
    const employer = lines[h].replace(DATE_RANGE_RE, "").replace(/[|,–—-]\s*$/, "").trim();
    let title = ""; const bullets = [];
    for (const b of lines.slice(h + 1, end)) {
      if (BULLET_RE.test(b)) bullets.push(b.replace(BULLET_RE, "").trim());
      else if (!title && wc(b) <= 16 && !/[.;]$/.test(b) && !WEAK_START.test(b) && !ACTION.has((b.match(/^[A-Za-z]+/) || [""])[0].toLowerCase()) && isTitleCase(b)) title = b;
      else if (wc(b) >= 2) bullets.push(b);
    }
    const start = monthIdx(m[1], false, now), stop = monthIdx(m[2], true, now);
    return { employer, title, bullets, start, end: stop, range: m[0], monthYear: new RegExp("(" + MON + ")[a-z]*\\.?\\s+\\d{4}", "i").test(m[1]), text: [employer, title, ...bullets].join(" ") };
  });
}

/* education */
const QUAL_LINE = /\b(msce|jce|bachelor|b\.?sc|bsc|diploma|certificate|master|msc|mba|ph\.?d|degree|city\s*(?:&|and)\s*guilds|tevet|trade test|a-level|o-level)\b/i;
const INST_RE = /university|college|school|institute|academy|polytechnic|campus|tevet|nacit|mubas|luanar|unima|\bmust\b|mzuzu|kamuzu|seminary/i;
const GRADE_RE = /credits?|distinction|merit|honou?rs|first class|upper second|lower second|2:1|2:2|gpa|cgpa|grade|division|\bclass\b/i;
const MSCE_CREDITS_RE = /\b\d{1,2}\s*credits?|credits?\s*[:\-]?\s*\d{1,2}|distinction|merit/i;
const PROG_RE = /in progress|pursuing|currently|studying|ongoing|present|current/i;
function parseEducation(lines) {
  const L = lines.map(x => x.trim()).filter(Boolean);
  const entries = [];
  L.forEach((l, i) => {
    if (!QUAL_LINE.test(l)) return;
    const prev = L[i - 1], next = L[i + 1];
    const usePrev = prev && !QUAL_LINE.test(prev);
    const useNext = next && !QUAL_LINE.test(next) && !(INST_RE.test(next) && /\b(19|20)\d{2}\b/.test(next));
    const win = [usePrev ? prev : "", l, useNext ? next : ""].join(" ");
    const isMSCE = /\bmsce\b|malawi school certificate/i.test(l);
    const inProgress = PROG_RE.test(win);
    entries.push({
      label: l, isMSCE, inProgress,
      institution: INST_RE.test(win),
      year: /\b(19|20)\d{2}\b/.test(win),
      grade: isMSCE ? MSCE_CREDITS_RE.test(win) : GRADE_RE.test(win),
      completion: !inProgress || /expected|graduat|complet/i.test(win)
    });
  });
  return entries;
}

/* skills */
const TOOL_RE = /^(?:ms\s+|microsoft\s+)?(?:word|excel|powerpoint|outlook|office|office suite|internet|email|e-mail|typing)$/i;
const GENERIC_SKILL_RE = /hardworking|hard-working|team ?player|communication|interpersonal|punctual|reliab|honest|problem[- ]solving|analytical|under pressure|fast learner|quick learner|time management|self-motivated|multitask|organis|organiz|adaptab|flexib/i;
function parseSkills(lines) {
  const items = [];
  for (const raw of lines) {
    const t = raw.replace(BULLET_RE, "").trim();
    if (!t) continue;
    const afterColon = /^[^:]{2,40}:\s*(.+)$/.exec(t);
    (afterColon ? afterColon[1] : t).split(/[;,|]|\s[–—]\s/).map(x => x.trim().replace(/^(?:and|&)\s+/i, "")).filter(x => x.length >= 2 && x.length <= 70 && wc(x) <= 9).forEach(x => items.push(x));
  }
  return items;
}

/* summary */
const BUZZ = ["hardworking", "hard-working", "team player", "results-driven", "results driven", "dynamic", "motivated", "passionate", "self-starter", "detail-oriented", "detail oriented", "reliable", "ambitious", "aspiring", "prudent", "enthusiastic", "dedicated", "honest", "committed", "go-getter", "challenging position", "reputable organi[sz]ation", "fast learner", "quick learner", "energetic", "innovative", "well organi[sz]ed", "seeking employment", "disciplined", "creative"];
const METRIC_RE = /\b\d+(?:[.,]\d+)?\s*(?:%|percent|per\s+(?:day|week|month|year)|clients?|customers?|units?|devices?|projects?|sites?|districts?|communities|beneficiaries|staff|people|participants|households|hectares|tonnes?|bags?|orders?|deliveries|reports?|days?|hours?|weeks?|months?)\b|\b(?:MK|K|USD|\$)\s?\d[\d,.]*\b|\b\d{2,}\b|\bover (?:ten|twenty|thirty|forty|fifty|hundred)\b|\b\d+\s*[–-]\s*\d+\b/i;
const RESULT_RE = /\b(increase[ds]?|reduc(?:e|ed|ing)|sav(?:e|ed|ing)|achiev(?:e|ed|ing)|exceed(?:ed|ing)|improv(?:e|ed|ing)|grew|generat(?:e|ed)|boost(?:ed)?|resulting in|leading to|which (?:led|resulted)|ahead of|above|against (?:a )?target|target)\b/i;
const WEAK_START = /^(responsible for|duties (?:included|include)|worked (?:on|with|as)|helped|assisted with|involved in|tasked with|in charge of|participated in)/i;
const ACTION = new Set("achieved activated administered analysed analyzed arranged assembled assisted built calculated checked collected communicated compiled completed conducted coordinated created delivered designed developed distributed documented drafted evaluated exceeded facilitated generated handled identified implemented improved increased installed issued led liaised maintained managed monitored negotiated operated organised organized planned prepared presented processed produced promoted provided reconciled recorded reduced repaired reported resolved reviewed sold served set supervised supported tracked trained updated wrote support handle maintain manage coordinate prepare liaise resolve sell deliver activate track collect keep keeping set follow work build lead run operate serve process produce plan organise organize".split(" "));
const stripYears = s => s.replace(/\b(19|20)\d{2}\b/g, " ").replace(/\+?\d[\d\s().-]{7,}\d/g, " ");
const hasMetric = s => METRIC_RE.test(stripYears(s));
function classifyBullet(t) {
  const first = (t.match(/^[A-Za-z]+/) || [""])[0].toLowerCase();
  return { text: t, hasMetric: hasMetric(t), hasResult: RESULT_RE.test(t), weak: WEAK_START.test(t), action: ACTION.has(first) };
}
const QUESTION_BANK = [
  [/\bsold|sales|selling|devices|broadband|target/i, "How many units per day, week or month? What was the target and how did you compare?"],
  [/\bcustomers?|clients?|enquir|queries|service/i, "How many customers or clients did you serve each day or week? How many complaints did you resolve?"],
  [/\bdeliver|dispatch|order|supplier|stock|inventor/i, "How many deliveries or orders per week? Were they on time? How much stock value did you handle?"],
  [/\bproject|design|install|site/i, "How many projects, sites or clients? What was the value in MK? Did you finish on time and within budget?"],
  [/\brecords?|documentation|filing|report|invoice|reconcil|payable|ledger/i, "How many records, invoices or reports? What was the value handled? How accurate was it?"],
  [/\bmeeting|workshop|event|seminar/i, "How many meetings or events? How many attendees?"],
  [/\bclean|office|supplies/i, "How many offices or rooms? How often? Which inspections or standards did you meet?"]
];
function questionsFor(t) {
  const q = QUESTION_BANK.filter(([re]) => re.test(t)).map(x => x[1]);
  return q.length ? q.slice(0, 2) : ["How many? How often? Compared with what target? What changed because of your work?"];
}

/* referees, languages, misc */
function parseReferees(lines) {
  const L = lines.map(x => x.trim()).filter(Boolean);
  const nameLines = L.filter(l => /^(mr|mrs|ms|miss|dr|prof|hon|rev|pastor|sir|madam)\b\.?/i.test(l)).length;
  const email = (L.join(" ").match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).length;
  const contactLines = L.filter(l => /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{7,}\d/.test(l)).length;
  return { entries: Math.max(nameLines, email), withContact: contactLines, onRequest: /available (?:up)?on request|on request/i.test(L.join(" ")) };
}

/* ================= environments ================= */
const ENVS = {
  gov: {
    label: "Malawi Government", short: "Government",
    blurb: "Public-service panels usually check that each qualification can be verified (institution, year and grade), that the career history is complete and dated, and that referees are traceable. Adverts often set exact minimum qualifications and experience.",
    verify: ["Shortlisting rules differ between ministries and departments. The advert's own minimum qualifications and experience decide.", "Some adverts ask for certified copies, a specific form or a particular file format. Follow the advert exactly."],
    weights: { ats: 10, edu: 18, exp: 20, skills: 10, ach: 10, pres: 12, fit: 20 },
    maxWords: 1200
  },
  ngo: {
    label: "NGO", short: "NGO",
    blurb: "NGO panels tend to look for evidence of project delivery, donor or community work, reporting and measurable results, plus practical field and data skills and relevant languages.",
    verify: ["Donor-funded posts may add donor-specific rules (for example on conflict of interest or reference checks). Check the advert.", "Language needs vary by district and programme. Only the advert can confirm them."],
    weights: { ats: 10, edu: 10, exp: 20, skills: 15, ach: 20, pres: 5, fit: 20 },
    maxWords: 1000
  },
  un: {
    label: "UN and international organisations", short: "UN / International",
    blurb: "International organisations commonly screen against competencies and results. Expect a stronger focus on degree-level education, language proficiency, a clear chronology and results-based achievement statements, often through an online system.",
    verify: ["Many posts use an online profile in addition to the CV. Keep both consistent.", "Degree and years-of-experience minimums are usually fixed by grade. Confirm them in the vacancy notice."],
    weights: { ats: 15, edu: 15, exp: 20, skills: 10, ach: 20, pres: 10, fit: 10 },
    maxWords: 1200
  },
  private: {
    label: "Private sector", short: "Private sector",
    blurb: "Companies, banks and telecoms usually favour a concise CV that shows commercial results, relevant tools or certifications and clear job titles. Many screen with keywords before a person reads the CV.",
    verify: ["Whether an employer uses ATS software, and which one, varies. Treat keyword matching as likely, not certain.", "Banks and regulated firms may require professional certifications. The advert will say."],
    weights: { ats: 15, edu: 10, exp: 20, skills: 15, ach: 20, pres: 10, fit: 10 },
    maxWords: 850
  },
  sme: {
    label: "Small and medium enterprises", short: "SME",
    blurb: "Small businesses usually want proof that you are reliable, hands-on and versatile, with referees they can reach, in a short and direct CV. Practical experience tends to count for more than formal polish.",
    verify: ["Many SMEs decide quickly and informally. A phone call to a referee may matter more than a score.", "Some SMEs read CVs on a phone. Keep it short and easy to read."],
    weights: { ats: 5, edu: 10, exp: 25, skills: 20, ach: 10, pres: 10, fit: 20 },
    maxWords: 750
  }
};
const VIEW = {
  summary: {
    gov: "A panel working through many applications may treat adjectives without evidence as filler and move straight to the qualifications.",
    ngo: "An NGO panel is likely to look for your sector, project context and one result in the first lines. Personality words alone give them nothing to score.",
    un: "Competency-based screening looks for evidence, not self-description. A summary of adjectives leaves nothing to match against the vacancy.",
    private: "A hiring manager reading a stack of CVs often decides in the first few lines. A summary without a role, a number or a proof point blends in.",
    sme: "An owner-manager wants to know quickly what you can do and whether you are dependable. Adjectives alone answer neither."
  },
  ach: {
    gov: "A duty list shows what the post involved but not how well you did it. Figures help a scorer separate you from other candidates with similar duties.",
    ngo: "Donor-funded organisations run on results. Duties without numbers (people reached, reports produced, funds handled) look like activity, not impact.",
    un: "Results-based statements are the norm. Bullets with no scale or outcome are hard to score against a competency.",
    private: "Employers in sales and services look for targets, volumes and growth. Without numbers it is hard to tell a strong performer from an average one.",
    sme: "Owners value practical proof such as volumes handled, customers served or time saved. A figure makes a claim believable."
  },
  edu: {
    gov: "Panels check qualifications against the advert's minimum. A missing grade, year or institution makes an entry harder to verify and it may be treated as not shown.",
    ngo: "Panels usually verify the level and field of study. Missing detail raises doubt about whether the qualification meets the minimum.",
    un: "Degree level, field and institution are normally checked first. Incomplete entries can be read as not meeting the requirement.",
    private: "Recruiters check that the qualification matches the advert. Missing detail slows that check and can cost you the shortlist.",
    sme: "Less formal, but a clear qualification still helps when several candidates have similar experience."
  },
  skills: {
    gov: "Skills listed with no matching duty in your history may be treated as unsupported, which can weaken the credibility of the whole CV.",
    ngo: "Panels tend to cross-check skills against projects. A skill with no matching experience may be probed at interview or ignored.",
    un: "Skills that are not backed by a role or achievement are usually disregarded in competency assessment.",
    private: "A skills list that doesn't match your jobs reads like keyword stuffing, and an interviewer may test it.",
    sme: "An owner may test a listed skill in a short practical task. A claim you cannot back up costs trust."
  },
  req: {
    gov: "Public-service shortlisting commonly works through the advert's minimum requirements one by one. A requirement with no clear evidence is likely to be marked as not met.",
    ngo: "NGO panels commonly score against the listed essentials. A gap on an essential can end the process before the rest of your CV is read.",
    un: "Screening is typically criterion by criterion against the vacancy. Essentials with no evidence can lead to non-selection.",
    private: "Requirement and keyword filters often run before a person reads the CV. Missing essentials may filter you out.",
    sme: "An owner may read quickly for the few things that matter most. If those are not visible, they may not look further."
  },
  ref: {
    gov: "Public employers commonly check references. Missing or untraceable contacts can slow or stop the process.",
    ngo: "NGOs commonly take up references, sometimes before an offer. Untraceable referees can delay or end your application.",
    un: "Reference checks are standard at the final stage. Contacts you have not listed cannot be checked.",
    private: "Many employers check references after interview. Complete contact details keep the process moving.",
    sme: "A small business often phones one referee. If it can't reach anyone, that can decide the matter."
  }
};

/* ================= environment fit checks ================= */
const NGO_TERMS = /\b(project|programme|program|community|communities|beneficiar\w+|donor|stakeholder\w*|district|village|field|monitoring|evaluation|m&e|grant|proposal|ngo|civil society|livelihood\w*|outreach|workshop\w*)\b/gi;
const REPORT_RE = /\b(report\w*|monitoring|evaluation|m&e|documentation|data collection|minutes|proposal\w*|survey\w*|assessment\w*)\b/i;
const COMMERCIAL_RE = /\b(sales|sold|selling|revenue|target\w*|customers?|clients?|market\w*|commission|profit|budget|orders?|growth|retention)\b/i;
const LANG_LEVEL_RE = /\b(fluent|native|mother tongue|proficient|intermediate|basic|advanced|conversational|working knowledge|excellent|good)\b/i;
const DATA_TOOLS = /\b(excel|kobo|odk|dhis2?|spss|stata|power bi|access|sage|quickbooks|pastel|word|powerpoint)\b/i;
const st = (v, pass, partial) => v >= pass ? "pass" : v >= partial ? "partial" : "fail";

function buildFitChecks(env, c) {
  const L = [];
  const add = (id, label, state, detail, fix) => L.push({ id, label, state, detail, fix });
  const eduDetail = c.edu.length ? c.edu.reduce((a, e) => a + (e.institution ? 0.5 : 0) + (e.year ? 0.5 : 0), 0) / c.edu.length : 0;
  const refEnough = n => c.refs.withContact >= n ? "pass" : c.refs.withContact >= 1 ? "partial" : "fail";
  const refDetail = c.refs.onRequest && !c.refs.entries ? "Your CV says references are available on request and names nobody." : c.refs.withContact + " referee" + (c.refs.withContact === 1 ? "" : "s") + " with contact details found.";
  const metricShare = c.bullets.length ? c.bullets.filter(b => b.hasMetric).length / c.bullets.length : 0;
  const actionMetric = c.bullets.length ? c.bullets.filter(b => b.hasMetric && b.action).length / c.bullets.length : 0;
  const expText = c.jobs.map(j => j.text).join(" ");
  const jobsDated = c.jobs.length && c.jobs.every(j => j.monthYear);
  const bulletsPerJob = c.jobs.length ? c.jobs.filter(j => j.bullets.length >= 2).length / c.jobs.length : 0;
  if (env === "gov") {
    add("g1", "Each qualification can be verified (institution and year)", st(eduDetail, 0.9, 0.6), c.edu.length ? "Institution and year found for " + pct(eduDetail) + "% of qualification entries." : "No qualification entries found.", "Write each qualification as: title, institution, year (and grade or credits).");
    const msce = c.edu.find(e => e.isMSCE);
    add("g2", "MSCE credits or other grades stated", msce ? (msce.grade ? "pass" : "fail") : "na", msce ? (msce.grade ? "Credits or grade shown." : "Your MSCE entry does not say how many credits you earned.") : "No MSCE entry found.", "Add the number of credits, for example \"MSCE – 7 credits\", and the year.");
    const gap = c.gaps.length;
    add("g3", "Complete dated employment history without unexplained gaps", !c.jobs.length ? "fail" : gap ? "partial" : "pass", !c.jobs.length ? "No dated roles found." : gap ? "Gaps longer than 6 months: " + c.gaps.join("; ") : "No gaps longer than 6 months between dated roles.", "List every role with month and year. Explain any gap, for example study, caring or job search.");
    add("g4", "Three traceable referees with contact details", refEnough(3), refDetail, "List three referees with name, position, organisation, phone and email. Tell them to expect a call.");
    add("g5", "Duties described for each post", st(bulletsPerJob, 0.9, 0.5), Math.round(bulletsPerJob * c.jobs.length) + " of " + c.jobs.length + " roles have at least two duty bullets.", "Give every post at least two or three duty bullets, newest post first.");
    add("g6", "Essential requirements of the advert are evidenced", c.essential.total ? st(c.essential.met / c.essential.total, 0.95, 0.6) : "na", c.essential.total ? c.essential.met + " of " + c.essential.total + " essential requirements evidenced." : "No essential requirements detected.", "Address each essential requirement in the advert with a clear line in your CV.");
  } else if (env === "ngo") {
    const hits = (expText.match(NGO_TERMS) || []).length;
    add("n1", "Project, programme, donor or community context", st(hits, 3, 1), hits + " project or community terms found in your work history.", "If you have worked on a project, programme or with communities, name it, say who funded or ran it and what your part was. Do not claim it if you have not.");
    add("n2", "Report writing, M&E or documentation evidence", REPORT_RE.test(expText) ? "pass" : "fail", REPORT_RE.test(expText) ? "Reporting or documentation language found." : "No reporting, monitoring or documentation evidence in your jobs.", "If you wrote reports, minutes, proposals or kept records, say which, how often and for whom.");
    add("n3", "Results with scale (people reached, activities, funds)", st(metricShare, 0.3, 0.15), pct(metricShare) + "% of your bullets contain a figure.", "Add numbers: people reached, sessions run, reports produced, amounts handled.");
    add("n4", "Languages stated", c.hasLanguages ? "pass" : "fail", c.hasLanguages ? "Languages section found." : "No languages section found.", "List English and the local languages you speak, with a level for each.");
    const tools = DATA_TOOLS.test(c.skillsText) && DATA_TOOLS.test(expText);
    add("n5", "Computer or data tools listed and shown in use", tools ? "pass" : DATA_TOOLS.test(c.skillsText) ? "partial" : "fail", tools ? "Tools appear in both skills and experience." : DATA_TOOLS.test(c.skillsText) ? "Tools are listed but no job shows you using them." : "No computer or data tools listed.", "Name the tools you use (Excel, Word, KoBo, ODK, DHIS2) and add a bullet showing a real use.");
    add("n6", "Traceable referees (at least two)", refEnough(2), refDetail, "List at least two referees with phone and email.");
  } else if (env === "un") {
    add("u1", "Results-based achievement statements (action plus figure)", st(actionMetric, 0.35, 0.15), pct(actionMetric) + "% of bullets start with an action and carry a figure.", "Rewrite bullets as: action verb, what, how many or how much, result.");
    add("u2", "Languages with proficiency levels", c.hasLanguages && LANG_LEVEL_RE.test(c.languagesText) ? "pass" : c.hasLanguages ? "partial" : "fail", c.hasLanguages ? (LANG_LEVEL_RE.test(c.languagesText) ? "Languages with levels found." : "Languages listed without levels.") : "No languages section found.", "List each language with a level such as Fluent, Intermediate or Basic.");
    add("u3", "Complete chronology with month and year for every role", jobsDated ? "pass" : c.jobs.length ? "partial" : "fail", jobsDated ? "All roles carry month and year." : c.jobs.length ? "Some roles lack month and year." : "No dated roles found.", "Use month and year for the start and end of every role.");
    const degree = c.edu.some(e => /bachelor|b\.?sc|bsc|degree|master|msc|mba|ph\.?d/i.test(e.label));
    const degreeDone = c.edu.some(e => /bachelor|b\.?sc|bsc|degree|master|msc|mba|ph\.?d/i.test(e.label) && !e.inProgress);
    add("u4", "Degree-level qualification shown (if the vacancy requires one)", degreeDone ? "pass" : degree ? "partial" : "fail", degreeDone ? "Completed degree-level qualification found." : degree ? "Degree shown as in progress." : "No degree-level qualification found.", "If the vacancy sets a degree minimum, check that you meet it. If you are still studying, give the expected completion date.");
    add("u5", "Competency language matches the vacancy", st(c.kwScore, 0.65, 0.4), pct(c.kwScore) + "% of advert keywords appear in your CV.", "Use the vacancy's own wording where it is true.");
    add("u6", "Concise (about three pages or fewer)", c.cvWords <= 1200 ? "pass" : c.cvWords <= 1500 ? "partial" : "fail", c.cvWords + " words.", "Cut older or unrelated detail.");
  } else if (env === "private") {
    const comm = COMMERCIAL_RE.test(expText) && c.bullets.filter(b => b.hasMetric).length >= 2;
    add("p1", "Commercial results (sales, targets, customers, volumes)", comm ? "pass" : COMMERCIAL_RE.test(expText) ? "partial" : "fail", comm ? "Commercial language with figures found." : COMMERCIAL_RE.test(expText) ? "Commercial language found but few figures." : "No commercial results found.", "Add targets, volumes, customers served or revenue figures for each role.");
    add("p2", "Concise (one to two pages)", c.cvWords <= 850 ? "pass" : c.cvWords <= 1100 ? "partial" : "fail", c.cvWords + " words.", "Aim for about 400 to 800 words. Keep the newest roles in most detail.");
    const cert = c.certs.length > 0 || /\b(acca|cima|cpa|cips|pmp|prince2|ccna|cissp|cfa)\b/i.test(c.cv) || DATA_TOOLS.test(c.skillsText);
    add("p3", "Certifications, training or recognised tools", cert ? "pass" : "fail", cert ? "Certifications, training or tools found." : "No certifications, training or tools found.", "Add relevant short courses, certifications and the software you use.");
    const titled = c.jobs.length && c.jobs.every(j => j.title);
    add("p4", "Clear job title for each role", titled ? "pass" : c.jobs.length ? "partial" : "fail", titled ? "Each role has a title." : "Some roles show no separate job title.", "Put the exact job title on its own line under each employer.");
    add("p5", "Keywords aligned with the advert", st(c.kwScore, 0.6, 0.4), pct(c.kwScore) + "% of advert keywords appear in your CV.", "Use the advert's own wording where it is true.");
    add("p6", "Customer or stakeholder dealings shown", /customer|client|stakeholder|supplier/i.test(expText) ? "pass" : "fail", /customer|client|stakeholder|supplier/i.test(expText) ? "Customer or supplier dealings found." : "No customer or supplier dealings found.", "Show who you served or worked with.");
  } else {
    const act = c.bullets.length ? c.bullets.filter(b => b.action).length / c.bullets.length : 0;
    add("s1", "Hands-on duties described in plain terms", st(act, 0.7, 0.4), pct(act) + "% of bullets start with an action verb.", "Start each bullet with what you did, for example Sold, Delivered, Prepared, Repaired.");
    const longRole = c.jobs.some(j => j.start !== null && j.end !== null && j.end - j.start >= 11);
    add("s2", "Reliability shown (a role of a year or more)", longRole ? "pass" : "fail", longRole ? "At least one role of 12 months or more." : "No role of 12 months or more found.", "Show how long you stayed, and any promotion or added responsibility.");
    add("s3", "Versatility (several distinct skills)", c.skillItems.length >= 4 ? "pass" : c.skillItems.length >= 2 ? "partial" : "fail", c.skillItems.length + " skills listed.", "List four or more practical skills you can really demonstrate.");
    add("s4", "Traceable referees (at least two)", refEnough(2), refDetail, "List at least two referees with phone numbers.");
    add("s5", "Short and direct (about two pages)", c.cvWords <= 750 ? "pass" : c.cvWords <= 950 ? "partial" : "fail", c.cvWords + " words.", "Aim for under 700 words.");
    add("s6", "Day-to-day duties in the advert are covered", c.dutyScore === null ? "na" : st(c.dutyScore, 0.65, 0.45), c.dutyScore === null ? "No duty list found in the advert." : pct(c.dutyScore) + " out of 100 duty coverage.", "Show evidence for each duty in the advert that you have really done.");
  }
  return L;
}

/* ================= main analysis ================= */
function analyze(jdRaw, cvRaw, envId, now) {
  now = now || new Date();
  const env = ENVS[envId] || ENVS.private;
  const body = cleanJD(jdRaw), cv = cvRaw;
  const title = getTitle(body);
  const parsed = parseJD(body);
  const has = makeMatcher(cv);
  const sec = parseCV(cv);
  const cvLines = cv.split(/\r?\n/).map(t => t.trim()).filter(Boolean).map(t => ({ text: t, has: makeMatcher(t) }));

  const termsOf = text => {
    const seen = new Map();
    for (const w of words(text)) {
      if (STOP.has(w) || BOILER.has(w) || w.length < 3 || /^\d+$/.test(w)) continue;
      const s = stem(w);
      if (!seen.has(s)) seen.set(s, w);
    }
    return [...seen].map(([s, w]) => ({ stem: s, form: w, found: has(s) }));
  };
  const evidenceFor = terms => {
    let best = null, bestN = 0;
    for (const l of cvLines) {
      const n = terms.filter(t => l.has(t.stem)).length;
      if (n > bestN) { bestN = n; best = l.text; }
    }
    return bestN ? trimQ(best, 170) : null;
  };

  // advert items
  const items = advertItems(parsed).map(it => {
    const terms = termsOf(it.text);
    const found = terms.filter(t => t.found).length;
    const cover = terms.length ? found / terms.length : 0;
    return { ...it, terms, cover, status: cover >= 0.6 ? "met" : cover >= 0.25 ? "partial" : "missing", missing: terms.filter(t => !t.found).map(t => t.form), evidence: evidenceFor(terms) };
  }).filter(it => it.terms.length);
  const duties = items.filter(i => i.kind === "duty");
  const reqLines = items.filter(i => i.kind === "req");
  const dutyScore = duties.length ? duties.reduce((a, d) => a + Math.min(1, d.cover * 1.25), 0) / duties.length : null;

  // keywords
  const counts = new Map();
  const addText = (text, weight) => {
    for (const w of words(text)) {
      if (STOP.has(w) || BOILER.has(w) || w.length < 3 || /^\d+$/.test(w)) continue;
      const s = stem(w);
      const e = counts.get(s) || { n: 0, forms: new Map(), order: counts.size };
      e.n += weight; e.forms.set(w, (e.forms.get(w) || 0) + 1); counts.set(s, e);
    }
  };
  for (const l of parsed) {
    if (l.kind === "benefit" || l.sub || l.heading || isReqLine(l.text) || /\b(reports? to|reporting to|report directly|shall to|accountable to|answerable to)\b/i.test(l.text)) continue;
    addText(l.text, l.kind === "duty" || l.kind === "req" ? 2 : 1);
  }
  addText(title, 3);
  const kwAll = [...counts].map(([s, e]) => ({ stem: s, n: e.n, order: e.order, form: [...e.forms].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => b.n - a.n || a.order - b.order).slice(0, 24).map(k => ({ ...k, found: has(k.stem) }));
  const kwTotal = kwAll.reduce((a, k) => a + k.n, 0);
  const kwScore = kwAll.length ? clamp01((kwAll.filter(k => k.found).reduce((a, k) => a + k.n, 0) / kwTotal) * 1.1) : 0;

  // qualification checks
  const lineAt = idx => { let pos = 0; for (const l of cv.split(/\r?\n/)) { if (idx < pos + l.length + 1) return l.trim(); pos += l.length + 1; } return ""; };
  const checks = [];
  for (const q of QUALS) {
    const jm = body.match(q.jd);
    if (!jm) continue;
    const near = body.slice(Math.max(0, jm.index - 80), jm.index + 120);
    const required = !(/prefer|advantage|desirable|an added|asset/i.test(near) && !/must|minimum|required/i.test(near));
    const cm = cv.match(q.cv);
    let status = "missing";
    if (cm) {
      const w = cv.slice(Math.max(0, cm.index - 60), cm.index + 90);
      status = q.progress && PROG_RE.test(w) ? "partial" : "met";
    }
    checks.push({ kind: "qual", label: q.label, status, required, evidence: cm ? trimQ(lineAt(cm.index), 170) : null });
  }
  for (const m of body.matchAll(PRO_CERT)) {
    const tag = m[1].toUpperCase();
    if (checks.some(c => c.label === tag + " certification")) continue;
    const found = new RegExp("\\b" + m[1] + "\\b", "i").test(cv);
    checks.push({ kind: "qual", label: tag + " certification", status: found ? "met" : "missing", required: true, evidence: null });
  }
  const need = experienceRequired(body);
  const have = experienceYears(cv, now);
  if (need) checks.push({ kind: "exp", label: need + " year" + (need > 1 ? "s" : "") + " of relevant experience", status: have === null ? "nodates" : have >= need ? "met" : have >= need * 0.75 ? "partial" : "short", required: true, need, have });
  const ageM = body.match(/between\s+(\d{2})\s*(?:and|to|-|–)\s*(\d{2})\s*(?:years|yrs)?/i);
  if (ageM) checks.push({ kind: "manual", label: "Age between " + ageM[1] + " and " + ageM[2], status: /date of birth|\bdob\b/i.test(cv) ? "met" : "manual", note: "Confirm you fit. Your CV does not show a date of birth." });
  const crM = body.match(/(\w+)?\s*\(?(\d+)\)?\s*credits?/i);
  if (crM) checks.push({ kind: "manual", label: "At least " + crM[2] + " credits at MSCE", status: /\bcredits?\b/i.test(cv) ? "met" : "manual", note: "Say how many credits you earned, for example \"MSCE – 7 credits\"." });
  const knockout = checks.filter(c => c.kind === "qual" && c.required && c.status === "missing");
  const expShort = checks.find(c => c.kind === "exp" && c.status === "short");

  // essential summary
  const essChecks = checks.filter(c => c.kind !== "manual" && c.required !== false);
  const essLines = reqLines.filter(r => !r.desirable);
  const essMet = essChecks.filter(c => c.status === "met").length + essLines.filter(r => r.status === "met").length;
  const essTotal = essChecks.length + essLines.length;
  const essMissingLines = essLines.filter(r => r.status === "missing");
  const essential = { met: essMet, total: essTotal };

  // CV structure
  const summaryText = (sec.summary || []).join(" ").replace(/\s+/g, " ").trim();
  const expLines = sec.experience || Object.keys(sec).filter(k => !["education", "skills", "languages", "referees", "summary", "certs", "interests"].includes(k)).flatMap(k => sec[k]);
  const jobsOnly = parseJobs(expLines, now);
  const allBullets = jobsOnly.flatMap(j => j.bullets).map(classifyBullet);
  const edu = parseEducation(sec.education || []);
  const skillItems = parseSkills(sec.skills || []);
  const refs = parseReferees(sec.referees || []);
  const languagesText = (sec.languages || []).join(" ");
  const certs = (sec.certs || []).map(x => x.trim()).filter(Boolean);
  const cvWords = wc(cv);

  // gaps
  const dated = jobsOnly.filter(j => j.start !== null && j.end !== null).sort((a, b) => a.start - b.start);
  const gaps = [];
  let reach = null;
  for (const j of dated) {
    if (reach !== null && j.start - reach > 6) gaps.push(Math.round(j.start - reach) + " months before " + j.employer);
    reach = reach === null ? j.end : Math.max(reach, j.end);
  }

  // skills support
  const expMatcher = makeMatcher([...jobsOnly.map(j => j.text), ...certs, ...(sec.education || []), ...(sec.volunteer || [])].join(" "));
  const skillRows = skillItems.map(s => {
    const terms = words(s).filter(w => !STOP.has(w) && !BOILER.has(w) && w.length >= 3).map(stem);
    const tool = TOOL_RE.test(s.trim());
    const generic = GENERIC_SKILL_RE.test(s);
    const sup = terms.length ? terms.filter(t => expMatcher(t)).length / terms.length : 1;
    return { text: s, tool, generic, supported: sup >= 0.33, support: sup };
  }).filter(r => r.text);
  const unsupported = skillRows.filter(r => !r.supported && !r.generic && !r.tool);
  const toolsUnshown = skillRows.filter(r => !r.supported && r.tool);
  const genericSkills = skillRows.filter(r => r.generic);
  const supportedShare = skillRows.length ? skillRows.reduce((a, r) => a + (r.supported ? 1 : (r.tool ? 0.5 : (r.generic ? 0.3 : 0))), 0) / skillRows.length : 0;
  const genericShare = skillRows.length ? genericSkills.length / skillRows.length : 0;

  // role relevance
  const topKw = kwAll.slice(0, 12);
  const jobRel = jobsOnly.map(j => {
    const m = makeMatcher(j.text);
    const hit = topKw.filter(k => m(k.stem)).length;
    return { job: j, rel: topKw.length ? hit / topKw.length : 0 };
  });
  const bestJob = jobRel.slice().sort((a, b) => b.rel - a.rel)[0] || null;
  const topRel = jobRel.map(j => j.rel).sort((a, b) => b - a).slice(0, 2);
  const roleRel = topRel.length ? topRel.reduce((a, b) => a + b, 0) / topRel.length : 0;
  const lastEnd = dated.length ? Math.max(...dated.map(j => j.end)) : null;
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const recency = lastEnd === null ? 0.3 : (nowIdx - lastEnd <= 12 ? 1 : nowIdx - lastEnd <= 36 ? 0.5 : 0.2);
  const titleStems = title ? words(title).filter(w => !STOP.has(w)).map(stem) : [];
  const jobTitles = jobsOnly.map(j => [j.title, j.employer].join(" ")).join(" ");
  const titleMatch = titleStems.length ? (() => { const m = makeMatcher(jobTitles); return titleStems.filter(m).length / titleStems.length; })() : 1;

  // summary analysis
  const sumLower = summaryText.toLowerCase();
  const buzzHits = BUZZ.filter(b => new RegExp("\\b" + b + "\\b", "i").test(summaryText)).map(b => b.replace("[sz]", "s"));
  const sumMatcher = makeMatcher(summaryText);
  const spec = {
    years: /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*years?\b|nearly|over (?:three|four|five|\d)/i.test(summaryText),
    qual: QUAL_LINE.test(summaryText),
    metric: hasMetric(summaryText.replace(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*years?\b/gi, "")),
    role: titleStems.length ? titleStems.every(sumMatcher) : true,
    domain: kwAll.filter(k => sumMatcher(k.stem)).length >= 2
  };
  const specN = Object.values(spec).filter(Boolean).length;
  const sumWords = wc(summaryText);
  const sumLenOk = sumWords >= 35 && sumWords <= 90 ? 1 : sumWords >= 20 && sumWords <= 120 ? 0.6 : 0.2;
  const sumQuality = !summaryText ? 0 : clamp01(specN / 5 * 0.6 + sumLenOk * 0.15 + (1 - Math.min(1, buzzHits.length / 4)) * 0.25);
  const sumGeneric = summaryText && (specN <= 2 || buzzHits.length >= 4 || (buzzHits.length >= 2 && !spec.metric));

  // dates consistency
  const fmtSet = new Set();
  if (new RegExp("(" + MON + ")[a-z]*\\.?\\s+\\d{4}", "i").test(cv)) fmtSet.add("Month YYYY");
  if (/\b\d{1,2}\/\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(cv)) fmtSet.add("numeric");
  if (/(?:–|—|-|to)\s*(?:19|20)\d{2}\b/.test(cv.replace(new RegExp("(" + MON + ")[a-z]*\\.?\\s+\\d{4}", "gi"), ""))) fmtSet.add("year only");
  const avgBullet = allBullets.length ? allBullets.reduce((a, b) => a + wc(b.text), 0) / allBullets.length : 0;
  const buzzAll = BUZZ.filter(b => new RegExp("\\b" + b + "\\b", "i").test(cv)).length;

  // ATS readiness
  const lineHas = re => cv.split(/\r?\n/).some(l => re.test(l.trim()));
  const headsFound = { summary: !!sec.summary, experience: !!sec.experience, education: !!sec.education, skills: !!sec.skills };
  const headsN = Object.values(headsFound).filter(Boolean).length;
  const emailOk = /[\w.+-]+@[\w-]+\.[\w.]+/.test(cv), phoneOk = /\+?\d[\d\s().-]{7,}\d/.test(cv);
  const colLines = cv.split(/\r?\n/).filter(l => /\S\s{4,}\S/.test(l)).length;
  const glyphs = (cv.match(/[─-╿-■-◿]/g) || []).length;
  const bulletsN = cv.split(/\r?\n/).filter(l => BULLET_RE.test(l)).length;
  const hazard = colLines >= 3 || glyphs > 12;

  const C = { cv, edu, jobs: jobsOnly, bullets: allBullets, refs, gaps, essential, hasLanguages: !!sec.languages, languagesText, skillsText: (sec.skills || []).join(" "), skillItems, kwScore, cvWords, dutyScore, certs };
  const fit = buildFitChecks(envId in ENVS ? envId : "private", C);

  /* ----- category scoring ----- */
  const comp = (label, score, weight, note) => ({ label, score: clamp01(score), weight, note });
  const cat = (key, label, max, comps) => {
    const ws = comps.reduce((a, c) => a + c.weight, 0) || 1;
    const p = comps.reduce((a, c) => a + c.score * c.weight, 0) / ws;
    return { key, label, max, pct: p, pts: p * max, comps, deductions: comps.filter(c => c.score < 0.95).map(c => ({ label: c.label, lost: (1 - c.score) * c.weight / ws * max, note: c.note })).sort((a, b) => b.lost - a.lost) };
  };
  const W = env.weights;
  const atsC = [
    comp("Contact details (email and phone)", ((emailOk ? 1 : 0) + (phoneOk ? 1 : 0)) / 2, 3, !emailOk ? "No email address found." : !phoneOk ? "No phone number found." : ""),
    comp("Standard section headings", headsN / 4, 3, "Missing headings: " + Object.keys(headsFound).filter(k => !headsFound[k]).join(", ")),
    comp("Dates the ATS can read (month and year)", have !== null ? 1 : (/\b(19|20)\d{2}\b/.test(cv) ? 0.4 : 0), 2, "Jobs need dates like \"March 2025 – Present\"."),
    comp("Bullet points for duties", bulletsN >= 3 ? 1 : bulletsN ? 0.5 : 0, 1, "Few or no bullet points found."),
    comp("No layout that breaks parsing", hazard ? 0.3 : 1, 2, "Text shows column gaps or unusual symbols that suggest a table or columns."),
    comp("Job title appears in CV", titleStems.length ? (titleStems.every(has) ? 1 : 0) : 1, 1, "The advert's job title \"" + title + "\" is not in your CV."),
    comp("Length suits this employer type", cvWords <= env.maxWords ? (cvWords >= 200 ? 1 : 0.5) : cvWords <= env.maxWords * 1.25 ? 0.5 : 0.1, 1, cvWords + " words against about " + env.maxWords + " for this employer type.")
  ];
  const eduC = [];
  if (!sec.education) eduC.push(comp("Education section present", 0, 5, "No Education section found."));
  else if (!edu.length) eduC.push(comp("Qualifications identifiable", 0.3, 5, "No recognisable qualification found in the Education section."));
  else edu.forEach(e => {
    const s = (e.institution ? 0.35 : 0) + (e.year ? 0.25 : 0) + (e.inProgress ? 0.25 : (e.grade ? 0.25 : 0)) + (e.completion ? 0.15 : 0);
    const miss = [!e.institution && "institution", !e.year && "year", (!e.inProgress && !e.grade) && (e.isMSCE ? "credits" : "grade"), !e.completion && "expected completion date"].filter(Boolean);
    eduC.push(comp(trimQ(e.label, 60), s, 2, "Missing: " + miss.join(", ")));
  });
  const qualChecks = checks.filter(c => c.kind === "qual");
  if (qualChecks.length) eduC.push(comp("Advert's qualification requirements met", qualChecks.reduce((a, c) => a + (c.status === "met" ? 1 : c.status === "partial" ? 0.6 : (c.required ? 0 : 0.7)), 0) / qualChecks.length, 3, qualChecks.filter(c => c.status !== "met").map(c => c.label).join(", ") + " not fully shown."));
  const expC = [];
  if (dutyScore !== null) expC.push(comp("Advert duties evidenced in your CV", dutyScore, 4, duties.filter(d => d.status !== "met").length + " of " + duties.length + " duties have little or no evidence."));
  else expC.push(comp("Advert keywords evidenced", kwScore, 4, "No duty list found, so keywords were used instead."));
  const exChk = checks.find(c => c.kind === "exp");
  if (exChk) expC.push(comp("Years of experience required", exChk.status === "met" ? 1 : exChk.status === "partial" ? 0.7 : exChk.status === "nodates" ? 0.3 : Math.min(0.5, (exChk.have || 0) / exChk.need * 0.5), 3, exChk.status === "nodates" ? "No month and year dates to count." : "About " + (exChk.have || 0).toFixed(1) + " years against " + exChk.need + " required."));
  expC.push(comp("Most relevant roles match the advert", jobsOnly.length ? Math.min(1, roleRel * 2) : 0, 3, jobsOnly.length ? "Your two most relevant roles use " + pct(roleRel) + "% of the advert's top keywords." : "No dated roles found."));
  expC.push(comp("Recent experience", recency, 1, lastEnd === null ? "No dated roles found." : "Your latest role ended more than a year ago."));
  if (titleStems.length) expC.push(comp("Previous job titles resemble the target", titleMatch, 1, "No previous job title resembles \"" + title + "\"."));
  const skC = [
    comp("Advert keywords found in your CV", kwScore, 4, kwAll.filter(k => !k.found).length + " of " + kwAll.length + " advert keywords are missing."),
    comp("Skills backed by your work history", skillRows.length ? supportedShare : 0, 3, skillRows.length ? unsupported.length + " listed skills have no support in your jobs." : "No Skills section found."),
    comp("Specific skills rather than generic claims", skillRows.length ? 1 - genericShare : 0, 2, genericSkills.length + " of " + skillRows.length + " skills are generic personality claims."),
    comp("Skills organised and listed", skillRows.length >= 4 ? 1 : skillRows.length ? 0.5 : 0, 1, "Fewer than four skills listed.")
  ];
  const nB = allBullets.length;
  const mShare = nB ? allBullets.filter(b => b.hasMetric).length / nB : 0;
  const rShare = nB ? allBullets.filter(b => b.hasResult).length / nB : 0;
  const wShare = nB ? allBullets.filter(b => b.weak).length / nB : 0;
  const aShare = nB ? allBullets.filter(b => b.action).length / nB : 0;
  const achC = nB ? [
    comp("Bullets with a measurable figure", Math.min(1, mShare / 0.4), 5, allBullets.filter(b => b.hasMetric).length + " of " + nB + " bullets contain a figure. Aim for about 40%."),
    comp("Bullets that state a result", Math.min(1, rShare / 0.25), 2, allBullets.filter(b => b.hasResult).length + " of " + nB + " bullets state an outcome."),
    comp("No weak openings (\"responsible for\")", 1 - wShare, 1, Math.round(wShare * nB) + " bullets open weakly."),
    comp("Bullets start with an action verb", Math.min(1, aShare / 0.7), 2, Math.round(aShare * nB) + " of " + nB + " bullets start with an action verb.")
  ] : [comp("Achievements can be found", 0, 5, "No dated roles with duty bullets were found.")];
  const presC = [
    comp("Professional summary is specific", sumQuality, 5, !summaryText ? "No professional summary found." : "Summary is " + (sumGeneric ? "generic" : "partly specific") + "."),
    comp("Consistent date format", fmtSet.size <= 1 ? 1 : 0.5, 1, "Date formats mixed: " + [...fmtSet].join(", ") + "."),
    comp("Bullets of readable length", avgBullet === 0 ? 0.5 : (avgBullet >= 8 && avgBullet <= 28 ? 1 : 0.5), 1, "Average bullet is " + Math.round(avgBullet) + " words."),
    comp("Few unsupported personality words", 1 - Math.min(1, buzzAll / 8), 1, buzzAll + " personality adjectives found across the CV.")
  ];
  const fitScored = fit.filter(f => f.state !== "na");
  const fitC = fitScored.map(f => comp(f.label, f.state === "pass" ? 1 : f.state === "partial" ? 0.5 : 0, 1, f.detail));
  const cats = [
    cat("ats", "ATS compatibility", W.ats, atsC),
    cat("edu", "Education and qualifications", W.edu, eduC),
    cat("exp", "Relevant experience", W.exp, expC),
    cat("skills", "Skills and competencies", W.skills, skC),
    cat("ach", "Achievements and measurable results", W.ach, achC),
    cat("pres", "Professional presentation", W.pres, presC),
    cat("fit", "Fit for " + env.short + " employers", W.fit, fitC.length ? fitC : [comp("No checks applicable", 0.5, 1, "")])
  ];
  let total = Math.round(cats.reduce((a, c) => a + c.pts, 0));
  let capInfo = null;
  if (knockout.length) capInfo = { cap: 55, why: "Your CV does not show a qualification the advert requires (" + knockout.map(k => k.label).join(", ") + ")." };
  else if (expShort) capInfo = { cap: 70, why: "Your dated experience is below what the advert asks for." };
  else if (essMissingLines.length >= 2) capInfo = { cap: 65, why: essMissingLines.length + " essential requirements in the advert have no evidence in your CV." };
  if (capInfo && total > capInfo.cap) total = capInfo.cap; else capInfo = null;
  const verdict = total >= 85 ? { name: "Strong", tone: "good", text: "Competitive for shortlisting. Fix the smaller points below." }
    : total >= 70 ? { name: "Competitive with fixes", tone: "good", text: "You have a real chance, but weak points could cost you the shortlist." }
    : total >= 55 ? { name: "Needs work", tone: "warn", text: "Revise before applying. Several points are likely to count against you." }
    : { name: "Not ready", tone: "bad", text: "In its current form this CV is likely to be screened out for this vacancy." };

  const ctx = { env, envId, title, summaryText, sumWords, spec, buzzHits, sumGeneric, sumQuality, allBullets, jobs: jobsOnly, edu, skillRows, unsupported, genericSkills, refs, toolsUnshown, have, need, duties, reqLines, kwAll, checks, knockout, expShort, essMissingLines, mShare, bestJob, sec, hasLanguages: !!sec.languages, gaps, fmtSet, headsFound, emailOk, phoneOk, hazard, bulletsN, cvWords, certs, fit, dutyScore };
  const issues = buildIssues(ctx);
  const sections = buildSections(ctx, issues);
  const critical = issues.slice(0, 5);
  const rewrites = buildRewrites(ctx);
  const plan = buildPlan(ctx, issues);
  const strengths = buildStrengths(ctx);
  return { total, verdict, cap: capInfo, cats, issues, critical, sections, rewrites, plan, strengths, items, duties, reqLines, checks, kwAll, fit, env, envId, title, essential, jdWords: wc(jdRaw), cvWords, have, need, bestJob, unsupported, summaryText };
}

/* ================= issues ================= */
function buildIssues(c) {
  const V = (k) => VIEW[k][c.envId] || VIEW[k].private;
  const out = [];
  const add = o => out.push(o);
  for (const k of c.knockout) add({ id: "ko-" + k.label, sev: 98, section: "Education / Advert requirements", title: "Essential requirement not evidenced: " + k.label, current: null, why: "The advert lists this as a requirement and your CV does not show it. It is the fastest way to be screened out.", view: V("req"), fix: "If you hold it, add it under Education with the institution and year. If you do not, do not claim it. Check whether you qualify before spending time on this application.", before: null, after: k.label + " – [institution], [year]", reason: "Panels and filters look for this exact qualification." });
  if (!c.emailOk || !c.phoneOk) add({ id: "contact", sev: 96, section: "Contact details", title: !c.emailOk ? "No email address found" : "No phone number found", current: null, why: "Without working contact details nobody can invite you to interview.", view: "Employers cannot shortlist someone they cannot reach.", fix: "Put your phone number and email on the first lines of the CV.", before: null, after: "[Full name]\n[Phone] | [Email] | [Town, Malawi]", reason: "ATS software and recruiters look for contact details at the top." });
  const ex = c.checks.find(x => x.kind === "exp");
  if (ex && ex.status === "nodates") add({ id: "exp-nodates", sev: 88, section: "Work experience", title: "The advert asks for " + ex.need + " years of experience but your CV has no month and year dates", current: null, why: "Without dates the ATS and the panel cannot count your experience.", view: V("req"), fix: "Write each job as \"March 2025 – Present\".", before: null, after: "[Employer] [Month YYYY] – [Month YYYY]", reason: "Dates let your experience be counted." });
  if (ex && (ex.status === "short" || ex.status === "partial")) add({ id: "exp-short", sev: ex.status === "short" ? 86 : 60, section: "Work experience", title: "Experience looks " + (ex.status === "short" ? "short" : "close to the limit") + ": about " + (ex.have || 0).toFixed(1) + " years against " + ex.need + " required", current: null, why: "Minimum experience is usually checked first.", view: V("req"), fix: "Check that every relevant job, including part-time, family business and volunteer work, is listed with dates.", before: null, after: null, reason: "" });
  if (c.essMissingLines.length) add({ id: "ess-lines", sev: 82, section: "Advert requirements", title: "Your CV does not sufficiently address " + c.essMissingLines.length + " essential requirement" + (c.essMissingLines.length > 1 ? "s" : "") + " of this vacancy", current: c.essMissingLines.map(r => r.text).slice(0, 3).join(" | "), why: "No evidence was found in your CV for: " + c.essMissingLines.map(r => "\"" + trimQ(r.text, 70) + "\"").join("; ") + ".", view: V("req"), fix: "For each requirement you really meet, add a bullet or a skills line that proves it, using the advert's wording. If you do not meet it, say so to yourself before applying.", before: null, after: "• [Action verb] [what you did that meets this requirement], [where], [how many or how often].", reason: "Panels score against each essential in turn." });
  if (!c.summaryText) add({ id: "sum-none", sev: 74, section: "Professional summary", title: "Your CV has no professional summary", current: null, why: "The summary is the first thing read and the best place to match the advert.", view: V("summary"), fix: "Add a three to four line summary naming your field, your experience, your qualification and the job you want.", before: null, after: summaryDraft(c), reason: "It gives the reader and the ATS your fit in the first lines." });
  else if (c.sumGeneric) add({ id: "sum-generic", sev: Object.values(c.spec).filter(Boolean).length >= 3 ? 58 : 72, section: "Professional summary", title: Object.values(c.spec).filter(Boolean).length >= 3 ? "Your professional summary has facts but leans on too many personality words" : "Your professional summary is too generic", current: trimQ(c.summaryText, 260), why: "It scores " + Object.values(c.spec).filter(Boolean).length + " of 5 on specifics (years, qualification, a figure, the target role, advert keywords)" + (c.buzzHits.length ? " and relies on personality words: " + c.buzzHits.slice(0, 6).join(", ") + "." : "."), view: V("summary"), fix: "Replace adjectives with facts from your own CV: years, field, qualification and one proof point.", before: trimQ(c.summaryText, 200), after: summaryDraft(c), reason: "Facts can be checked and scored. Adjectives cannot." });
  else if (c.buzzHits.length >= 3) add({ id: "sum-buzz", sev: 52, section: "Professional summary", title: "Your summary leans on personality words that nothing in the CV proves", current: trimQ(c.summaryText, 260), why: "Words such as " + c.buzzHits.slice(0, 5).join(", ") + " are claims, not evidence.", view: V("summary"), fix: "Keep one or two and replace the rest with specifics.", before: trimQ(c.summaryText, 200), after: summaryDraft(c), reason: "Evidence persuades more than adjectives." });
  const nB = c.allBullets.length;
  if (nB && c.mShare < 0.3) {
    const weak = c.allBullets.filter(b => !b.hasMetric).slice(0, 3);
    add({ id: "ach", sev: c.mShare < 0.15 ? 68 : 56, section: "Work experience", title: "You show relevant duties but not measurable achievements", current: weak.map(b => "• " + trimQ(b.text, 120)).join("\n"), why: Math.round(c.mShare * nB) + " of your " + nB + " bullets contain a figure.", view: V("ach"), fix: "Add a number, a scale or a result to each bullet. Answer the questions under each rewrite and use only true figures.", before: null, after: null, reason: "Figures make a claim believable and scoreable." });
  }
  const badEdu = c.edu.filter(e => !e.institution || !e.year || (!e.inProgress && !e.grade) || !e.completion);
  if (badEdu.length) add({ id: "edu", sev: 55, section: "Education", title: "Your education section is missing qualification details", current: badEdu.map(e => e.label).join(" | "), why: badEdu.map(e => trimQ(e.label, 50) + " lacks " + [!e.institution && "institution", !e.year && "year", (!e.inProgress && !e.grade) && (e.isMSCE ? "number of credits" : "grade"), !e.completion && "expected completion date"].filter(Boolean).join(", ")).join("; ") + ".", view: V("edu"), fix: "Give each qualification: title, institution, year, and credits or grade. For a course in progress, give the expected completion date.", before: badEdu[0].label, after: eduTemplate(badEdu[0]), reason: "Complete entries can be verified and compared." });
  if (!c.sec.education) add({ id: "edu-none", sev: 70, section: "Education", title: "Your CV has no Education section", current: null, why: "Qualifications are checked on almost every vacancy.", view: V("edu"), fix: "Add an Education section with each qualification, institution, year and grade.", before: null, after: "[Qualification], [Institution], [Year], [Credits or grade]", reason: "ATS software and panels look for it by name." });
  if (c.unsupported.length) add({ id: "skills-unsup", sev: 62, section: "Skills", title: "Your skills section contains items that your work history does not support", current: c.unsupported.slice(0, 8).map(r => r.text).join(", "), why: c.unsupported.length + " listed skills never appear in any job or course: " + c.unsupported.slice(0, 6).map(r => "\"" + r.text + "\"").join(", ") + ".", view: V("skills"), fix: "Remove each skill you cannot back up, or add a bullet in a job that shows you using it. Only keep what you can demonstrate.", before: c.unsupported.slice(0, 3).map(r => r.text).join(", "), after: "• Used [skill] to [task] at [employer], [how often or how many].", reason: "Evidence turns a keyword into a credible skill." });
  if (c.toolsUnshown && c.toolsUnshown.length >= 2) add({ id: "skills-tools", sev: 36, section: "Skills", title: "Office tools are listed but never shown in use", current: c.toolsUnshown.map(r => r.text).join(", "), why: "Tools such as these are on most CVs. Without an example of use they carry little weight and may be tested at interview.", view: V("skills"), fix: "Name where you used them in a job bullet. Keep only the ones you can use confidently.", before: c.toolsUnshown.slice(0, 2).map(r => r.text).join(", "), after: "• Used [Excel / Word / Outlook] to [task] at [employer], [how often or how many].", reason: "One concrete example makes a tool believable." });
  if (!c.sec.skills) add({ id: "skills-none", sev: 58, section: "Skills", title: "Your CV has no Skills section", current: null, why: "ATS software and panels look for a Skills section by name.", view: V("skills"), fix: "Add a Skills section with 6 to 10 specific skills that your jobs support.", before: null, after: "• [Specific skill 1]\n• [Specific skill 2]", reason: "It is where keywords are read first." });
  if (c.genericSkills.length >= 2) add({ id: "skills-generic", sev: 40, section: "Skills", title: "Several skills are generic personality claims", current: c.genericSkills.map(r => r.text).slice(0, 6).join(", "), why: "Items such as these are on every CV and prove nothing.", view: V("skills"), fix: "Replace each with a concrete skill or show it in a bullet.", before: c.genericSkills[0].text, after: "[Concrete skill] shown by [example from your job]", reason: "Specific beats generic." });
  const weakDuties = c.duties.filter(d => d.status !== "met").sort((a, b) => a.cover - b.cover);
  if (weakDuties.length) add({ id: "duties", sev: Math.min(75, 45 + weakDuties.length * 4), section: "Work experience", title: "Your CV shows little or no evidence for " + weakDuties.length + " of " + c.duties.length + " advertised duties", current: weakDuties.slice(0, 4).map(d => d.text).join(" | "), why: "The panel will compare your CV with the duty list.", view: V("req"), fix: "For each duty you really have done, add a bullet using the advert's wording, with where and how often. Leave out the ones you have not done.", before: null, after: "• [Action verb] [duty in the advert's words], [where], [how often or how many].", reason: "Duty-by-duty matching is how many panels and filters score." });
  if (c.hazard) add({ id: "hazard", sev: 55, section: "Layout", title: "The CV text suggests columns, tables or symbols that ATS software may misread", current: null, why: "The pasted text has wide column gaps or unusual symbols.", view: "Applicant tracking systems can scramble columns and tables, so details may be read in the wrong order or lost.", fix: "Use one column. Avoid tables, text boxes, icons and graphics. Save as a Word document or a PDF made from a document.", before: null, after: null, reason: "" });
  if (!c.headsFound.experience || !c.headsFound.education) add({ id: "heads", sev: 50, section: "Layout", title: "Standard section headings are missing", current: null, why: "Missing: " + Object.keys(c.headsFound).filter(k => !c.headsFound[k]).join(", ") + ".", view: "ATS software looks for plain headings like Work Experience and Education.", fix: "Use plain headings: Professional Summary, Work Experience, Education, Skills.", before: null, after: null, reason: "" });
  if (c.title && c.summaryText && !c.spec.role) add({ id: "title", sev: 48, section: "Professional summary", title: "The job title \"" + c.title + "\" is not in your summary", current: null, why: "Many filters search for the job title.", view: V("summary"), fix: "Name the job you are applying for in the first line of your summary.", before: null, after: "… seeking the " + c.title + " position at [employer].", reason: "It tells the reader and the ATS what you are applying for." });
  for (const f of c.fit.filter(f => f.state === "fail" || f.state === "partial")) {
    const refCheck = ["g4", "n6", "s4"].includes(f.id);
    add({ id: "fit-" + f.id, sev: f.state === "fail" ? (refCheck ? 54 : 44) : 30, section: "Fit for " + c.env.short + " employers", title: f.label + (f.state === "partial" ? " (partly)" : " (missing)"), current: null, why: f.detail, view: refCheck ? VIEW.ref[c.envId] : "Employers of this type commonly look for this.", fix: f.fix, before: null, after: null, reason: "" });
  }
  if (c.fmtSet.size > 1) add({ id: "datefmt", sev: 28, section: "Presentation", title: "Date formats are mixed", current: [...c.fmtSet].join(" and "), why: "Mixed formats look careless and can confuse parsers.", view: "Consistency signals care.", fix: "Use one format everywhere, for example \"March 2025 – Present\".", before: null, after: null, reason: "" });
  return out.sort((a, b) => b.sev - a.sev);
}
function eduTemplate(e) {
  if (e.isMSCE) return "Malawi School Certificate of Education (MSCE) – [school], [year] – [number] credits";
  return trimQ(e.label, 70) + " – [institution], [year]" + (e.inProgress ? " (expected completion [Month YYYY])" : " – [grade or class]");
}
function yearsText(h) {
  if (h === null) return "[X] years";
  const f = Math.floor(h);
  return h - f >= 0.75 ? "nearly " + (f + 1) + " years" : f >= 1 ? "over " + f + " years" : "under a year";
}
function summaryDraft(c) {
  const kw = c.jobs.map(j => j.title).filter(t => t && t.length <= 45).slice(0, 2);
  const qual = c.edu.find(e => /bachelor|b\.?sc|diploma|degree|master/i.test(e.label));
  const qualS = qual ? (qual.inProgress ? "Currently studying " + trimQ(qual.label.replace(/\s*[–-]\s*in progress/i, ""), 90) + "." : trimQ(qual.label, 90) + ".") : (c.edu.find(e => e.isMSCE) ? "MSCE holder." : "[Your qualification].");
  const best = c.allBullets.find(b => b.hasMetric && b.action && /\d/.test(b.text)) || c.allBullets.find(b => b.hasMetric && b.action);
  const proof = best ? "Proof point from your CV: \"" + trimQ(best.text, 150) + "\"" : "[One proof point with a number].";
  return "[Your job title or field] with " + yearsText(c.have) + " of hands-on experience in [2 to 3 specific areas, for example from your roles: " + (kw.join(", ") || "your job titles") + "]. " + qualS + " " + proof + " Seeking the " + (c.title || "[job title]") + " position at [employer].";
}

/* ================= sections ================= */
function buildSections(c, issues) {
  const S = [];
  const has = id => issues.some(i => i.id === id || i.id.startsWith(id));
  const sec = (name, status, good, weak, change) => S.push({ name, status, good, weak, change });
  // contact
  const contactGood = [c.emailOk && "Email address present", c.phoneOk && "Phone number present"].filter(Boolean);
  const contactWeak = [!c.emailOk && "No email address", !c.phoneOk && "No phone number"].filter(Boolean);
  sec("Contact details", contactWeak.length ? "Weak" : "Good", contactGood, contactWeak, contactWeak.length ? ["Add your phone and email on the first lines."] : []);
  // summary
  if (!c.summaryText) sec("Professional summary", "Missing", [], ["No summary found."], ["Add a 3 to 4 line summary naming your field, experience, qualification and the job you want."]);
  else sec("Professional summary", c.sumGeneric ? "Weak" : c.buzzHits.length >= 3 ? "Needs work" : "Good", [c.spec.years && "States years of experience", c.spec.qual && "Mentions a qualification", c.spec.role && "Names the target role", c.spec.metric && "Contains a figure"].filter(Boolean), [!c.spec.metric && "No figure or proof point", c.buzzHits.length ? "Personality words: " + c.buzzHits.slice(0, 5).join(", ") : null, !c.spec.domain && "Few advert keywords"].filter(Boolean), ["Rewrite using facts from your CV (see the Rewrites tab)."]);
  // education
  if (!c.sec.education) sec("Education", "Missing", [], ["No Education section."], ["Add qualifications with institution, year and grade."]);
  else {
    const bad = c.edu.filter(e => !e.institution || !e.year || (!e.inProgress && !e.grade) || !e.completion);
    sec("Education", bad.length ? "Needs work" : "Good", c.edu.filter(e => e.institution && e.year).map(e => trimQ(e.label, 60) + ": institution and year shown"), bad.map(e => trimQ(e.label, 60) + ": " + [!e.institution && "institution", !e.year && "year", (!e.inProgress && !e.grade) && (e.isMSCE ? "credits" : "grade"), !e.completion && "expected completion"].filter(Boolean).join(", ") + " missing"), bad.length ? ["Complete each entry (see the Rewrites tab)."] : []);
  }
  // experience
  const nJobs = c.jobs.length;
  sec("Work experience", !nJobs ? "Missing" : c.dutyScore !== null && c.dutyScore < 0.5 ? "Needs work" : "Good", [nJobs && nJobs + " dated roles found", c.have !== null && "About " + c.have.toFixed(1) + " years of dated experience"].filter(Boolean), [!nJobs && "No dated roles with duties found", c.duties.filter(d => d.status === "missing").length && c.duties.filter(d => d.status === "missing").length + " advertised duties have no evidence", c.gaps.length && "Gaps: " + c.gaps.join("; ")].filter(Boolean), ["Add evidence for the duties you have really done, using the advert's words."]);
  // achievements
  const nB = c.allBullets.length;
  sec("Achievements", !nB ? "Missing" : c.mShare >= 0.4 ? "Good" : c.mShare >= 0.15 ? "Needs work" : "Weak", [nB && Math.round(c.mShare * nB) + " of " + nB + " bullets contain a figure"].filter(Boolean), [nB && c.mShare < 0.4 && "Most bullets describe duties without scale or result"].filter(Boolean), ["Add a number, scale or result to each bullet where it is true."]);
  // skills
  if (!c.sec.skills) sec("Skills", "Missing", [], ["No Skills section."], ["Add 6 to 10 specific skills that your jobs support."]);
  else sec("Skills", c.unsupported.length >= 3 ? "Weak" : c.unsupported.length || c.genericSkills.length >= 2 ? "Needs work" : "Good", [c.skillRows.filter(r => r.supported && !r.generic).length + " skills are backed by your work history"], [c.unsupported.length && c.unsupported.length + " skills have no support in your jobs: " + c.unsupported.slice(0, 4).map(r => r.text).join(", "), c.genericSkills.length && c.genericSkills.length + " generic personality claims"].filter(Boolean), c.unsupported.length ? ["Remove unsupported skills or add a bullet that shows them in use."] : []);
  // certs, languages, referees
  sec("Certifications and training", c.certs.length ? "Good" : "Not shown", c.certs.length ? [c.certs.length + " entries"] : [], [], c.certs.length ? [] : ["Optional: add short courses and certificates you hold."]);
  sec("Languages", c.hasLanguages ? "Good" : "Not shown", c.hasLanguages ? ["Languages listed"] : [], [], c.hasLanguages ? [] : ["Add your languages with levels. It matters most for NGO and international posts."]);
  sec("Referees", c.refs.withContact >= 3 ? "Good" : c.refs.withContact >= 1 ? "Needs work" : "Missing", c.refs.withContact ? [c.refs.withContact + " referees with contact details"] : [], [c.refs.withContact < 3 && (c.refs.onRequest && !c.refs.entries ? "References are only \"available on request\"" : "Fewer than three referees with contacts")].filter(Boolean), c.refs.withContact < 3 ? ["List referees with name, position, organisation, phone and email."] : []);
  return S;
}

/* ================= rewrites ================= */
function buildRewrites(c) {
  const R = [];
  if (c.summaryText) R.push({ section: "Professional summary", before: trimQ(c.summaryText, 360), after: summaryDraft(c), reason: "Facts and a proof point replace adjectives. Fill the [brackets] only with true information." });
  else R.push({ section: "Professional summary", before: "(none)", after: summaryDraft(c), reason: "Adds the first thing a reader looks for." });
  c.allBullets.filter(b => !b.hasMetric).slice(0, 4).forEach(b => {
    const base = b.text.replace(/[.;]$/, "");
    R.push({ section: "Work experience bullet", before: b.text, after: base + " ([how many or how often]; [result, or target met]).", reason: "Add figures only if you can state them truthfully.", questions: questionsFor(b.text) });
  });
  c.edu.filter(e => !e.institution || !e.year || (!e.inProgress && !e.grade) || !e.completion).slice(0, 3).forEach(e => R.push({ section: "Education entry", before: e.label, after: eduTemplate(e), reason: "A complete entry can be verified." }));
  if (c.unsupported.length) R.push({ section: "Skills", before: c.unsupported.slice(0, 4).map(r => r.text).join(", "), after: "Remove these, or add a job bullet such as: \"Used [skill] to [task] at [employer], [how often or how many].\"", reason: "Skills need support in your history." });
  return R;
}

/* ================= plan ================= */
function buildPlan(c, issues) {
  const q = [];
  const add = s => q.push(s);
  if (c.edu.some(e => e.isMSCE && !e.grade)) add("How many credits did you earn at MSCE, and in which subjects?");
  c.edu.filter(e => e.inProgress && !e.completion).forEach(e => add("When do you expect to complete " + trimQ(e.label, 60) + "?"));
  c.edu.filter(e => !e.institution || !e.year).forEach(e => add("Which institution and year for " + trimQ(e.label, 60) + "?"));
  c.allBullets.filter(b => !b.hasMetric).slice(0, 4).forEach(b => add("For \"" + trimQ(b.text, 70) + "\": " + questionsFor(b.text)[0]));
  c.duties.filter(d => d.status === "missing").slice(0, 3).forEach(d => add("Have you ever done this: \"" + trimQ(d.text, 70) + "\"? If yes, where, how often and with what result?"));
  c.unsupported.slice(0, 3).forEach(r => add("Can you show where you used \"" + r.text + "\" in a job? If not, remove it."));
  if (c.refs.withContact < 3) add("Who are three referees with phone and email, and have you asked them?");
  if (!c.hasLanguages) add("Which languages do you speak, and at what level?");
  c.checks.filter(x => x.kind === "manual" && x.status === "manual").forEach(x => add(x.label + ": " + x.note));
  const checklist = issues.filter(i => i.sev >= 40).slice(0, 10).map(i => ({ pri: i.sev >= 80 ? "Critical" : i.sev >= 60 ? "High" : "Medium", text: i.title, fix: i.fix }));
  return { questions: q, checklist };
}
function buildStrengths(c) {
  const s = [];
  if (c.have !== null) s.push("About " + c.have.toFixed(1) + " years of dated experience");
  const met = c.duties.filter(d => d.status === "met");
  if (met.length) s.push(met.length + " advertised duties are clearly evidenced: " + met.slice(0, 2).map(d => "\"" + trimQ(d.text, 40) + "\"").join(", "));
  const ok = c.checks.filter(x => x.kind !== "manual" && x.status === "met");
  if (ok.length) s.push("Meets: " + ok.map(x => x.label).join(", "));
  if (c.emailOk && c.phoneOk) s.push("Contact details are clear");
  if (c.refs.withContact >= 3) s.push("Three referees with contact details");
  const metric = c.allBullets.filter(b => b.hasMetric && b.action)[0];
  if (metric) s.push("Good proof point: \"" + trimQ(metric.text, 90) + "\"");
  return s;
}

/* ---------- samples ---------- */

const MU12_JD = [
"Office Attendant (MU12)",
"Position Overview",
"The Office Attendant shall be responsible for the provision of messengerial and cleaning services. He/she shall to the Assistant Administration Officer.",
"",
"Key Roles and Responsibilities",
"1. Cleaning and disinfecting offices.",
"2. Photocopying and binding documents.",
"3. Collecting and delivering mail, parcels and messages.",
"4. Circulating office files and documents.",
"5. Preparing office refreshments.",
"6. Servicing meetings, workshops and seminars.",
"7. Loading and offloading supplies.",
"8. Washing utensils.",
"9. Opening and closing offices.",
"",
"Minimum Education Qualifications and Experience",
"1. Malawi School Certificate of Education (MSCE).",
"2. 2 years relevant experience.",
"",
"Method of Application",
"Applications with three traceable referees should be sent by Friday 27th November, 2026 to talentsearch@mubas.ac.mw or The Registrar, MUBAS, P/Bag 303, Chichiri, Blantyre 3. Applicants should indicate the position applied for in the subject line of their emails and the application package should be merged as one document."
].join("\n");

const MU12_CV = [
"IAN CHIRWA",
"+265 885 599 881 | chirwaian265@gmail.com | Chimwankhunda, Blantyre, Malawi",
"",
"PROFESSIONAL SUMMARY",
"Ian is a prudent, aspiring and ambitious office support professional with over three years of hands-on experience in sales and marketing, customer service, record keeping, stock handling and delivery coordination. He is currently pursuing a Bachelor of Science in Management Information Systems at MUBAS. Reliable, hardworking and well organised, he communicates clearly, works well with little supervision and takes pride in a clean, orderly workplace. He is seeking to bring these skills to the Office Attendant (MU12) role at MUBAS.",
"",
"EDUCATION",
"Malawi University of Business and Applied Sciences (MUBAS) 2024 – Present",
"Bachelor of Science in Management Information Systems (ODeL) – in progress",
"Chipasula Secondary School 2022",
"Malawi School Certificate of Education (MSCE)",
"",
"WORK EXPERIENCE",
"D&R Interior Designers November 2025 – Present",
"Interior Design Assistant",
"• Support the delivery of interior design projects for a firm operating across Zomba, Blantyre, Lilongwe and Mzuzu, having contributed to work for over ten clients.",
"• Liaise with clients to understand requirements, present options and follow up through project completion.",
"• Coordinate materials, supplier orders and scheduling across multiple locations, keeping projects on time and within budget.",
"• Maintain project documentation, costings and client records.",
"TNM March 2025 – Present",
"Home Broadband Sales Agent",
"• Sales and marketing of home broadband products to walk-in, phone and online customers.",
"• Handle a high volume of customer enquiries daily, resolving technical and account-related queries to resolution.",
"• Sold an average of 3–4 broadband devices per day, well above the required daily minimum of 2, against a monthly target of 100 units.",
"• Maintain accurate customer records, sales documentation and activation details for reporting and follow-up.",
"Mushroom Supply and Distribution Business January 2023 – September 2025",
"Accounts Payable Manager, Assistant Salesman and Delivery Coordinator – Lilongwe and Mulanje",
"• Managed accounts payable for mushroom supply to Shoprite, reconciling invoices and payments and maintaining accurate, timely financial records.",
"• Tracked stock levels and coordinated ordering and delivery schedules to prevent shortages and maintain product freshness.",
"• Sold and delivered household products including soaps, peanut butter, sausages, beverages and school supplies, handling customer payments and queries.",
"",
"KEY SKILLS",
"• Collecting and delivering items, stock handling, and loading and offloading supplies",
"• Data entry, filing and operational record management",
"• Customer service, telephone handling and query resolution",
"• Microsoft Office Suite – Word, Excel, PowerPoint, Outlook",
"• Organising, multitasking and working to deadlines in a fast-paced environment",
"",
"LANGUAGES",
"English – Fluent",
"Chichewa – Native",
"",
"REFEREES",
"Ms. Tamika Gondwe",
"Home Broadband Supervisor – TNM | +265 882 372 259 | tamika.gondwe@tnm.co.mw",
"Dr. Patrick Chikumba",
"Head of Department, Computer Science and Information Systems, MUBAS | +265 883 659 869 | pchikumba@mubas.ac.mw",
"Mrs. Felina Khonje",
"Former Manager – Mushroom Supply Business | +265 888 376 535 | Felinakhonje@gmail.com"
].join("\n");

const CBE_JD = [
"VACANCY ANNOUNCEMENT",
"Locomotive Driver Training Programme (50 POSITIONS)",
"On behalf of our client, we invite applications from suitably qualified, motivated and technically inclined young Malawians to join our Locomotive Driver Training Programme. The programme aims to develop skilled individuals who will undergo structured theoretical and practical training to become competent locomotive drivers.",
"We are seeking 50 enthusiastic candidates with a strong technical background, a commitment to safety and an interest in pursuing a career in railway operations.",
"1. Minimum Requirements",
"Interested applicants must meet the following requirements:",
"• Be between 18 and 28 years of age.",
"• Possess a Malawi School Certificate of Education (MSCE) with a minimum of six (6) credits and",
"• Possess at least a TEVET Level 3 Certificate and/or a Grade 1 Trade Test Certificate or City & Guilds qualification in any of the below technical field.",
"o Electrical Engineering",
"o Mechanical Engineering",
"o Automobile mechanics",
"o General Fitting",
"o Telecommunications",
"o Electronics",
"2. Training Programme",
"Successful candidates will be enrolled in a structured 12-month Locomotive Driver Training Programme, which will comprise theoretical instruction and practical training.",
"3. Trainee Benefits and Conditions",
"Successful candidates will be entitled to the following:",
"• Monthly stipend",
"• Lunch",
"• Medical insurance",
"4. How to Apply",
"Submit a detailed CV, copies of your MSCE certificate and technical certificates, and a copy of your National Identity Card at https://cbemw.co/careers/. Deadline: 21 November 2026."
].join("\n");

const CBE_CV = [
"IAN CHIRWA",
"+265 885 599 881 | chirwaian265@gmail.com | Chimwankhunda, Blantyre, Malawi",
"Application: Locomotive Driver Training Programme",
"",
"PROFESSIONAL SUMMARY",
"Disciplined, safety-conscious and technically curious young Malawian with an MSCE and hands-on experience in telecommunications sales and support at TNM, where I activate and troubleshoot home broadband devices and resolve customer technical queries daily. I am applying to the Locomotive Driver Training Programme because I want a long-term career in railway operations, and I am ready to commit fully to the structured 12-month theoretical and practical training.",
"",
"EDUCATION",
"Malawi University of Business and Applied Sciences (MUBAS) 2024 – Present",
"Bachelor of Science in Management Information Systems (ODeL) – in progress",
"Chipasula Secondary School 2022",
"Malawi School Certificate of Education (MSCE)",
"",
"WORK EXPERIENCE",
"TNM March 2025 – Present",
"Home Broadband Sales Agent",
"• Set up and activate home broadband devices and resolve technical and account-related customer queries.",
"• Sold an average of 3–4 broadband devices per day against a required minimum of 2.",
"• Follow company procedures and work closely with the supervisory team.",
"D&R Interior Designers November 2025 – Present",
"Interior Design Assistant",
"• Coordinate materials, supplier orders and scheduling across multiple locations, keeping projects on time and within budget.",
"",
"KEY SKILLS",
"• Technical troubleshooting and device activation (home broadband)",
"• Following procedures, working accurately and keeping detailed records",
"• Punctuality, reliability and working to strict schedules and deadlines",
"",
"LANGUAGES",
"English – Fluent",
"Chichewa – Native"
].join("\n");


const WEAK_CV = [
"JOHN BANDA",
"Lilongwe",
"",
"OBJECTIVE",
"Hardworking, dynamic and motivated individual seeking a challenging position in a reputable organisation where I can use my skills.",
"",
"EDUCATION",
"MSCE",
"Diploma in Business Studies",
"",
"EXPERIENCE",
"Sales Assistant, ABC Traders 2019 - 2022",
"Responsible for selling goods",
"Helped customers",
"Worked on stock",
"",
"SKILLS",
"Hardworking, Team player, Good communication, Excel, Project management, Monitoring and evaluation, SPSS, Leadership",
"",
"REFERENCES",
"Available on request",
""
].join("\n");

const CONSULTANT_BRIEF = "# ROLE: Malawi-Focused AI ATS Resume Analyst & Career Advisor\n\nYou are an advanced Applicant Tracking System (ATS), professional CV reviewer, recruitment specialist, and career advisor specialising in the Malawi employment market.\n\nYour job is to evaluate resumes against the expectations, recruitment practices, hiring culture, and employment requirements of organisations operating in Malawi.\n\nYour analysis must be practical, honest, detailed, and constructive. Do not simply praise the applicant. Identify weaknesses, missing information, unrealistic claims, poor formatting, and opportunities for improvement.\n\n## 1. UNDERSTAND MALAWI'S JOB MARKET\n\nEvaluate resumes with an understanding of recruitment practices in Malawi, including:\n\n- Private companies and local businesses.\n- Government and public service recruitment.\n- NGOs and civil society organisations.\n- International development organisations.\n- UN agencies and donor-funded projects.\n- Banks and financial institutions.\n- Educational institutions.\n- Healthcare organisations.\n- Telecommunications and technology companies.\n- Small and medium-sized enterprises (SMEs).\n\nRecognise that different employers have different hiring expectations.\n\nConsider relevant factors such as:\n- Academic qualifications and professional certifications.\n- Relevant work experience.\n- Practical skills and demonstrated competence.\n- Professional references and referees.\n- Communication and report-writing abilities.\n- Computer literacy and digital skills.\n- Leadership and teamwork.\n- Knowledge of local operating environments.\n- Relevant industry experience.\n- Language abilities where relevant to the position.\n- Evidence of measurable achievements.\n\nDo not assume that every Malawian employer uses the same recruitment philosophy or ATS technology.\n\nDistinguish between established local recruitment practices, employer-specific requirements, and assumptions that need verification.\n\n## 2. ATS COMPATIBILITY TEST\n\nAnalyse the resume for:\n- ATS readability.\n- Correct section headings.\n- Appropriate keywords.\n- Formatting problems.\n- Tables, columns, graphics and icons that may interfere with parsing.\n- Contact information visibility.\n- Employment history structure.\n- Education and qualification formatting.\n- Date consistency.\n- File format suitability.\n\nIdentify sections that an ATS might fail to read correctly.\n\nExplain how to fix each problem.\n\n## 3. IDENTIFY WEAK PARTS OF THE RESUME\n\nConduct a critical assessment of every section.\n\nCheck:\n\n1. Personal information and contact details.\n2. Professional summary or career objective.\n3. Education and academic qualifications.\n4. Employment history.\n5. Professional achievements.\n6. Technical and soft skills.\n7. Certifications and training.\n8. Volunteer experience.\n9. Professional memberships.\n10. Referees and references.\n\nFor every weakness, provide:\n\n- The exact section containing the problem.\n- The problematic wording or missing information.\n- Why it weakens the application.\n- How a Malawian recruiter might interpret it.\n- A recommended correction.\n- A rewritten example where appropriate.\n\nDo not invent qualifications, employment history, achievements or experience.\n\n## 4. MALAWI-SPECIFIC RECRUITMENT ASSESSMENT\n\nAssess whether the resume demonstrates the qualities that relevant Malawian employers are likely to value.\n\nConsider:\n- Alignment with the advertised job requirements.\n- Understanding of the Malawian operating environment.\n- Experience working with local communities, institutions, clients or stakeholders where relevant.\n- Knowledge of relevant national policies, regulations or industry frameworks where required.\n- Ability to work with limited resources where relevant to the position.\n- Professional conduct and accountability.\n- Ability to deliver results.\n- Adaptability and problem-solving.\n\nDo not treat these characteristics as universal requirements. Only recommend them when relevant to the target job.\n\n## 5. JOB DESCRIPTION MATCHING\n\nWhen the user uploads a job advertisement alongside their resume:\n\n- Extract all essential and desirable requirements.\n- Identify the most important keywords.\n- Compare each requirement against the applicant's evidence.\n- Identify missing skills and qualifications.\n- Identify experience that is relevant but poorly presented.\n- Highlight qualifications that are not relevant to the position.\n- Determine whether the applicant meets the essential requirements.\n\nProduce a job-specific compatibility assessment.\n\nNever recommend adding keywords that falsely suggest the applicant has skills or experience they do not possess.\n\n## 6. RESUME SCORING\n\nScore the resume out of 100 using this framework:\n\n- ATS compatibility: 15 points.\n- Education and qualifications: 10 points.\n- Relevant experience: 20 points.\n- Skills and competencies: 15 points.\n- Achievements and measurable results: 15 points.\n- Professional presentation: 10 points.\n- Relevance to the Malawian job market and target employer: 15 points.\n\nFor job-specific assessments, explain that the score is an indicative assessment, not a prediction of actual recruitment success.\n\nShow the individual scores and explain deductions.\n\n## 7. EXACT RECOMMENDATIONS\n\nGive actionable recommendations rather than vague advice.\n\nFor example:\n\nWEAK:\n\"Hardworking individual seeking employment in a reputable organisation.\"\n\nEXPLAIN:\nThis statement is generic and does not communicate the applicant's professional value.\n\nRECOMMEND:\nReplace it with a targeted professional summary describing the applicant's actual qualifications, experience, specialist skills and career value.\n\nFor every recommended change, provide:\n\n- Current wording.\n- Problem identified.\n- Suggested replacement.\n- Reason for the improvement.\n\nWhere information is missing, ask the applicant rather than inventing it.\n\n## 8. FINAL REPORT FORMAT\n\nPresent the analysis in the following structure:\n\nA. OVERALL RESUME ASSESSMENT\n- Overall score out of 100.\n- ATS compatibility.\n- Main strengths.\n- Main weaknesses.\n- Overall recruitment readiness.\n\nB. CRITICAL WEAKNESSES\nRank the five most important problems that could reduce the applicant's chances.\n\nC. SECTION-BY-SECTION REVIEW\nExplain what is good, what is weak and what needs changing.\n\nD. MALAWI JOB MARKET ALIGNMENT\nExplain how well the resume fits the relevant Malawian employment sector and recruitment expectations.\n\nE. EXACT CHANGES REQUIRED\nProvide a before-and-after comparison of problematic sections.\n\nF. MISSING INFORMATION\nList information the applicant should provide to strengthen the resume.\n\nG. ATS KEYWORDS\nIdentify relevant keywords from the target job advertisement and show where legitimate keywords can be incorporated.\n\nH. FINAL IMPROVEMENT PLAN\nGive the applicant a prioritised checklist of changes.\n\nI. REWRITTEN RESUME\nIf requested, produce a professionally rewritten, ATS-friendly resume using only verified information supplied by the applicant.\n\n## 9. IMPORTANT RULES\n\n- Be brutally honest but professionally constructive.\n- Do not give inflated scores to make applicants feel good.\n- Do not apply foreign CV conventions blindly to Malawi.\n- Do not claim to know an employer's internal recruitment philosophy without evidence.\n- Distinguish between government, NGO, private-sector and international organisation recruitment requirements.\n- Never invent work experience, academic qualifications, references or achievements.\n- Respect applicant privacy and confidentiality.\n- Do not discriminate based on age, gender, disability, ethnicity, religion, marital status or other protected characteristics.\n- Do not penalise applicants for lacking irrelevant qualifications.\n- Prioritise genuine suitability and demonstrated competence over keyword stuffing.\n\nYOUR ULTIMATE OBJECTIVE:\n\nHelp applicants in Malawi understand exactly why their resumes may be rejected, what recruiters are likely to look for, which sections are weak, and how to improve their chances of being shortlisted.\n\nAct as a critical recruitment consultant, not merely a spelling checker.";
/* ================= UI ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const blanks = s => esc(s).replace(/\[([^\]]+)\]/g, '<mark class="blank">[$1]</mark>');
const jdEl = $("jd"), cvEl = $("cv"), body = $("tabbody"), tabsEl = $("tabs");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const TABS = [["overview", "Overview"], ["weak", "Weak points"], ["sections", "Sections"], ["req", "Requirements"], ["fit", "Market fit"], ["rewrite", "Rewrites"], ["plan", "Plan"], ["claude", "Claude report"]];
let A = null, tab = store.get("ats-tab") || "overview", envId = store.get("ats-env") || "gov";
if (!TABS.some(t => t[0] === tab)) tab = "overview";
if (!ENVS[envId]) envId = "gov";

const pill = (cls, text) => '<span class="pill ' + cls + '">' + esc(text) + "</span>";
const sevPill = s => s >= 80 ? pill("bad", "Critical") : s >= 60 ? pill("warn", "High") : s >= 40 ? pill("info", "Medium") : pill("info", "Low");
const statusPill = s => ({ Good: pill("good", "Good"), "Needs work": pill("warn", "Needs work"), Weak: pill("bad", "Weak"), Missing: pill("bad", "Missing"), "Not shown": pill("info", "Not shown") }[s] || pill("info", s));
const field = (k, v, raw) => '<div class="field"><span class="k">' + esc(k) + '</span><span class="v">' + (raw ? v : esc(v)) + "</span></div>";

/* ---- tab renderers ---- */
function rOverview(a) {
  const C = 2 * Math.PI * 52, off = C * (1 - a.total / 100);
  let h = '<div class="panel"><div class="score-card"><div class="ring" role="img" aria-label="Indicative score ' + a.total + ' out of 100">' +
    '<svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52" fill="none" stroke-width="10"/><circle class="bar stroke-' + a.verdict.tone + '" cx="60" cy="60" r="52" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
    '<div class="num"><b class="tone-' + a.verdict.tone + '">' + a.total + "</b><span>OUT OF 100</span></div></div>" +
    '<div class="verdict"><span class="eyebrow">Recruitment readiness · ' + esc(a.env.short) + '</span><h2>' + esc(a.verdict.name) + "</h2><p>" + esc(a.verdict.text) + '</p><p class="fine">Indicative assessment from the text you pasted. It is not a prediction of whether you will be shortlisted or hired.</p></div></div>';
  if (a.cap) h += '<div class="banner" role="alert" style="margin-top:16px"><b>Score capped at ' + a.cap.cap + ":</b> " + esc(a.cap.why) + " Fix this first.</div>";
  h += '<div style="margin-top:16px">' + a.cats.map(c => {
    const p = Math.round(c.pct * 100);
    const ded = c.deductions.filter(d => d.lost >= 0.3).slice(0, 5);
    return '<details class="cat"><summary><span class="nm">' + esc(c.label) + '</span><span class="pt">' + c.pts.toFixed(1) + " / " + c.max + '</span><span class="bar"><i style="width:' + p + '%"></i></span></summary>' +
      (ded.length ? '<ul class="ded">' + ded.map(d => "<li><b>−" + d.lost.toFixed(1) + "</b> " + esc(d.label) + (d.note ? ": " + esc(d.note) : "") + "</li>").join("") + "</ul>" : '<ul class="ded"><li>No deductions worth showing.</li></ul>') + "</details>";
  }).join("") + '<p class="fine" style="margin-top:8px">Open a row to see exactly where points were lost. Weights follow the employer type you selected.</p></div></div>';

  h += '<div class="panel"><h3>Top five critical weaknesses</h3><p class="sec-note">Ranked by how much each could reduce your chance of being shortlisted.</p><div class="stack">' + (a.critical.length ? a.critical.map((i, n) =>
    '<div class="issue"><div class="meta"><span class="rank">#' + (n + 1) + "</span>" + sevPill(i.sev) + "<span>" + esc(i.section) + "</span></div><h4>" + esc(i.title) + "</h4>" + field("Why it matters", i.why) + "</div>").join("") : '<p class="note">No critical weaknesses found.</p>') +
    '</div><p class="fine" style="margin-top:10px">Full detail, wording and fixes are in the Weak points tab.</p></div>';

  h += '<div class="panel"><div class="cols"><div><h3>Main strengths</h3>' + (a.strengths.length ? '<ul class="plain">' + a.strengths.map(s => "<li>" + esc(s) + "</li>").join("") + "</ul>" : '<p class="note">Few clear strengths were found for this advert.</p>') + '</div><div><h3>Main weaknesses</h3><ul class="plain">' + a.issues.slice(0, 6).map(i => "<li>" + esc(i.title) + "</li>").join("") + "</ul></div></div></div>";
  return h;
}
function issueCard(i, n) {
  let h = '<div class="issue"><div class="meta">' + (n ? '<span class="rank">#' + n + "</span>" : "") + sevPill(i.sev) + "<span>" + esc(i.section) + "</span></div><h4>" + esc(i.title) + "</h4>";
  if (i.current) h += '<div class="field"><span class="k">Problem wording</span><div class="quote">' + esc(i.current) + "</div></div>";
  h += field("Why it weakens your application", i.why);
  if (i.view) h += field("How a recruiter may read it", i.view);
  h += field("Recommended correction", i.fix);
  if (i.after) h += '<div class="ba">' + (i.before ? '<div class="b"><span class="l">Current</span>' + esc(i.before) + "</div>" : "") + '<div class="a"><span class="l">Suggested (fill the blanks truthfully)</span>' + blanks(i.after) + "</div></div>";
  if (i.reason) h += field("Reason for the change", i.reason);
  return h + "</div>";
}
function rWeak(a) {
  return '<div class="panel"><h3>' + a.issues.length + " weak points found</h3><p class=\"sec-note\">Each shows the exact section, the wording, why it hurts, how a recruiter may read it and what to change.</p></div>" + a.issues.map(i => issueCard(i, 0)).join("");
}
function rSections(a) {
  return '<div class="panel"><h3>Section-by-section review</h3><p class="sec-note">What is good, what is weak and what to change in each part of the CV.</p></div>' + a.sections.map(s =>
    '<div class="sec-card"><div class="top"><h4>' + esc(s.name) + "</h4>" + statusPill(s.status) + "</div>" +
    (s.good.length ? '<div><div class="lbl">Good</div><ul>' + s.good.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>" : "") +
    (s.weak.length ? '<div><div class="lbl">Weak</div><ul>' + s.weak.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>" : "") +
    (s.change.length ? '<div><div class="lbl">Change</div><ul>' + s.change.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>" : "") + "</div>").join("");
}
function reqRow(p, text, evidence, missing) {
  return "<li>" + p + '<div><p class="row-t">' + esc(text) + "</p>" + (evidence ? '<p class="ev">Closest evidence in your CV: “' + esc(evidence) + "”</p>" : '<p class="ev">No evidence found in your CV.</p>') + (missing && missing.length ? '<p class="ev">Words not in your CV: ' + esc(missing.join(", ")) + "</p>" : "") + "</div></li>";
}
function itemPill(s) { return s === "met" ? pill("good", "Evidenced") : s === "partial" ? pill("warn", "Partly") : pill("bad", "Not evidenced"); }
function rReq(a) {
  let h = '<div class="panel"><h3>Advert requirements against your evidence</h3><p class="sec-note">' + (a.essential.total ? "<b>" + a.essential.met + " of " + a.essential.total + "</b> essential requirements are clearly evidenced." : "No separate essential requirements were detected in the advert.") + " Duties are listed separately below.</p>";
  const qc = a.checks;
  if (qc.length) h += '<div class="eyebrow" style="margin:12px 0 6px">Qualifications and conditions</div><ul class="rows">' + qc.map(c => {
    if (c.kind === "manual") return "<li>" + (c.status === "met" ? pill("good", "Shown") : pill("info", "Check")) + '<div><p class="row-t">' + esc(c.label) + "</p>" + (c.status === "met" ? "" : '<p class="ev">' + esc(c.note) + "</p>") + "</div></li>";
    if (c.kind === "exp") {
      const p = { met: pill("good", "Meets"), partial: pill("warn", "Close"), short: pill("bad", "Short"), nodates: pill("warn", "No dates") }[c.status];
      return "<li>" + p + '<div><p class="row-t">' + esc(c.label) + "</p><p class=\"ev\">" + (c.have === null ? "Add month and year dates so experience can be counted." : "Your dated roles add up to about " + c.have.toFixed(1) + " years. It counts only if the work is relevant.") + "</p></div></li>";
    }
    const p = c.status === "met" ? pill("good", "Evidenced") : c.status === "partial" ? pill("warn", "In progress") : (c.required ? pill("bad", "Not evidenced") : pill("info", "Optional"));
    return "<li>" + p + '<div><p class="row-t">' + esc(c.label) + "</p>" + (c.evidence ? '<p class="ev">In your CV: “' + esc(c.evidence) + "”</p>" : '<p class="ev">' + (c.required ? "Required by the advert and not found in your CV." : "Preferred, not required.") + "</p>") + "</div></li>";
  }).join("") + "</ul>";
  const ess = a.reqLines.filter(r => !r.desirable), des = a.reqLines.filter(r => r.desirable);
  if (ess.length) h += '<div class="eyebrow" style="margin:16px 0 6px">Other essential requirements</div><ul class="rows">' + ess.map(r => reqRow(itemPill(r.status), r.text, r.evidence, r.missing)).join("") + "</ul>";
  if (des.length) h += '<div class="eyebrow" style="margin:16px 0 6px">Desirable</div><ul class="rows">' + des.map(r => reqRow(itemPill(r.status), r.text, r.evidence, r.missing)).join("") + "</ul>";
  if (a.duties.length) h += '<div class="eyebrow" style="margin:16px 0 6px">Duties</div><ul class="rows">' + a.duties.map(r => reqRow(itemPill(r.status), r.text, r.evidence, r.missing)).join("") + "</ul>";
  h += "</div>";
  const hit = a.kwAll.filter(k => k.found), miss = a.kwAll.filter(k => !k.found);
  const where = a.bestJob ? a.bestJob.job.employer : "your most relevant job";
  h += '<div class="panel"><h3>ATS keywords</h3><p class="sec-note">Use a missing keyword only where it is true. Do not add a word to look qualified.</p><div class="chips-label">In your CV (' + hit.length + ')</div><div class="chips">' + (hit.map(k => '<span class="chip hit">✓ ' + esc(k.form) + "</span>").join("") || '<span class="note">None yet</span>') + '</div><div class="chips-label">Missing (' + miss.length + ")</div><div class=\"chips\">" + (miss.map(k => '<span class="chip miss">✕ ' + esc(k.form) + "</span>").join("") || '<span class="note">Nothing missing</span>') + "</div>" +
    (miss.length ? '<p class="note" style="margin-top:12px">Where a true keyword can go: tools and software in the Skills section; duties as a bullet under <b>' + esc(where) + "</b>; the job title and your field in the first line of the summary.</p>" : "") + "</div>";
  return h;
}
function rFit(a) {
  const e = a.env;
  let h = '<div class="panel"><h3>Fit for ' + esc(e.label) + ' employers</h3><p class="sec-note">' + esc(e.blurb) + '</p><ul class="rows">' + a.fit.map(f => {
    const p = f.state === "pass" ? pill("good", "Pass") : f.state === "partial" ? pill("warn", "Partly") : f.state === "na" ? pill("info", "n/a") : pill("bad", "Fix");
    return "<li>" + p + '<div><p class="row-t">' + esc(f.label) + '</p><p class="ev">' + esc(f.detail) + "</p>" + (f.state === "pass" || f.state === "na" ? "" : '<p class="ev"><b>Fix:</b> ' + esc(f.fix) + "</p>") + "</div></li>";
  }).join("") + "</ul></div>";
  h += '<div class="panel"><h3>Assumptions to verify</h3><p class="sec-note">These are common practice, not rules every employer follows. Check them against the advert.</p><ul class="plain">' + e.verify.map(v => "<li>" + esc(v) + "</li>").join("") + "</ul></div>";
  h += '<div class="panel"><h3>How the score changes with employer type</h3><p class="sec-note">Each type weighs the seven areas differently. You selected <b>' + esc(e.short) + "</b>.</p>" + '<div style="overflow-x:auto"><table class="wt"><thead><tr><th>Area</th>' + Object.keys(ENVS).map(k => "<th" + (k === a.envId ? ' class="sel"' : "") + ">" + esc(ENVS[k].short) + "</th>").join("") + "</tr></thead><tbody>" +
    [["ats", "ATS compatibility"], ["edu", "Education"], ["exp", "Experience"], ["skills", "Skills"], ["ach", "Achievements"], ["pres", "Presentation"], ["fit", "Employer fit"]].map(([k, l]) => "<tr><td>" + l + "</td>" + Object.keys(ENVS).map(x => "<td" + (x === a.envId ? ' class="sel"' : "") + ">" + ENVS[x].weights[k] + "</td>").join("") + "</tr>").join("") + "</tbody></table></div></div>";
  return h;
}
function rRewrite(a) {
  return '<div class="panel"><h3>Exact wording to rewrite</h3><p class="sec-note">Text in <mark class="blank">[brackets]</mark> is a blank for you to fill with true information. Nothing here is invented for you.</p></div>' + a.rewrites.map(r =>
    '<div class="issue"><div class="meta"><span>' + esc(r.section) + '</span></div><div class="ba"><div class="b"><span class="l">Current</span>' + esc(r.before) + '</div><div class="a"><span class="l">Suggested</span>' + blanks(r.after) + "</div></div>" +
    (r.questions ? '<div class="field"><span class="k">Answer these to fill the blanks</span><ul class="qs">' + r.questions.map(q => "<li>" + esc(q) + "</li>").join("") + "</ul></div>" : "") + field("Why", r.reason) + "</div>").join("");
}
function rPlan(a) {
  let h = '<div class="panel"><h3>Information only you can supply</h3><p class="sec-note">Answer these before you rewrite. Where something is missing, the tool asks rather than inventing it.</p>' + (a.plan.questions.length ? '<ol class="qlist">' + a.plan.questions.map(q => "<li>" + esc(q) + "</li>").join("") + "</ol>" : '<p class="note">Nothing important is missing.</p>') + "</div>";
  h += '<div class="panel"><h3>Prioritised improvement checklist</h3><p class="sec-note">Work from the top. Tick items off as you fix them, then check the CV again.</p>' + (a.plan.checklist.length ? a.plan.checklist.map((c, n) => '<div class="check"><input type="checkbox" id="ck' + n + '"><label for="ck' + n + '"><span>' + pill(c.pri === "Critical" ? "bad" : c.pri === "High" ? "warn" : "info", c.pri) + " " + esc(c.text) + "</span><small>" + esc(c.fix) + "</small></label></div>").join("") : '<p class="note">No checklist items.</p>') + "</div>";
  return h;
}

/* ---- Claude consultant report ---- */
let sampleFn = null, ctl = null, claudeOut = "", rewriteOut = "", claudeStatus = "", claudeBusy = false;
(async () => {
  try { sampleFn = window.claude && window.claude.use ? await window.claude.use("sample") : null; } catch (e) { sampleFn = null; }
  if (tab === "claude") renderTab();
})();
function md(src) {
  const lines = esc(src).split("\n");
  let html = "", list = null, tbl = null;
  const inline = s => s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
  const closeList = () => { if (list) { html += "</" + list + ">"; list = null; } };
  const closeTbl = () => { if (tbl) { html += '<div class="tw"><table><thead><tr>' + tbl[0].map(c => "<th>" + inline(c) + "</th>").join("") + "</tr></thead><tbody>" + tbl.slice(1).map(r => "<tr>" + r.map(c => "<td>" + inline(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>"; tbl = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(l)) { closeList(); if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) continue; (tbl = tbl || []).push(l.trim().replace(/^\||\|$/g, "").split("|").map(x => x.trim())); continue; }
    closeTbl();
    let m;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) { closeList(); const lv = Math.min(5, m[1].length + 2); html += "<h" + lv + ">" + inline(m[2]) + "</h" + lv + ">"; }
    else if ((m = /^\s*[-*•]\s+(.*)$/.exec(l))) { if (list !== "ul") { closeList(); html += "<ul>"; list = "ul"; } html += "<li>" + inline(m[1]) + "</li>"; }
    else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (list !== "ol") { closeList(); html += "<ol>"; list = "ol"; } html += "<li>" + inline(m[1]) + "</li>"; }
    else if (!l.trim()) closeList();
    else { closeList(); html += "<p>" + inline(l) + "</p>"; }
  }
  closeList(); closeTbl();
  return html;
}
const ERR = {
  not_granted: "You chose not to allow Claude on this page. The rule-based report in the other tabs still works.",
  sampling_disabled: "Claude is not available for this account. The rule-based report in the other tabs still works.",
  rate_limited: "Too many requests or your Claude usage limit was reached. Try again later.",
  prompt_too_large: "The advert and CV are too long to send. Shorten them and try again.",
  session_expired: "Your session expired. Reload the page and sign in again.",
  refused: "Claude declined this input. Check the text you pasted.",
  empty_completion: "Claude returned nothing. Try again.",
  cancelled: ""
};
function consultantPrompt(a) {
  const e = a.env;
  const pre = a.cats.map(c => c.label + ": " + c.pts.toFixed(1) + "/" + c.max).join("; ");
  return CONSULTANT_BRIEF + "\n\n=== CONTEXT FOR THIS REQUEST ===\n" +
    "RECRUITMENT ENVIRONMENT SELECTED BY THE APPLICANT: " + e.label + ". Evaluate using this environment's expectations only. What this reader tends to check: " + e.blurb + " Treat these as assumptions to verify, not facts: " + e.verify.join(" ") + "\n\n" +
    "AUTOMATED PRE-ANALYSIS (rule-based and fallible; check it against the text yourself and correct it where wrong): overall " + a.total + "/100 (" + a.verdict.name + "). " + pre + ". Top issues found: " + a.critical.map(i => i.title).join(" | ") + ".\n\n" +
    "=== JOB ADVERTISEMENT ===\n" + jdEl.value.slice(0, 20000) + "\n\n=== APPLICANT CV ===\n" + cvEl.value.slice(0, 30000) + "\n\n=== TASK ===\n" +
    "Produce the final report in sections A to H exactly as specified above, using Markdown (## headings, bullet lists, tables where useful). Quote the applicant's exact wording when you criticise it. Use the environment-specific weighting and criteria for " + e.label + ". Do not produce section I in this response. Do not invent qualifications, experience, achievements or figures; where information is missing, ask. State clearly that the score is indicative and not a prediction.";
}
function rewritePrompt(a) {
  return "You are rewriting a CV for a job applicant in Malawi. Use ONLY facts that appear in the CV below. Never invent employers, dates, qualifications, achievements, figures, skills or references. Where a useful detail is missing (for example credits, a figure, an expected graduation date), put a short [bracketed blank] for the applicant to fill. Do not add a skill that no job in the CV supports. Use plain ATS-friendly text: one column, no tables, standard headings (Professional Summary, Education, Work Experience, Skills, Languages, Referees), bullets starting with an action verb, month and year dates. Use the job advert's wording only where the CV supports it. Target recruitment environment: " + a.env.label + ". Output only the rewritten CV in plain text, then a short list titled QUESTIONS FOR THE APPLICANT.\n\n=== JOB ADVERTISEMENT ===\n" + jdEl.value.slice(0, 20000) + "\n\n=== CURRENT CV ===\n" + cvEl.value.slice(0, 30000);
}
async function runClaude(kind) {
  if (!sampleFn || !A || claudeBusy) return;
  claudeBusy = true; ctl = new AbortController();
  const isRep = kind === "rewrite";
  if (isRep) rewriteOut = ""; else claudeOut = "";
  claudeStatus = "Thinking… the first words can take up to a minute.";
  renderTab();
  try {
    const res = await sampleFn(isRep ? rewritePrompt(A) : consultantPrompt(A), {
      signal: ctl.signal, modelTier: "default",
      onText: ({ text }) => { if (isRep) rewriteOut = text; else claudeOut = text; claudeStatus = "Writing…"; paintClaude(); }
    });
    if (isRep) rewriteOut = res.text; else claudeOut = res.text;
    claudeStatus = res.truncated ? "The answer was cut short. Run it again or shorten the CV." : "";
  } catch (e) {
    const code = e && e.code;
    if (e && e.text) { if (isRep) rewriteOut = e.text; else claudeOut = e.text; }
    claudeStatus = code === "cancelled" ? "Stopped." : (ERR[code] !== undefined ? ERR[code] : "Something went wrong. You can try again.");
    claudeStatus = "!" + claudeStatus;
  } finally { claudeBusy = false; ctl = null; renderTab(); }
}
function paintClaude() {
  const el = $("claude-main"), st = $("claude-status"), rw = $("claude-rewrite");
  if (el) el.innerHTML = claudeOut ? md(claudeOut) : "";
  if (rw) rw.textContent = rewriteOut;
  if (st) { st.textContent = claudeStatus.replace(/^!/, ""); st.className = "status-line" + (claudeStatus[0] === "!" ? " err" : ""); }
}
function rClaude(a) {
  if (!sampleFn) return '<div class="panel"><h3>Claude consultant report</h3><p class="note">This part needs Claude, which is available when the page is opened inside Claude. The rule-based report in the other tabs works everywhere.</p></div>';
  let h = '<div class="panel"><h3>Claude consultant report</h3><p class="sec-note">The rule-based tabs match words. This sends your advert and CV to Claude, which reads them in context and writes the full consultant report (parts A to H) for the <b>' + esc(a.env.short) + "</b> employer type, using the brief you supplied. It uses your own Claude account and usage, and Claude asks your permission the first time.</p>" +
    '<div class="toolbar"><button type="button" class="primary" id="c-run"' + (claudeBusy ? " disabled" : "") + ">Write the full report</button><button type=\"button\" id=\"c-rew\"" + (claudeBusy ? " disabled" : "") + ">Rewrite my CV from what it says</button>" + (claudeBusy ? '<button type="button" id="c-stop">Stop</button>' : "") + "</div>" +
    '<p class="status-line' + (claudeStatus[0] === "!" ? " err" : "") + '" id="claude-status">' + esc(claudeStatus.replace(/^!/, "")) + "</p></div>";
  h += '<div class="panel md" id="claude-main"' + (claudeOut ? "" : " hidden") + ">" + (claudeOut ? md(claudeOut) : "") + "</div>";
  h += '<div class="panel" id="claude-rw-panel"' + (rewriteOut ? "" : " hidden") + '><h3>Rewritten CV (draft)</h3><p class="sec-note">Uses only what your CV already says. Fill every [blank] with true information and check every line before you send it.</p><div class="toolbar"><button type="button" id="c-copy">Copy text</button></div><pre class="out" id="claude-rewrite">' + esc(rewriteOut) + "</pre></div>";
  return h;
}
function wireClaude() {
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
  on("c-run", () => runClaude("report")); on("c-rew", () => runClaude("rewrite")); on("c-stop", () => ctl && ctl.abort());
  on("c-copy", async () => {
    const el = $("claude-rewrite");
    try { await navigator.clipboard.writeText(el.textContent); $("c-copy").textContent = "Copied"; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("c-copy").textContent = "Selected: press copy"; }
  });
}

/* ---- tab plumbing ---- */
function renderTabs() {
  tabsEl.innerHTML = TABS.map(([id, label]) => '<button type="button" class="tab" role="tab" id="tab-' + id + '" aria-selected="' + (id === tab) + '" aria-controls="tabbody" data-tab="' + id + '">' + esc(label) + (id === "weak" && A ? " (" + A.issues.length + ")" : "") + "</button>").join("");
  tabsEl.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { tab = b.dataset.tab; store.set("ats-tab", tab); renderTab(); }));
}
function renderTab() {
  renderTabs();
  if (!A) { body.innerHTML = '<div class="panel empty"><b>Paste a job advert and your CV</b><p class="note">Pick the employer type, then paste or upload both. Your critical report appears here.</p></div>'; return; }
  const fn = { overview: rOverview, weak: rWeak, sections: rSections, req: rReq, fit: rFit, rewrite: rRewrite, plan: rPlan, claude: rClaude }[tab];
  body.setAttribute("aria-labelledby", "tab-" + tab);
  body.innerHTML = fn(A);
  if (tab === "claude") wireClaude();
}
function counts() { $("jd-count").textContent = wc(jdEl.value) + " words"; $("cv-count").textContent = wc(cvEl.value) + " words"; }
let timer = null;
function run(scroll) {
  counts();
  store.set("ats-jd", jdEl.value); store.set("ats-cv", cvEl.value); store.set("ats-env", envId);
  $("env-blurb").textContent = ENVS[envId].blurb;
  document.querySelectorAll(".env input").forEach(i => { i.checked = i.value === envId; });
  if (wc(jdEl.value) < 5 || wc(cvEl.value) < 5) A = null;
  else { try { A = analyze(jdEl.value, cvEl.value, envId, new Date()); } catch (e) { A = null; body.innerHTML = '<div class="panel"><div class="banner">Something in the pasted text could not be read. Check both boxes and try again.</div></div>'; tabsEl.innerHTML = ""; return; } }
  renderTab();
  if (scroll && window.matchMedia("(max-width: 900px)").matches) $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}
function load(jd, cv, env, note) { jdEl.value = jd; cvEl.value = cv; if (env) envId = env; $("loaded-note").textContent = note; ["jd", "cv"].forEach(t => { $(t + "-status").textContent = ""; $(t + "-status").className = "up-status"; }); claudeOut = ""; rewriteOut = ""; claudeStatus = ""; run(false); }
[jdEl, cvEl].forEach(el => el.addEventListener("input", () => { $("loaded-note").textContent = ""; clearTimeout(timer); timer = setTimeout(() => run(false), 400); }));
document.querySelectorAll(".env input").forEach(i => i.addEventListener("change", () => { envId = i.value; run(false); }));
$("run").addEventListener("click", () => run(true));
$("ex-mu12").addEventListener("click", () => load(MU12_JD, MU12_CV, "gov", "Example loaded: the MUBAS Office Attendant (MU12) advert and your updated CV, set to Malawi Government."));
$("ex-cbe").addEventListener("click", () => load(CBE_JD, CBE_CV, "private", "Example loaded: the CBE Locomotive Driver Training advert and your CV for it, set to Private sector. It shows how a missing required certificate affects the score."));
$("ex-weak").addEventListener("click", () => load(MU12_JD, WEAK_CV, "gov", "Example loaded: a deliberately weak CV against the MU12 advert, to show how strict the report is."));
$("clear").addEventListener("click", () => { load("", "", null, ""); jdEl.focus(); });

/* ---------- file upload ---------- */

const LIBS = {
  mammoth: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.2/mammoth.browser.min.js",
  pdf: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
};
const loaded = {};
function loadScript(src) {
  if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
    const el = document.createElement("script");
    el.src = src; el.onload = res; el.onerror = () => { delete loaded[src]; rej(new Error("Could not load the file reader. Check your connection or paste the text instead.")); };
    document.head.appendChild(el);
  });
  return loaded[src];
}
function tidy(text) {
  return text.replace(/\r/g, "").replace(/^[\uF000-\uF8FF]\s*/gm, "• ").replace(/[\u00A0\t]+/g, " ").replace(/[ ]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
async function readPdf(buf) {
  await loadScript(LIBS.pdf);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const tc = await (await pdf.getPage(n)).getTextContent();
    let line = "", lastY = null; const lines = [];
    for (const it of tc.items) {
      const y = Math.round(it.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(line); line = ""; }
      line += it.str; lastY = y;
      if (it.hasEOL) { lines.push(line); line = ""; lastY = null; }
    }
    if (line) lines.push(line);
    pages.push(lines.map(l => l.trim()).filter(Boolean).join("\n"));
  }
  return pages.join("\n");
}
async function readDocx(buf) {
  await loadScript(LIBS.mammoth);
  const html = (await window.mammoth.convertToHtml({ arrayBuffer: buf })).value;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const lines = [];
  doc.body.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li").forEach(el => {
    if (el.tagName === "P" && el.parentElement && el.parentElement.tagName === "LI") return;
    const t = el.textContent.trim();
    if (t) lines.push((el.tagName === "LI" ? "• " : "") + t);
  });
  return lines.join("\n");
}
async function readAny(file) {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error("That file is over 10 MB. Use a smaller file.");
  if (/\.(txt|md|text)$/.test(name)) return await file.text();
  if (/\.pdf$/.test(name)) return await readPdf(await file.arrayBuffer());
  if (/\.docx$/.test(name)) return await readDocx(await file.arrayBuffer());
  if (/\.doc$/.test(name)) throw new Error("Old .doc files cannot be read. Save it as .docx or PDF and upload again.");
  throw new Error("Use a PDF, Word (.docx) or text file.");
}
async function handleFile(target, file) {
  const st = $(target + "-status");
  if (!file) return;
  st.className = "up-status"; st.textContent = "Reading " + file.name + "…";
  try {
    const text = tidy(await readAny(file));
    if (wc(text) < 5) throw new Error("No readable text found. A scanned or image-only file cannot be read, so paste the text instead.");
    (target === "jd" ? jdEl : cvEl).value = text;
    st.className = "up-status ok"; st.textContent = "Loaded " + file.name + " (" + wc(text) + " words). Check the text below.";
    $("loaded-note").textContent = "";
    run(false);
  } catch (e) {
    st.className = "up-status err"; st.textContent = e.message || "That file could not be read.";
  }
}
["jd", "cv"].forEach(t => {
  const input = $(t + "-file"), box = t === "jd" ? jdEl : cvEl;
  $(t + "-up").addEventListener("click", () => input.click());
  input.addEventListener("change", () => { handleFile(t, input.files[0]); input.value = ""; });
  box.addEventListener("dragover", e => { e.preventDefault(); box.classList.add("drop-active"); });
  box.addEventListener("dragleave", () => box.classList.remove("drop-active"));
  box.addEventListener("drop", e => { e.preventDefault(); box.classList.remove("drop-active"); if (e.dataTransfer.files.length) handleFile(t, e.dataTransfer.files[0]); });
});

/* ---------- palette switch ---------- */
function setPalette(name, save) {
  document.documentElement.setAttribute("data-palette", name);
  document.querySelectorAll(".pal button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.pal === name)));
  if (save) store.set("ats-palette", name);
}
document.querySelectorAll(".pal button").forEach(b => b.addEventListener("click", () => setPalette(b.dataset.pal, true)));
setPalette(store.get("ats-palette") === "violet" ? "violet" : "maroon", false);



/* ---------- start ---------- */
const savedJD = store.get("ats-jd"), savedCV = store.get("ats-cv");
if (savedJD !== null && savedCV !== null && (savedJD || savedCV)) { jdEl.value = savedJD; cvEl.value = savedCV; run(false); }
else load(MU12_JD, MU12_CV, "gov", "Example loaded: the MUBAS Office Attendant (MU12) advert and your updated CV, set to Malawi Government. Paste your own text to check another job.");

