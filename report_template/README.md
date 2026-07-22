# Report template — reuse for each student

This generates a full college project report (`Chat_With_YouTube_Report.docx`) with
all 8 standard chapters, the architecture diagrams already embedded, a requirements
table, and a testing table — everything except the student's personal details and
their own screenshots.

## To generate a report for a new student

**Recommended: use the master script instead of running this alone** — see
`../scripts/generate_all.sh`, which regenerates both the report and the
presentation together and packages them into `../deliverables/`.

To run just this one manually:

1. Edit `../student_config.json` (shared by both the report and the presentation):
   ```json
   {
     "PROJECT_TITLE": "...",
     "PROJECT_TYPE": "Mini Project",
     "STUDENT_NAME": "...",
     "ROLL_NUMBER": "...",
     "COLLEGE_NAME": "...",
     "DEPARTMENT": "...",
     "UNIVERSITY_NAME": "...",
     "GUIDE_NAME": "...",
     "HOD_NAME": "...",
     "ACADEMIC_YEAR": "...",
     "SUBMISSION_MONTH_YEAR": "..."
   }
   ```
2. Run:
   ```bash
   node generate_report.js
   ```
3. `Chat_With_YouTube_Report.docx` is regenerated with the new details.

## Before handing it to the student

- **Update the Table of Contents**: open the doc in Word, right-click the Table
  of Contents section, choose "Update Field" → "Update entire table". This is
  a standard Word behavior for any generated TOC field, not specific to this
  script — it never auto-populates on first open.
- **Replace Chapter 7 placeholder text** with actual screenshots of the running
  app (the video-URL input screen, the loaded-videos panel, a sample Q&A with a
  timestamp citation, and the player after clicking a citation). Insert these as
  images in Word after the placeholder paragraph, then delete the placeholder text.
- **Chapter 2 (Literature Survey) citations** are standard RAG/NLP/ASR references,
  not specific to any single institution's format — check whether the student's
  department requires IEEE or APA style specifically and reformat the References
  chapter if so.

## Customization notes

- The two diagrams embedded in Chapter 4 come from `assets/architecture_diagram.png`
  and `assets/query_routing_diagram.png` — regenerate these from the SVGs in
  `../docs/` if you change the pipeline design.
- If a student wants their submission to look distinct from a classmate's (recommended,
  since colleges run plagiarism checks including code similarity), consider varying:
  the example video domain used in Chapter 1/7 screenshots (e.g. "chemistry lecture
  Q&A" instead of a generic demo video), the exact wording of a few paragraphs, or
  adding one extra feature described in Chapter 8's future scope as "implemented"
  instead — speaker diarization is a natural pick, since it's plausible to build in
  isolation without touching the rest of the pipeline.
