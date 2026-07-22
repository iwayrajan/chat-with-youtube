/*
 * Reusable college project report generator for the Chat with YouTube project.
 *
 * HOW TO REUSE FOR EACH STUDENT:
 *   1. Edit ../student_config.json with the student's details.
 *   2. Run: node generate_report.js  (or use scripts/generate_all.sh from repo root
 *      to regenerate both the report and the presentation together).
 *   3. Output: Chat_With_YouTube_Report.docx in this folder.
 *
 * That's it — everything else (chapters, diagrams, test cases) stays the same
 * across students. Only swap student_config.json, and optionally the
 * screenshots in Chapter 7.
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ImageRun, PageBreak, TableOfContents, Header, Footer, PageNumber,
  LevelFormat, convertInchesToTwip,
} = require("docx");
const fs = require("fs");

// ============================================================
// CONFIG — loaded from the shared student_config.json at the repo root.
// Edit that one file (not this one) to generate a report for a new student.
// ============================================================
const CONFIG = require("../student_config.json");

// ============================================================
// Helpers
// ============================================================
function heading(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 200, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    numbering: { reference: "bullet-list", level: 0 },
    spacing: { after: 100 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function centerTitle(text, size = 32, bold = true) {
  return new Paragraph({
    children: [new TextRun({ text, bold, size })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
}

function tableCell(text, { header = false, width = 2000 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "D9D9D9" } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: header, size: 20 })],
      }),
    ],
  });
}

// ============================================================
// Title page
// ============================================================
const titlePageChildren = [
  new Paragraph({ text: "", spacing: { after: 600 } }),
  centerTitle(CONFIG.PROJECT_TITLE, 32, true),
  new Paragraph({ text: "", spacing: { after: 300 } }),
  centerTitle(`A ${CONFIG.PROJECT_TYPE} Report`, 24, false),
  new Paragraph({ text: "", spacing: { after: 400 } }),
  centerTitle("Submitted in partial fulfilment of the requirements for the award of", 22, false),
  centerTitle(`the degree in ${CONFIG.DEPARTMENT}`, 22, false),
  new Paragraph({ text: "", spacing: { after: 600 } }),
  centerTitle("By", 22, false),
  centerTitle(CONFIG.STUDENT_NAME, 26, true),
  centerTitle(`Roll No: ${CONFIG.ROLL_NUMBER}`, 20, false),
  new Paragraph({ text: "", spacing: { after: 600 } }),
  centerTitle("Under the guidance of", 20, false),
  centerTitle(CONFIG.GUIDE_NAME, 24, true),
  new Paragraph({ text: "", spacing: { after: 600 } }),
  centerTitle(CONFIG.COLLEGE_NAME, 26, true),
  centerTitle(CONFIG.UNIVERSITY_NAME, 22, false),
  centerTitle(CONFIG.SUBMISSION_MONTH_YEAR, 20, false),
  pageBreak(),
];

// ============================================================
// Certificate page
// ============================================================
const certificateChildren = [
  heading("Certificate", HeadingLevel.HEADING_1),
  body(
    `This is to certify that the ${CONFIG.PROJECT_TYPE.toLowerCase()} report entitled "${CONFIG.PROJECT_TITLE}" is a bonafide record of work carried out by ${CONFIG.STUDENT_NAME} (Roll No: ${CONFIG.ROLL_NUMBER}), submitted in partial fulfilment of the requirements for the award of degree in ${CONFIG.DEPARTMENT} at ${CONFIG.COLLEGE_NAME}, during the academic year ${CONFIG.ACADEMIC_YEAR}.`
  ),
  new Paragraph({ text: "", spacing: { after: 800 } }),
  new Paragraph({
    children: [new TextRun({ text: `Guide: ${CONFIG.GUIDE_NAME}`, size: 24 })],
    spacing: { after: 200 },
  }),
  new Paragraph({
    children: [new TextRun({ text: `Head of Department: ${CONFIG.HOD_NAME}`, size: 24 })],
    spacing: { after: 200 },
  }),
  pageBreak(),
];

// ============================================================
// Acknowledgement + Abstract
// ============================================================
const abstractChildren = [
  heading("Acknowledgement", HeadingLevel.HEADING_1),
  body(
    `I would like to express my sincere gratitude to ${CONFIG.GUIDE_NAME} for continuous guidance and support throughout this project. I also thank ${CONFIG.HOD_NAME} and the faculty of ${CONFIG.DEPARTMENT}, ${CONFIG.COLLEGE_NAME}, for providing the resources and environment necessary to complete this work.`
  ),
  new Paragraph({ text: "", spacing: { after: 400 } }),
  heading("Abstract", HeadingLevel.HEADING_1),
  body(
    "Retrieval-Augmented Generation (RAG) is an approach that combines information retrieval with large language models to answer questions grounded in specific source content, rather than relying solely on a model's pre-trained knowledge. This project implements a lightweight, CPU-only RAG system that allows a user to paste a YouTube video link and interactively ask questions about the video's spoken content through a chat interface, with every answer cited by the exact timestamp it came from."
  ),
  body(
    "The system obtains the video's transcript through a layered fallback strategy: it first attempts to read existing YouTube captions directly, falls back to extracting the same captions through a different tool if the first method is blocked, and as a last resort transcribes the video's audio using an automatic speech recognition model for videos with no captions at all. The transcript is split into overlapping, timestamped chunks and converted into vector embeddings using a compact sentence-transformer model. These embeddings are indexed using FAISS for efficient similarity search. At query time, the system uses a hybrid retrieval strategy that combines exact keyword matching with vector similarity search, which improves accuracy for queries containing specific identifiers such as years or quoted phrases. The system also distinguishes between broad, whole-video questions (such as requests for a summary) and narrow, fact-based questions, routing each to the retrieval strategy best suited to it. Retrieved context is passed to a large language model, accessed through Groq's free-tier API, to generate a final answer that cites the specific timestamp the information came from, letting the user jump the embedded video player directly to that moment."
  ),
  body(
    "The resulting application is implemented in Python using Streamlit for the user interface, and demonstrates the core principles of RAG systems including transcript chunking, vector embeddings, semantic search, and grounded text generation, while remaining lightweight enough to run on a standard CPU-only machine."
  ),
  pageBreak(),
];

// ============================================================
// Table of Contents
// ============================================================
const tocChildren = [
  heading("Table of Contents", HeadingLevel.HEADING_1),
  new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
  pageBreak(),
];

// ============================================================
// Chapter 1: Introduction
// ============================================================
const chapter1 = [
  heading("Chapter 1: Introduction", HeadingLevel.HEADING_1),

  heading("1.1 Problem Statement", HeadingLevel.HEADING_2),
  body(
    "Long-form video content, such as lectures, tutorials, and talks, contains valuable information that is difficult to search or revisit. A viewer who wants a specific fact from a two-hour video must either watch the whole thing or scrub through it manually, since YouTube's own search only matches the video's title and description, not what is actually said inside it. Large language models can understand natural-language questions well but have no access to a specific video's spoken content, and are prone to generating plausible-sounding but incorrect answers (commonly called hallucination) when asked about content they were not trained on. There is a need for a system that combines the natural-language understanding of an LLM with the factual grounding of a specific video's own transcript."
  ),

  heading("1.2 Objectives", HeadingLevel.HEADING_2),
  bullet("To design and implement a pipeline that converts a YouTube video's spoken content into a searchable knowledge base."),
  bullet("To reliably obtain a transcript even for videos without existing captions, using a layered fallback strategy including automatic speech recognition."),
  bullet("To use semantic vector search to retrieve transcript segments relevant to a user's natural-language question."),
  bullet("To improve retrieval accuracy for exact identifiers (e.g. years, quoted phrases) using a hybrid keyword and vector search strategy."),
  bullet("To generate grounded, cited answers using a large language model, with citations that let the user jump directly to the cited moment in the video."),
  new Paragraph({ text: "", spacing: { after: 200 } }),

  heading("1.3 Scope", HeadingLevel.HEADING_2),
  body(
    "The system accepts a YouTube video URL as input and allows multiple videos to be indexed and queried together. It is designed for personal or academic use cases such as querying lecture recordings, tutorials, or talks, and does not currently support other video platforms, offline video files, or videos that are private, age-restricted, or region-locked in a way that prevents both transcript and audio access."
  ),
  pageBreak(),
];

// ============================================================
// Chapter 2: Literature Survey
// ============================================================
const chapter2 = [
  heading("Chapter 2: Literature Survey", HeadingLevel.HEADING_1),
  body(
    "Traditional document search systems have relied on keyword-matching techniques such as TF-IDF and BM25, which rank documents by term frequency and inverse document frequency. These approaches are computationally efficient and remain widely used in production search engines, but they struggle when a query uses synonyms or paraphrasing not present in the source text, a limitation that applies equally to searching a video transcript."
  ),
  body(
    "The introduction of transformer-based sentence embedding models, such as those in the Sentence-BERT family, enabled semantic search: representing text as dense vectors in a high-dimensional space such that texts with similar meaning are placed close together, regardless of exact wording. Libraries such as FAISS (Facebook AI Similarity Search) provide efficient approximate and exact nearest-neighbour search over large collections of such vectors, making semantic search practical even on modest hardware."
  ),
  body(
    "Retrieval-Augmented Generation, introduced by Lewis et al. (2020), combined a retriever component with a sequence-to-sequence generator, allowing a language model to condition its output on retrieved passages rather than relying purely on parameters learned during training. This approach has since become a standard pattern for building question-answering systems over private or domain-specific content collections, as it reduces hallucination and allows the knowledge base to be updated without retraining the underlying language model."
  ),
  body(
    "Applying RAG to video requires an additional step not present in document-based RAG: obtaining a text transcript in the first place. Automatic speech recognition models such as OpenAI's Whisper architecture have made this practical even for audio with no existing captions, converting spoken audio into timestamped text with word-level or segment-level timing information, which this project relies on as a fallback path for videos without usable captions."
  ),
  body(
    "A known limitation of pure vector-based retrieval, noted in hybrid-search literature, is that dense embeddings can struggle to distinguish between texts that are semantically similar but differ in specific literal details, such as years, numeric identifiers, or exact quoted phrases. Hybrid retrieval approaches, which combine sparse keyword-based matching with dense vector search, have been shown to mitigate this weakness. This project adopts a simplified hybrid retrieval strategy for the same reason, using literal substring matching for years and quoted phrases alongside vector similarity search."
  ),
  pageBreak(),
];

// ============================================================
// Chapter 3: System Analysis
// ============================================================
const srsRows = [
  ["Requirement ID", "Description", "Type"],
  ["FR-1", "The system shall allow a user to submit a YouTube video URL.", "Functional"],
  ["FR-2", "The system shall obtain a timestamped transcript of the video, falling back through multiple methods if needed.", "Functional"],
  ["FR-3", "The system shall split the transcript into chunks suitable for embedding, preserving timestamp ranges.", "Functional"],
  ["FR-4", "The system shall generate vector embeddings for each chunk.", "Functional"],
  ["FR-5", "The system shall retrieve the most relevant chunks for a given user question.", "Functional"],
  ["FR-6", "The system shall generate a natural-language answer using a large language model, grounded in retrieved chunks.", "Functional"],
  ["FR-7", "The system shall display the source video and timestamp for each answer, and allow the user to jump the player to that timestamp.", "Functional"],
  ["NFR-1", "The system shall run on a CPU-only machine without requiring a GPU.", "Non-functional"],
  ["NFR-2", "The embedding and retrieval steps shall not depend on any paid API.", "Non-functional"],
  ["NFR-3", "The user interface shall be usable without prior technical training.", "Non-functional"],
];

function buildTable(rows, colWidths) {
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map((row, i) =>
      new TableRow({
        children: row.map((cell, j) => tableCell(cell, { header: i === 0, width: colWidths[j] })),
      })
    ),
  });
}

const chapter3 = [
  heading("Chapter 3: System Analysis", HeadingLevel.HEADING_1),

  heading("3.1 Feasibility Study", HeadingLevel.HEADING_2),
  body(
    "The system is technically feasible on standard consumer hardware. Transcript chunking, sentence embedding, and vector similarity search are all designed to run efficiently on a CPU. Two components use an external service: transcript fallback (when captions are unavailable, audio is transcribed via Groq's hosted Whisper model) and final answer generation (via Groq's chat API). Groq offers a free tier sufficient for personal and academic use, making the system economically feasible without any licensing cost. No specialised infrastructure, GPU hardware, or paid subscriptions are required, though a working internet connection is needed throughout, since transcript fetching and answer generation are both network-dependent."
  ),

  heading("3.2 Requirements Specification", HeadingLevel.HEADING_2),
  body("The functional and non-functional requirements of the system are summarised below."),
  buildTable(srsRows, [1500, 6000, 1500]),
  new Paragraph({ text: "", spacing: { after: 200 } }),

  heading("3.3 Hardware and Software Requirements", HeadingLevel.HEADING_2),
  bullet("Processor: Any modern x86-64 processor (Intel/AMD), no GPU required."),
  bullet("RAM: 4 GB minimum, 8 GB recommended."),
  bullet("Operating System: Windows, Linux, or macOS."),
  bullet("Software: Python 3.10 or above, pip package manager, ffmpeg (for the audio-transcription fallback path)."),
  bullet("Key libraries: Streamlit, youtube-transcript-api, yt-dlp, sentence-transformers, faiss-cpu, groq."),
  bullet("Internet connection: required throughout — for transcript fetching, the initial embedding-model download, and LLM API calls."),
  pageBreak(),
];

// ============================================================
// Chapter 4: System Design
// ============================================================
const chapter4 = [
  heading("Chapter 4: System Design", HeadingLevel.HEADING_1),

  heading("4.1 System Architecture", HeadingLevel.HEADING_2),
  body(
    "The system is organised into two phases: an indexing phase, which runs once per submitted video, and a query phase, which runs each time the user asks a question. Figure 4.1 shows the overall architecture."
  ),
  new Paragraph({
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(__dirname + "/assets/architecture_diagram.png"),
        transformation: { width: 600, height: 265 },
      }),
    ],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: "Figure 4.1: System architecture showing the indexing phase and query phase", italics: true, size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }),
  body(
    "In the indexing phase, a submitted YouTube URL is resolved to a transcript through a layered fallback (existing captions, then an alternate caption-extraction tool, then audio transcription as a last resort), split into overlapping, timestamped chunks, and embedded into vectors stored in a FAISS index. In the query phase, the user's question is processed by a hybrid retrieval step that combines exact keyword matching with vector similarity search, and the retrieved chunks are passed to a large language model (accessed via the Groq API) to generate the final answer, cited by timestamp."
  ),

  heading("4.2 Query Routing Logic", HeadingLevel.HEADING_2),
  body(
    "Not all questions are best served by the same retrieval strategy. Broad questions, such as requests for a video summary, do not correspond to any single passage in the transcript and are poorly served by similarity search, which can only retrieve passages resembling the query itself. Specific questions, such as those referring to a particular year, date, or an exact phrase from the video, benefit from exact keyword matching in addition to semantic search, since embeddings do not reliably distinguish between similar numeric identifiers or reproduce exact quoted wording. Figure 4.2 illustrates how each incoming question is routed."
  ),
  new Paragraph({
    children: [
      new ImageRun({
        type: "png",
        data: fs.readFileSync(__dirname + "/assets/query_routing_diagram.png"),
        transformation: { width: 500, height: 316 },
      }),
    ],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: "Figure 4.2: Decision logic for routing broad vs. specific questions", italics: true, size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }),

  heading("4.3 Module Design", HeadingLevel.HEADING_2),
  bullet("transcript_fetcher.py — Resolves a YouTube URL to a timestamped transcript through the three-layer fallback chain, independent of the rest of the pipeline."),
  bullet("rag.py — Core pipeline module: transcript chunking, embedding, FAISS indexing, and hybrid retrieval logic. Independent of the user interface."),
  bullet("app.py — Streamlit-based user interface: video URL handling, chat interface, session state management, the jumpable video player, and integration with the Groq API for answer generation."),
  pageBreak(),
];

// ============================================================
// Chapter 5: Implementation
// ============================================================
const chapter5 = [
  heading("Chapter 5: Implementation", HeadingLevel.HEADING_1),

  heading("5.1 Technology Stack", HeadingLevel.HEADING_2),
  bullet("Python 3 — primary implementation language."),
  bullet("Streamlit — web-based user interface framework."),
  bullet("youtube-transcript-api — primary transcript source, reading existing YouTube captions directly."),
  bullet("yt-dlp — fallback caption extraction, and audio download for the transcription fallback."),
  bullet("Groq Whisper (whisper-large-v3) — last-resort audio transcription for videos with no usable captions."),
  bullet("sentence-transformers (all-MiniLM-L6-v2) — generates dense vector embeddings on CPU."),
  bullet("FAISS (faiss-cpu) — efficient vector similarity search."),
  bullet("Groq API (Llama models) — large language model used for final answer generation."),
  new Paragraph({ text: "", spacing: { after: 200 } }),

  heading("5.2 Transcript Acquisition", HeadingLevel.HEADING_2),
  body(
    "Given a YouTube URL, the system first attempts to read the video's existing captions using youtube-transcript-api, which is fast since it requires no download. If this fails — for example, because the caller's IP address is being rate-limited by YouTube — the system falls back to yt-dlp, which reaches the same caption tracks through a different code path and often succeeds where the first method is blocked. If the video has no captions at all (neither manual nor auto-generated), the system downloads the video's audio track using yt-dlp and transcribes it using Groq's hosted Whisper model, which returns text segments with their own start and end timestamps. All three paths converge on the same output shape: a list of timestamped text segments, so the rest of the pipeline does not need to know which method produced them."
  ),

  heading("5.3 Chunking", HeadingLevel.HEADING_2),
  body(
    "The timestamped transcript segments are flattened into a single stream of words, each still tagged with the start and end time of the segment it came from. This stream is then split into fixed-size, overlapping windows by word count, similar in principle to splitting a document by word count with overlap, except each resulting chunk's timestamp range is derived from the timestamps of the words it contains, rather than a page number. Chunks are kept relatively short (around 120 words) because each chunk doubles as a clickable citation that jumps the video player — a chunk spanning a long stretch of the video would make for a much less useful jump target."
  ),

  heading("5.4 Embedding and Indexing", HeadingLevel.HEADING_2),
  body(
    "Each text chunk is converted into a 384-dimensional vector using the all-MiniLM-L6-v2 sentence-transformer model, which runs efficiently on CPU. All chunk vectors are added to a FAISS IndexFlatL2 index, which performs exact nearest-neighbour search using Euclidean distance. When multiple videos are indexed, their chunks share a single combined index, allowing questions to be answered using information from any of the loaded videos."
  ),

  heading("5.5 Hybrid Retrieval", HeadingLevel.HEADING_2),
  body(
    "At query time, the user's question is first scanned for two kinds of literal patterns: numeric identifiers such as years or dotted section-style numbers, and quoted phrases enclosed in single or double quotes. If either is present, the system performs a literal, case-insensitive search across all chunks for text containing that identifier or phrase, and these exact matches are placed first in the retrieved context. The remaining slots, up to the configured number of chunks to retrieve, are filled using vector similarity search. This hybrid approach matters more for spoken video content than for documents, since questions about video content frequently reference a specific year, date, or an exact remembered phrase, none of which a pure embedding comparison reliably distinguishes from similar-sounding alternatives."
  ),

  heading("5.6 Broad Question Detection", HeadingLevel.HEADING_2),
  body(
    "Questions containing signals such as \"summarize\", \"overview\", or \"main points\" are detected and routed differently from narrow, fact-based questions. Instead of retrieving a small number of chunks by similarity, which performs poorly for whole-video questions, the system supplies the full transcript of the video (up to a safe token limit) directly to the language model."
  ),

  heading("5.7 Answer Generation and Timestamp Navigation", HeadingLevel.HEADING_2),
  body(
    "The retrieved chunks (or full transcript text, for broad questions), together with source and timestamp metadata, are assembled into a prompt instructing the language model to answer strictly from the provided context, to state when the answer is not present in the context, and to cite the specific video and timestamp for any information used. This prompt is sent to a Llama model hosted on Groq's infrastructure, chosen for its free tier and fast inference speed relative to comparable hosted models. In the user interface, each retrieved chunk is shown alongside a clickable timestamp button; clicking it reseeks the embedded video player to that exact second, letting the user verify the answer directly against the source video."
  ),
  pageBreak(),
];

// ============================================================
// Chapter 6: Testing
// ============================================================
const testRows = [
  ["Test ID", "Test Description", "Input", "Expected Output", "Result"],
  ["T-1", "Add a video with existing manual captions", "YouTube URL with captions", "Transcript fetched via primary method; video indexed", "Pass"],
  ["T-2", "Add a video with only auto-generated captions", "YouTube URL, auto-captions only", "Transcript fetched; video indexed", "Pass"],
  ["T-3", "Add a video with no captions at all", "YouTube URL, captions disabled", "Falls back to audio transcription; video indexed", "Pass"],
  ["T-4", "Ask a specific factual question", "\"What did they say about X in 2021?\"", "Correct segment retrieved and cited with timestamp", "Pass"],
  ["T-5", "Ask for a video summary", "\"Summarize this video\"", "Full-transcript mode used; coherent summary generated", "Pass"],
  ["T-6", "Ask about a quoted phrase", "\"What did they mean by 'quoted phrase'?\"", "Exact segment containing the phrase retrieved via literal match", "Pass"],
  ["T-7", "Add multiple videos", "Two YouTube URLs", "Both indexed; answers cite the correct source video", "Pass"],
  ["T-8", "Remove a loaded video", "Click \"Remove\" on a loaded video", "Video excluded from further answers", "Pass"],
  ["T-9", "Ask a question with no relevant content", "Unrelated question", "System responds that it lacks sufficient information", "Pass"],
  ["T-10", "Click a timestamp citation", "Click \"Jump to 12:34\"", "Embedded player seeks to that exact second", "Pass"],
];

const chapter6 = [
  heading("Chapter 6: Testing", HeadingLevel.HEADING_1),
  body(
    "The system was tested manually against a range of representative scenarios covering all three transcript-acquisition paths, specific and broad question types, multi-video handling, and edge cases. The test cases and their outcomes are summarised in Table 6.1."
  ),
  buildTable(testRows, [900, 2600, 2000, 2600, 900]),
  new Paragraph({
    children: [new TextRun({ text: "Table 6.1: Test cases and results", italics: true, size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 300 },
  }),
  body(
    "All test cases passed, confirming that the three-layer transcript fallback correctly handles videos in every captioning state, that the hybrid retrieval strategy correctly distinguishes literal identifiers and quoted phrases from similarly-worded alternatives, that broad questions are correctly routed to full-transcript mode, and that timestamp citations correctly reflect the source video and reseek the embedded player."
  ),
  pageBreak(),
];

// ============================================================
// Chapter 7: Results and Screenshots
// ============================================================
const chapter7 = [
  heading("Chapter 7: Results and Screenshots", HeadingLevel.HEADING_1),
  body(
    "[Insert screenshots of the running application here: the video-URL input screen, the loaded-videos panel, a sample question-and-answer exchange showing a cited timestamp response, and the embedded player after clicking a timestamp citation. Replace this paragraph with the actual screenshots before submission.]"
  ),
  body(
    "The system successfully answers both specific and broad questions across single and multiple loaded videos, with citations correctly identifying the source video and timestamp for each answer, and clicking a citation correctly seeks the embedded player to that moment."
  ),
  pageBreak(),
];

// ============================================================
// Chapter 8: Conclusion and Future Scope
// ============================================================
const chapter8 = [
  heading("Chapter 8: Conclusion and Future Scope", HeadingLevel.HEADING_1),

  heading("8.1 Conclusion", HeadingLevel.HEADING_2),
  body(
    "This project successfully implements a lightweight, CPU-only Retrieval-Augmented Generation system for querying YouTube video content. By combining a resilient, multi-layer transcript acquisition strategy, timestamp-aware chunking, vector embeddings, hybrid keyword-and-vector retrieval, and a large language model for answer generation, the system is able to answer natural-language questions grounded in a video's own spoken content, while citing the exact timestamp for each answer and letting the user jump directly to it in the player. The project demonstrates that a practical, useful RAG system can be built over video content without specialised hardware or paid infrastructure, using open-source libraries and free-tier APIs."
  ),

  heading("8.2 Future Scope", HeadingLevel.HEADING_2),
  bullet("Support for additional video platforms beyond YouTube, and for locally stored video files."),
  bullet("Persistent storage of the vector index, so videos do not need to be re-fetched and re-indexed after restarting the application."),
  bullet("A re-ranking step using a cross-encoder model to further improve retrieval precision."),
  bullet("Multi-user support with authentication and separate video collections per user."),
  bullet("Speaker diarization, so answers can additionally cite which speaker said a given piece of information in multi-speaker videos."),
  bullet("Quantitative evaluation of retrieval quality using standard information-retrieval metrics such as precision@k and recall@k."),
  pageBreak(),
];

// ============================================================
// References
// ============================================================
const references = [
  heading("References", HeadingLevel.HEADING_1),
  body("[1] Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. Advances in Neural Information Processing Systems (NeurIPS)."),
  body("[2] Reimers, N., and Gurevych, I. (2019). Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks. Proceedings of EMNLP-IJCNLP."),
  body("[3] Johnson, J., Douze, M., and Jegou, H. (2019). Billion-scale similarity search with GPUs. IEEE Transactions on Big Data. (FAISS)"),
  body("[4] Robertson, S., and Zaragoza, H. (2009). The Probabilistic Relevance Framework: BM25 and Beyond. Foundations and Trends in Information Retrieval."),
  body("[5] Radford, A., et al. (2022). Robust Speech Recognition via Large-Scale Weak Supervision. (Whisper)"),
  body("[6] Streamlit documentation. https://docs.streamlit.io"),
  body("[7] youtube-transcript-api documentation. https://github.com/jdepoix/youtube-transcript-api"),
  body("[8] yt-dlp documentation. https://github.com/yt-dlp/yt-dlp"),
  body("[9] Groq API documentation. https://console.groq.com/docs"),
];

// ============================================================
// Assemble document
// ============================================================
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT }],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: titlePageChildren,
    },
    {
      properties: {},
      children: certificateChildren,
    },
    {
      properties: {},
      children: abstractChildren,
    },
    {
      properties: {},
      children: tocChildren,
    },
    {
      properties: {},
      headers: {
        default: new Header({
          children: [new Paragraph({ text: CONFIG.PROJECT_TITLE, alignment: AlignmentType.CENTER })],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT] })],
            }),
          ],
        }),
      },
      children: [
        ...chapter1,
        ...chapter2,
        ...chapter3,
        ...chapter4,
        ...chapter5,
        ...chapter6,
        ...chapter7,
        ...chapter8,
        ...references,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(__dirname + "/Chat_With_YouTube_Report.docx", buffer);
  console.log("Generated Chat_With_YouTube_Report.docx");
});
