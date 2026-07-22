const pptxgen = require("pptxgenjs");
const path = require("path");

// Shared config — edit ../student_config.json to customize per student
const CONFIG = require("../student_config.json");

const ASSET = (f) => path.join(__dirname, f);

// ============================================================
// Palette — ties visually to the architecture diagrams (teal + purple)
// ============================================================
const NAVY = "0B3D62";   // primary — title/conclusion backgrounds
const TEAL = "0F6E56";   // secondary — indexing-phase accent
const PURPLE = "534AB7"; // accent — query-phase accent
const WHITE = "FFFFFF";
const OFFWHITE = "F5F6F7";
const TEXT_DARK = "1A1A1A";
const TEXT_MUTED = "5F5E5A";
const CARD_BG = "FFFFFF";
const CARD_BORDER = "E2E4E8";

const FONT_HEAD = "Cambria";
const FONT_BODY = "Calibri";

let pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3" x 7.5"
const SW = 13.33, SH = 7.5;

function iconCircle(slide, { x, y, size = 0.6, icon, bg = NAVY }) {
  slide.addShape("ellipse", { x, y, w: size, h: size, fill: { color: bg }, line: { type: "none" } });
  const pad = size * 0.2;
  slide.addImage({ path: ASSET(`icons_${icon}.png`), x: x + pad / 2, y: y + pad / 2, w: size - pad, h: size - pad });
}

function slideTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.6, y: 0.45, w: SW - 1.2, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 30, bold: true, color: TEXT_DARK, margin: 0,
    ...opts,
  });
}

function pageNum(slide, n) {
  slide.addText(String(n), {
    x: SW - 0.7, y: SH - 0.45, w: 0.4, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: TEXT_MUTED, align: "right", margin: 0,
  });
}

// ============================================================
// Slide 1 — Title
// ============================================================
{
  const s = pres.addSlide();
  s.addShape("rect", { x: 0, y: 0, w: SW, h: SH, fill: { color: NAVY }, line: { type: "none" } });
  s.addImage({ path: ASSET("icons_chat.png"), x: SW - 2.3, y: 0.6, w: 1.3, h: 1.3, transparency: 15 });
  s.addText("Chat With YouTube", {
    x: 0.9, y: 2.5, w: SW - 1.8, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 44, bold: true, color: WHITE, margin: 0,
  });
  s.addText("A Retrieval-Augmented Generation System for Video Transcripts", {
    x: 0.9, y: 3.55, w: SW - 1.8, h: 0.6,
    fontFace: FONT_BODY, fontSize: 20, color: "CADCFC", margin: 0,
  });
  s.addText(`[${CONFIG.PROJECT_TYPE}]`, {
    x: 0.9, y: 4.25, w: 6, h: 0.4,
    fontFace: FONT_BODY, fontSize: 14, italic: true, color: "8FA8C2", margin: 0,
  });
  s.addText([
    { text: CONFIG.STUDENT_NAME, options: { bold: true, breakLine: true } },
    { text: `${CONFIG.COLLEGE_NAME}  |  ${CONFIG.ACADEMIC_YEAR}`, options: {} },
  ], {
    x: 0.9, y: 6.5, w: 8, h: 0.7,
    fontFace: FONT_BODY, fontSize: 14, color: WHITE, margin: 0,
  });
}

// ============================================================
// Slide 2 — Problem statement
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "The problem");
  s.addText([
    { text: "Long videos hide the exact moment you actually need", options: { bold: true, breakLine: true, paraSpaceAfter: 10 } },
    { text: "YouTube's search only matches the title and description, not what's actually said inside", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Finding one fact in a two-hour lecture means scrubbing through it manually", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Asking an LLM directly about a video it's never seen risks a hallucinated, plausible-sounding but wrong answer", options: { bullet: true } },
  ], {
    x: 0.6, y: 1.6, w: 7.0, h: 4.5,
    fontFace: FONT_BODY, fontSize: 16, color: TEXT_DARK, margin: 0, valign: "top", lineSpacingMultiple: 1.15,
  });

  s.addShape("roundRect", { x: 8.1, y: 1.9, w: 4.6, h: 3.6, rectRadius: 0.12, fill: { color: OFFWHITE }, line: { color: CARD_BORDER, width: 1 } });
  iconCircle(s, { x: 8.5, y: 2.25, size: 0.8, icon: "warning", bg: PURPLE });
  s.addText("\u201cWhat did they say about the 2017 result, again?\u201d", {
    x: 8.4, y: 3.25, w: 3.9, h: 1.9,
    fontFace: FONT_HEAD, fontSize: 16, italic: true, color: NAVY, margin: 0, align: "left",
  });
  pageNum(s, 2);
}

// ============================================================
// Slide 3 — Objectives
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Objectives");
  const objectives = [
    { icon: "upload", title: "Turn any video into a knowledge base", desc: "Paste a YouTube link and get an indexed, queryable transcript" },
    { icon: "search", title: "Retrieve relevant moments accurately", desc: "Combine semantic and exact-match search for precision" },
    { icon: "robot", title: "Generate grounded answers", desc: "Use an LLM to answer strictly from the retrieved transcript" },
    { icon: "check", title: "Cite and jump to every answer", desc: "Show the exact timestamp, and seek the player there on click" },
  ];
  const colW = 5.9, gapX = 0.5, startX = 0.6, rowY = [1.7, 3.55];
  objectives.forEach((o, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = startX + col * (colW + gapX);
    const y = rowY[row];
    iconCircle(s, { x, y: y + 0.1, size: 0.75, icon: o.icon, bg: NAVY });
    s.addText(o.title, { x: x + 1.0, y: y, w: colW - 1.0, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: TEXT_DARK, margin: 0, valign: "top" });
    s.addText(o.desc, { x: x + 1.0, y: y + 0.45, w: colW - 1.0, h: 0.8, fontFace: FONT_BODY, fontSize: 13, color: TEXT_MUTED, margin: 0, valign: "top" });
  });
  pageNum(s, 3);
}

// ============================================================
// Slide 4 — System architecture
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "System architecture");
  s.addText("Two phases: build the index once, then answer questions against it", {
    x: 0.6, y: 1.15, w: SW - 1.2, h: 0.4, fontFace: FONT_BODY, fontSize: 14, italic: true, color: TEXT_MUTED, margin: 0,
  });
  s.addImage({ path: ASSET("architecture_diagram.png"), x: 2.98, y: 1.9, w: 7.37, h: 3.25 });
  s.addShape("roundRect", { x: 1.5, y: 5.4, w: 4.9, h: 0.5, rectRadius: 0.08, fill: { color: "E1F5EE" }, line: { type: "none" } });
  s.addText("Indexing phase — runs once per video", { x: 1.7, y: 5.4, w: 4.6, h: 0.5, fontFace: FONT_BODY, fontSize: 12, color: TEAL, valign: "middle", margin: 0 });
  s.addShape("roundRect", { x: 6.9, y: 5.4, w: 4.9, h: 0.5, rectRadius: 0.08, fill: { color: "EEEDFE" }, line: { type: "none" } });
  s.addText("Query phase — runs per question", { x: 7.1, y: 5.4, w: 4.6, h: 0.5, fontFace: FONT_BODY, fontSize: 12, color: PURPLE, valign: "middle", margin: 0 });
  s.addNotes("Explain: a pasted URL is resolved to a transcript (captions, or yt-dlp/Whisper fallback), then chunked, embedded, and indexed once. Every question then goes through hybrid retrieval against that index, and Groq generates the final answer cited by timestamp.");
  pageNum(s, 4);
}

// ============================================================
// Slide 5 — Query routing logic
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Not all questions are the same");
  s.addText("Broad questions (summaries) and specific questions (lookups) need different retrieval strategies", {
    x: 0.6, y: 1.15, w: SW - 1.2, h: 0.4, fontFace: FONT_BODY, fontSize: 14, italic: true, color: TEXT_MUTED, margin: 0,
  });
  s.addImage({ path: ASSET("query_routing_diagram.png"), x: 3.9, y: 1.65, w: 5.5, h: 3.48 });
  s.addNotes("Vector search alone fails on broad 'summarize this' questions because there's no single matching passage. It also struggles with years and exact quoted phrases, since embeddings capture meaning, not exact digits or wording.");
  pageNum(s, 5);
}

// ============================================================
// Slide 6 — Tech stack
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Technology stack");
  const stack = [
    { icon: "python", label: "Python 3", sub: "Core language" },
    { icon: "layer", label: "Streamlit", sub: "Chat interface + player" },
    { icon: "extract", label: "youtube-transcript-api", sub: "Primary transcript source" },
    { icon: "cloud", label: "yt-dlp + Whisper", sub: "Fallback transcript path" },
    { icon: "brain", label: "sentence-transformers", sub: "CPU embeddings" },
    { icon: "database", label: "FAISS", sub: "Vector search" },
    { icon: "bolt", label: "Groq API", sub: "Free LLM + Whisper inference" },
    { icon: "check", label: "Timestamp citations", sub: "Jumpable player seek" },
  ];
  const cols = 4, cardW = 2.85, cardH = 1.9, gapX = 0.28, gapY = 0.35, startX = 0.6, startY = 1.7;
  stack.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (cardW + gapX), y = startY + row * (cardH + gapY);
    s.addShape("roundRect", { x, y, w: cardW, h: cardH, rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 } });
    iconCircle(s, { x: x + 0.25, y: y + 0.25, size: 0.6, icon: t.icon, bg: NAVY });
    s.addText(t.label, { x: x + 0.2, y: y + 0.95, w: cardW - 0.4, h: 0.55, fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: TEXT_DARK, margin: 0, valign: "top" });
    s.addText(t.sub, { x: x + 0.2, y: y + 1.45, w: cardW - 0.4, h: 0.4, fontFace: FONT_BODY, fontSize: 10, color: TEXT_MUTED, margin: 0 });
  });
  pageNum(s, 6);
}

// ============================================================
// Slide 7 — Transcript fallback chain
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Getting a transcript, reliably");
  s.addText("Not every video has captions — the pipeline tries three layers before giving up", {
    x: 0.6, y: 1.15, w: SW - 1.2, h: 0.4, fontFace: FONT_BODY, fontSize: 14, italic: true, color: TEXT_MUTED, margin: 0,
  });
  const layers = [
    { icon: "extract", title: "1. YouTube captions", desc: "Fastest path — reads existing manual or auto-generated captions directly, no download needed", bg: "E1F5EE", accent: TEAL, accentDark: "085041" },
    { icon: "cloud", title: "2. yt-dlp captions", desc: "Same caption tracks, different code path — used when the first method is rate-limited or blocked", bg: "EEEDFE", accent: PURPLE, accentDark: "3C3489" },
    { icon: "bolt", title: "3. Groq Whisper", desc: "Last resort: downloads audio and transcribes it, for videos with captions disabled entirely", bg: "FDECEA", accent: "C0392B", accentDark: "922B21" },
  ];
  const cardW = 3.85, cardH = 3.9, gap = 0.35, startX = 0.6, y = 1.9;
  layers.forEach((l, i) => {
    const x = startX + i * (cardW + gap);
    s.addShape("roundRect", { x, y, w: cardW, h: cardH, rectRadius: 0.12, fill: { color: l.bg }, line: { type: "none" } });
    iconCircle(s, { x: x + 0.35, y: y + 0.35, size: 0.7, icon: l.icon, bg: l.accent });
    s.addText(l.title, { x: x + 0.35, y: y + 1.25, w: cardW - 0.7, h: 0.5, fontFace: FONT_HEAD, fontSize: 15, bold: true, color: l.accentDark, margin: 0 });
    s.addText(l.desc, { x: x + 0.35, y: y + 1.8, w: cardW - 0.7, h: 1.9, fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_DARK, margin: 0, valign: "top", lineSpacingMultiple: 1.15 });
  });
  pageNum(s, 7);
}

// ============================================================
// Slide 8 — Why hybrid retrieval
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Why hybrid retrieval");
  s.addText("Example: asking \u201cwhat happened in 2017\u201d when the transcript also mentions 2016 and 2019", {
    x: 0.6, y: 1.15, w: SW - 1.2, h: 0.4, fontFace: FONT_BODY, fontSize: 14, italic: true, color: TEXT_MUTED, margin: 0,
  });

  // Left card — vector only (problem)
  s.addShape("roundRect", { x: 0.6, y: 1.75, w: 5.8, h: 4.6, rectRadius: 0.12, fill: { color: "FAECE7" }, line: { type: "none" } });
  s.addText("Vector search alone", { x: 1.0, y: 2.0, w: 5.0, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: "712B13", margin: 0 });
  s.addText([
    { text: "Embeddings capture meaning, not exact digits or wording", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "\u201c2016\u201d, \u201c2017\u201d, and \u201c2019\u201d look almost identical to the model", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Result: wrong segment retrieved, or an \u201cI don't have enough information\u201d answer", options: { bullet: true } },
  ], { x: 1.0, y: 2.5, w: 5.0, h: 3.5, fontFace: FONT_BODY, fontSize: 14, color: TEXT_DARK, margin: 0, valign: "top", lineSpacingMultiple: 1.15 });

  // Right card — hybrid (solution)
  s.addShape("roundRect", { x: 6.9, y: 1.75, w: 5.8, h: 4.6, rectRadius: 0.12, fill: { color: "E1F5EE" }, line: { type: "none" } });
  s.addText("Hybrid retrieval", { x: 7.3, y: 2.0, w: 5.0, h: 0.4, fontFace: FONT_HEAD, fontSize: 16, bold: true, color: "085041", margin: 0 });
  s.addText([
    { text: "Detects years and quoted phrases (e.g. \u201c2017\u201d) in the question", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Does a literal, exact-match search for that text first", options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Fills remaining context with vector search results", options: { bullet: true } },
  ], { x: 7.3, y: 2.5, w: 5.0, h: 3.5, fontFace: FONT_BODY, fontSize: 14, color: TEXT_DARK, margin: 0, valign: "top", lineSpacingMultiple: 1.15 });
  pageNum(s, 8);
}

// ============================================================
// Slide 9 — Multi-video support with jumpable citations
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Multi-video support with jumpable citations");
  s.addText([
    { text: "Load and query multiple YouTube videos together", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
    { text: "Every chunk is tagged with its source video and a timestamp range", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
    { text: "Answers cite exactly which video and moment the information came from", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
    { text: "Clicking a citation seeks the embedded player to that exact second", options: { bullet: true } },
  ], { x: 0.6, y: 1.8, w: 6.4, h: 4, fontFace: FONT_BODY, fontSize: 16, color: TEXT_DARK, margin: 0, valign: "top", lineSpacingMultiple: 1.2 });

  s.addShape("roundRect", { x: 7.5, y: 1.9, w: 5.2, h: 3.9, rectRadius: 0.12, fill: { color: OFFWHITE }, line: { color: CARD_BORDER, width: 1 } });
  s.addText("Q: What did the speaker say about scaling laws?", { x: 7.85, y: 2.2, w: 4.5, h: 0.6, fontFace: FONT_BODY, fontSize: 13, bold: true, color: NAVY, margin: 0 });
  s.addText("They describe how model performance improves predictably as compute, data, and parameters scale up together.", {
    x: 7.85, y: 2.9, w: 4.5, h: 1.3, fontFace: FONT_BODY, fontSize: 13, color: TEXT_DARK, margin: 0, valign: "top",
  });
  s.addShape("roundRect", { x: 7.85, y: 4.3, w: 4.5, h: 0.5, rectRadius: 0.08, fill: { color: "EEEDFE" }, line: { type: "none" } });
  s.addText("\u25b6 Source: \u201cScaling Laws Explained\u201d, at 14:22", { x: 8.0, y: 4.3, w: 4.2, h: 0.5, fontFace: FONT_BODY, fontSize: 11, italic: true, color: PURPLE, valign: "middle", margin: 0 });
  pageNum(s, 9);
}

// ============================================================
// Slide 10 — Testing & results
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Testing & results");
  s.addText("10", { x: 0.7, y: 1.7, w: 2.6, h: 1.5, fontFace: FONT_HEAD, fontSize: 62, bold: true, color: TEAL, margin: 0, align: "center" });
  s.addText("/ 10", { x: 3.1, y: 2.2, w: 1.2, h: 0.9, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: TEXT_MUTED, margin: 0 });
  s.addText("test cases passed", { x: 0.7, y: 3.15, w: 3.2, h: 0.4, fontFace: FONT_BODY, fontSize: 13, color: TEXT_MUTED, align: "center", margin: 0 });

  const results = [
    { icon: "check", text: "All three transcript fallback layers verified (captions, yt-dlp, Whisper)" },
    { icon: "check", text: "Specific factual questions answered correctly, cited by timestamp" },
    { icon: "check", text: "Broad summary questions routed to full-transcript mode" },
    { icon: "check", text: "Multi-video queries cite the correct source video" },
    { icon: "check", text: "Timestamp citations correctly seek the embedded player" },
  ];
  let ry = 1.65;
  results.forEach((r) => {
    iconCircle(s, { x: 4.7, y: ry, size: 0.45, icon: r.icon, bg: TEAL });
    s.addText(r.text, { x: 5.35, y: ry - 0.05, w: 7.3, h: 0.55, fontFace: FONT_BODY, fontSize: 13.5, color: TEXT_DARK, margin: 0, valign: "middle" });
    ry += 0.85;
  });
  pageNum(s, 10);
}

// ============================================================
// Slide 11 — Demo
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Demo");
  const shots = [
    "Screenshot: paste-a-URL and indexing screen",
    "Screenshot: chat with a timestamp citation",
    "Screenshot: player after clicking a citation",
  ];
  const w = 3.85, h = 3.9, gap = 0.35, startX = 0.6, y = 1.9;
  shots.forEach((label, i) => {
    const x = startX + i * (w + gap);
    s.addShape("roundRect", { x, y, w, h, rectRadius: 0.1, fill: { color: OFFWHITE }, line: { color: CARD_BORDER, width: 1, dashType: "dash" } });
    s.addText("[ insert screenshot ]", { x, y: y + h / 2 - 0.5, w, h: 0.4, align: "center", fontFace: FONT_BODY, fontSize: 12, italic: true, color: TEXT_MUTED, margin: 0 });
    s.addText(label, { x: x + 0.2, y: y + h - 0.6, w: w - 0.4, h: 0.5, fontFace: FONT_BODY, fontSize: 12, color: TEXT_DARK, align: "center", margin: 0 });
  });
  pageNum(s, 11);
}

// ============================================================
// Slide 12 — Challenges faced
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Challenges faced");
  const challenges = [
    { icon: "warning", title: "Not every video has captions", desc: "Some videos have captions disabled entirely — solved with the yt-dlp and Whisper fallback layers" },
    { icon: "search", title: "Years and phrases confuse embeddings", desc: "Vector search alone couldn't reliably distinguish similar years — solved with hybrid retrieval" },
    { icon: "chunk", title: "Keeping citations jump-worthy", desc: "Chunks needed to stay short in time-span, not just word count, so a citation jumps to a useful moment" },
    { icon: "target", title: "Broad vs. specific questions", desc: "A single retrieval strategy didn't work for both summaries and fact lookups — needed explicit routing" },
  ];
  const colW = 5.9, gapX = 0.5, startX = 0.6, rowY = [1.65, 3.9];
  challenges.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = startX + col * (colW + gapX);
    const y = rowY[row];
    iconCircle(s, { x, y: y + 0.05, size: 0.65, icon: c.icon, bg: PURPLE });
    s.addText(c.title, { x: x + 0.85, y: y, w: colW - 0.85, h: 0.4, fontFace: FONT_HEAD, fontSize: 15, bold: true, color: TEXT_DARK, margin: 0, valign: "top" });
    s.addText(c.desc, { x: x + 0.85, y: y + 0.42, w: colW - 0.85, h: 1.4, fontFace: FONT_BODY, fontSize: 12.5, color: TEXT_MUTED, margin: 0, valign: "top", lineSpacingMultiple: 1.1 });
  });
  pageNum(s, 12);
}

// ============================================================
// Slide 13 — Future scope
// ============================================================
{
  const s = pres.addSlide();
  slideTitle(s, "Future scope");
  const future = [
    { icon: "future", text: "Support additional video platforms, and locally stored video files" },
    { icon: "database", text: "Persistent index storage, so videos don't need re-fetching each session" },
    { icon: "target", text: "Cross-encoder re-ranking for higher retrieval precision" },
    { icon: "chat", text: "Speaker diarization, so answers can cite who said what in multi-speaker videos" },
  ];
  let fy = 1.85;
  future.forEach((f) => {
    iconCircle(s, { x: 0.7, y: fy, size: 0.6, icon: f.icon, bg: TEAL });
    s.addText(f.text, { x: 1.5, y: fy, w: 10.8, h: 0.6, fontFace: FONT_BODY, fontSize: 16, color: TEXT_DARK, margin: 0, valign: "middle" });
    fy += 1.05;
  });
  pageNum(s, 13);
}

// ============================================================
// Slide 14 — Thank you
// ============================================================
{
  const s = pres.addSlide();
  s.addShape("rect", { x: 0, y: 0, w: SW, h: SH, fill: { color: NAVY }, line: { type: "none" } });
  s.addText("Thank you", { x: 0.9, y: 2.9, w: SW - 1.8, h: 1.0, fontFace: FONT_HEAD, fontSize: 44, bold: true, color: WHITE, margin: 0 });
  s.addText("Questions?", { x: 0.9, y: 3.9, w: SW - 1.8, h: 0.6, fontFace: FONT_BODY, fontSize: 20, color: "CADCFC", margin: 0 });
}

pres.writeFile({ fileName: path.join(__dirname, "Chat_With_YouTube_Presentation.pptx") }).then(() => {
  console.log("Generated Chat_With_YouTube_Presentation.pptx");
});
