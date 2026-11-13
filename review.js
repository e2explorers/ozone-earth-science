const terms = [
  "Ozone", "Ozone layer", "Troposphere", "Stratosphere",
  "Ultraviolet radiation", "Chlorofluorocarbons (CFCs)"
];

const questions = [
  "How much UV-B does the atmosphere absorb, and which type of UV is absorbed entirely?",
  "True or false? Ozone levels over the U.S. declined from 1978 to 1991. Cite the change reported in the reading.",
  "Name three possible health effects of increased UV-B exposure.",
  "In its 1987 scenario, how many Americans did the EPA estimate could develop skin cancer over 88 years?",
  "Explain how sunlight helps form ozone in the stratosphere.",
  "What is an ozone hole, and how does it affect the amount of UV-B that reaches Earth?",
  "Where did British scientists report severe seasonal ozone loss in 1985?",
  "Describe one way countries can reduce ozone depletion.",
  "Which class of pollutants was widely used and destroys ozone by releasing chlorine?",
  "List three products or industrial uses that once commonly involved CFCs.",
  "True or false? Engineers and manufacturers developed alternatives to CFCs."
];

function addFields(container, prompts, numbered) {
  return prompts.map((prompt, index) => {
    const label = document.createElement("label");
    label.textContent = numbered ? `${index + 1}. ${prompt}` : prompt;
    const field = document.createElement("textarea");
    field.rows = numbered ? 3 : 2;
    label.append(field);
    container.append(label);
    return { prompt: label.firstChild.textContent, field };
  });
}

const groups = [
  { title: "Vocabulary", items: addFields(document.querySelector("#terms"), terms, false) },
  { title: "Key Ideas", items: addFields(document.querySelector("#questions"), questions, true) }
];

function wrapText(text, font, size, width) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const combined = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(combined, size) <= width) {
        line = combined;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, size) > width) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

async function makePdf(student, date) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.create();
  pdf.setTitle("Ozone Earth Science Web Form");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const teal = rgb(.04, .33, .43);
  const ink = rgb(.08, .17, .21);
  const digits = "₀₁₂₃₄₅₆₇₈₉";
  let page;
  let y;

  function normalize(text) {
    return text.replace(/[₀-₉]/g, digit => String(digits.indexOf(digit)))
      .replace(/[→−]/g, symbol => symbol === "→" ? "->" : "-");
  }

  function addPage() {
    page = pdf.addPage([612, 792]);
    y = 742;
    page.drawText("Ozone Earth Science Web Form", { x: 48, y, font: bold, size: 19, color: teal });
    y -= 24;
    for (const line of wrapText(normalize(student + (date ? `  |  ${date}` : "")), normal, 11, 516)) {
      page.drawText(line, { x: 48, y, font: normal, size: 11, color: ink });
      y -= 16;
    }
    page.drawLine({ start: { x: 48, y }, end: { x: 564, y }, color: teal, thickness: 1 });
    page.drawText(`Section 4 • High School Earth Science                                      Page ${pdf.getPageCount()}`,
      { x: 48, y: 28, font: normal, size: 9, color: teal });
    y -= 28;
  }

  function drawLines(lines, font, size, color, x) {
    for (const line of lines) {
      if (y < 52) addPage();
      if (line) page.drawText(line, { x, y, font, size, color });
      y -= size + 5;
    }
  }

  addPage();
  for (const group of groups) {
    if (y < 145) addPage();
    drawLines([group.title], bold, 15, teal, 48);
    y -= 6;
    for (const { prompt, field } of group.items) {
      const promptLines = wrapText(prompt, bold, 11, 516);
      const response = normalize(field.value.trim()) || "[No response]";
      const responseLines = wrapText(response, normal, 11, 502);
      if (y < 52 + 16 * promptLines.length) addPage();
      drawLines(promptLines, bold, 11, ink, 48);
      drawLines(responseLines, normal, 11, ink, 62);
      y -= 10;
    }
  }
  return pdf.save();
}

const form = document.querySelector("#review");
const student = document.querySelector("#student");
const status = document.querySelector("#status");
const button = form.querySelector("button");

form.addEventListener("submit", async event => {
  event.preventDefault();
  const name = student.value.trim();
  if (!name) {
    status.textContent = "Enter your name before downloading.";
    student.focus();
    return;
  }

  button.disabled = true;
  status.textContent = "Preparing your PDF…";
  try {
    const pdf = await makePdf(name, document.querySelector("#date").value);
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ozone_Review_${name.replace(/[^\p{L}\p{N}-]+/gu, "_")}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent = "Your PDF is ready. Check your downloads for your copy.";
  } catch (error) {
    status.textContent = /cannot encode/i.test(error.message)
      ? "One of your entries contains a character the PDF font cannot display. Try removing unusual symbols or emoji and download again."
      : "The PDF could not be created. Keep this tab open and try downloading again.";
  } finally {
    button.disabled = false;
  }
});
