import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
  type RGB,
} from "pdf-lib";

import {
  getChildDocumentationData,
  type ChildDocumentationData,
} from "@/lib/child-documentation";

export const dynamic = "force-dynamic";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  ink: rgb(0.11, 0.18, 0.28),
  muted: rgb(0.42, 0.48, 0.58),
  line: rgb(0.86, 0.89, 0.93),
  white: rgb(1, 1, 1),

  paper: rgb(0.995, 0.99, 0.975),
  pink: rgb(0.94, 0.30, 0.55),
  pinkSoft: rgb(1.00, 0.92, 0.95),
  roseSoft: rgb(1.00, 0.95, 0.96),

  blue: rgb(0.15, 0.58, 0.78),
  blueSoft: rgb(0.91, 0.97, 1.00),

  green: rgb(0.10, 0.58, 0.42),
  greenSoft: rgb(0.91, 0.98, 0.94),

  yellow: rgb(0.95, 0.68, 0.18),
  yellowSoft: rgb(1.00, 0.97, 0.84),

  violet: rgb(0.48, 0.35, 0.78),
  violetSoft: rgb(0.95, 0.92, 1.00),

  peach: rgb(0.96, 0.58, 0.39),
  peachSoft: rgb(1.00, 0.94, 0.89),

  aquaSoft: rgb(0.90, 0.98, 0.97),
};

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cleanPdfText(value: string): string {
  return value
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .trim();
}

function daysBetween(firstDate: Date, secondDate: Date): number {
  const firstUtc = Date.UTC(
    firstDate.getFullYear(),
    firstDate.getMonth(),
    firstDate.getDate()
  );
  const secondUtc = Date.UTC(
    secondDate.getFullYear(),
    secondDate.getMonth(),
    secondDate.getDate()
  );

  return Math.max(
    0,
    Math.round((secondUtc - firstUtc) / 86_400_000)
  );
}

function getAgeDetails(birthday: string) {
  const birth = parseLocalDate(birthday);
  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  let years = today.getFullYear() - birth.getFullYear();

  let yearAnchor = new Date(
    birth.getFullYear() + years,
    birth.getMonth(),
    birth.getDate()
  );

  if (yearAnchor > today) {
    years -= 1;
    yearAnchor = new Date(
      birth.getFullYear() + years,
      birth.getMonth(),
      birth.getDate()
    );
  }

  let months =
    (today.getFullYear() - yearAnchor.getFullYear()) * 12 +
    today.getMonth() -
    yearAnchor.getMonth();

  let monthAnchor = new Date(
    yearAnchor.getFullYear(),
    yearAnchor.getMonth() + months,
    yearAnchor.getDate()
  );

  if (monthAnchor > today) {
    months -= 1;
    monthAnchor = new Date(
      yearAnchor.getFullYear(),
      yearAnchor.getMonth() + months,
      yearAnchor.getDate()
    );
  }

  const days = daysBetween(monthAnchor, today);

  let nextBirthday = new Date(
    today.getFullYear(),
    birth.getMonth(),
    birth.getDate()
  );

  if (nextBirthday < today) {
    nextBirthday = new Date(
      today.getFullYear() + 1,
      birth.getMonth(),
      birth.getDate()
    );
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days,
    totalDays: daysBetween(birth, today),
    nextBirthday,
    nextAge: nextBirthday.getFullYear() - birth.getFullYear(),
    daysUntilBirthday: daysBetween(today, nextBirthday),
  };
}

function formatAge(birthday: string): string {
  const age = getAgeDetails(birthday);
  const parts: string[] = [];

  if (age.years > 0) {
    parts.push(`${age.years} år`);
  }

  if (age.months > 0) {
    parts.push(
      `${age.months} ${age.months === 1 ? "månad" : "månader"}`
    );
  }

  if (age.days > 0 || parts.length === 0) {
    parts.push(
      `${age.days} ${age.days === 1 ? "dag" : "dagar"}`
    );
  }

  return parts.join(" och ");
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = cleanPdfText(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (
      font.widthOfTextAtSize(candidate, fontSize) <= maxWidth
    ) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  color = COLORS.ink,
  lineHeight = fontSize * 1.35
): number {
  const lines = wrapText(text, font, fontSize, maxWidth);

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size: fontSize,
      font,
      color,
    });
  });

  return y - lines.length * lineHeight;
}

function drawRoundedRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: RGB,
  borderColor?: RGB,
  borderWidth = 0
) {
  page.drawRectangle({
    x: x + radius,
    y,
    width: width - radius * 2,
    height,
    color,
  });

  page.drawRectangle({
    x,
    y: y + radius,
    width,
    height: height - radius * 2,
    color,
  });

  const corners = [
    [x + radius, y + radius],
    [x + width - radius, y + radius],
    [x + radius, y + height - radius],
    [x + width - radius, y + height - radius],
  ] as const;

  corners.forEach(([cx, cy]) => {
    page.drawCircle({
      x: cx,
      y: cy,
      size: radius,
      color,
    });
  });

  if (borderColor && borderWidth > 0) {
    page.drawLine({
      start: { x: x + radius, y: y + height },
      end: { x: x + width - radius, y: y + height },
      thickness: borderWidth,
      color: borderColor,
    });
    page.drawLine({
      start: { x: x + radius, y },
      end: { x: x + width - radius, y },
      thickness: borderWidth,
      color: borderColor,
    });
    page.drawLine({
      start: { x, y: y + radius },
      end: { x, y: y + height - radius },
      thickness: borderWidth,
      color: borderColor,
    });
    page.drawLine({
      start: { x: x + width, y: y + radius },
      end: { x: x + width, y: y + height - radius },
      thickness: borderWidth,
      color: borderColor,
    });
  }
}

function drawHeart(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: RGB
) {
  page.drawCircle({
    x: x - size * 0.23,
    y: y + size * 0.1,
    size: size * 0.28,
    color,
  });

  page.drawCircle({
    x: x + size * 0.23,
    y: y + size * 0.1,
    size: size * 0.28,
    color,
  });

  page.drawSvgPath(
    "M 0 0 L 20 22 L 40 0 Z",
    {
      x: x - size * 0.5,
      y: y - size * 0.48,
      scale: size / 40,
      color,
    }
  );
}

function drawStar(
  page: PDFPage,
  x: number,
  y: number,
  size: number,
  color: RGB
) {
  const points: Array<{ x: number; y: number }> = [];
  const outer = size;
  const inner = size * 0.45;

  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;

    points.push({
      x: x + Math.cos(angle) * radius,
      y: y + Math.sin(angle) * radius,
    });
  }

  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];

    page.drawLine({
      start: points[i],
      end: next,
      thickness: 1.5,
      color,
    });
  }
}

function drawCloud(
  page: PDFPage,
  x: number,
  y: number,
  scale: number,
  color: RGB
) {
  page.drawEllipse({
    x,
    y,
    xScale: 32 * scale,
    yScale: 15 * scale,
    color,
  });

  page.drawCircle({
    x: x - 19 * scale,
    y: y + 7 * scale,
    size: 13 * scale,
    color,
  });

  page.drawCircle({
    x,
    y: y + 12 * scale,
    size: 18 * scale,
    color,
  });

  page.drawCircle({
    x: x + 20 * scale,
    y: y + 8 * scale,
    size: 13 * scale,
    color,
  });
}

function drawBunny(
  page: PDFPage,
  x: number,
  y: number,
  scale = 1
) {
  const fur = rgb(0.95, 0.82, 0.74);
  const inner = rgb(1.00, 0.72, 0.78);
  const dark = COLORS.ink;

  page.drawEllipse({
    x: x - 14 * scale,
    y: y + 35 * scale,
    xScale: 8 * scale,
    yScale: 23 * scale,
    color: fur,
  });

  page.drawEllipse({
    x: x + 14 * scale,
    y: y + 35 * scale,
    xScale: 8 * scale,
    yScale: 23 * scale,
    color: fur,
  });

  page.drawEllipse({
    x: x - 14 * scale,
    y: y + 36 * scale,
    xScale: 3 * scale,
    yScale: 15 * scale,
    color: inner,
  });

  page.drawEllipse({
    x: x + 14 * scale,
    y: y + 36 * scale,
    xScale: 3 * scale,
    yScale: 15 * scale,
    color: inner,
  });

  page.drawCircle({
    x,
    y: y + 3 * scale,
    size: 27 * scale,
    color: fur,
  });

  page.drawCircle({
    x: x - 10 * scale,
    y: y + 8 * scale,
    size: 2.2 * scale,
    color: dark,
  });

  page.drawCircle({
    x: x + 10 * scale,
    y: y + 8 * scale,
    size: 2.2 * scale,
    color: dark,
  });

  page.drawCircle({
    x,
    y: y - 1 * scale,
    size: 2.2 * scale,
    color: COLORS.pink,
  });

  page.drawCircle({
    x: x - 14 * scale,
    y: y,
    size: 5 * scale,
    color: rgb(1, 0.77, 0.78),
  });

  page.drawCircle({
    x: x + 14 * scale,
    y,
    size: 5 * scale,
    color: rgb(1, 0.77, 0.78),
  });
}

function drawElephant(
  page: PDFPage,
  x: number,
  y: number,
  scale = 1
) {
  const body = rgb(0.68, 0.79, 0.88);
  const ear = rgb(0.91, 0.72, 0.78);

  page.drawCircle({
    x,
    y,
    size: 25 * scale,
    color: body,
  });

  page.drawCircle({
    x: x - 23 * scale,
    y: y + 2 * scale,
    size: 14 * scale,
    color: body,
  });

  page.drawCircle({
    x: x + 23 * scale,
    y: y + 2 * scale,
    size: 14 * scale,
    color: body,
  });

  page.drawCircle({
    x: x - 23 * scale,
    y: y + 2 * scale,
    size: 8 * scale,
    color: ear,
  });

  page.drawCircle({
    x: x + 23 * scale,
    y: y + 2 * scale,
    size: 8 * scale,
    color: ear,
  });

  page.drawRectangle({
    x: x - 4 * scale,
    y: y - 31 * scale,
    width: 8 * scale,
    height: 31 * scale,
    color: body,
  });

  page.drawCircle({
    x: x - 9 * scale,
    y: y + 7 * scale,
    size: 2 * scale,
    color: COLORS.ink,
  });

  page.drawCircle({
    x: x + 9 * scale,
    y: y + 7 * scale,
    size: 2 * scale,
    color: COLORS.ink,
  });
}

function decoratePage(page: PDFPage) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: COLORS.paper,
  });

  drawCloud(
    page,
    PAGE_WIDTH - 78,
    PAGE_HEIGHT - 48,
    0.72,
    COLORS.blueSoft
  );

  drawStar(
    page,
    PAGE_WIDTH - 35,
    PAGE_HEIGHT - 105,
    6,
    COLORS.yellow
  );

  drawHeart(
    page,
    28,
    PAGE_HEIGHT - 105,
    13,
    COLORS.pink
  );

  drawHeart(
    page,
    PAGE_WIDTH - 26,
    66,
    10,
    COLORS.peach
  );
}

function drawSectionTitle(
  page: PDFPage,
  title: string,
  y: number,
  bold: PDFFont,
  color = COLORS.ink
) {
  page.drawText(cleanPdfText(title), {
    x: MARGIN,
    y,
    size: 22,
    font: bold,
    color,
  });

  page.drawLine({
    start: { x: MARGIN, y: y - 12 },
    end: { x: PAGE_WIDTH - MARGIN, y: y - 12 },
    thickness: 1,
    color: COLORS.line,
  });
}

function newContentPage(
  pdf: PDFDocument,
  title: string,
  regular: PDFFont,
  bold: PDFFont
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  decoratePage(page);
  drawSectionTitle(page, title, PAGE_HEIGHT - 62, bold);

  return {
    page,
    y: PAGE_HEIGHT - 104,
  };
}

function drawStat(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  regular: PDFFont,
  bold: PDFFont,
  fill: RGB
) {
  drawRoundedRect(
    page,
    x,
    y - 68,
    width,
    68,
    13,
    fill,
    COLORS.line,
    0.7
  );

  page.drawText(cleanPdfText(label), {
    x: x + 13,
    y: y - 21,
    size: 8,
    font: bold,
    color: COLORS.muted,
  });

  const cleanValue = cleanPdfText(value);
  const maxWidth = width - 26;
  let fontSize = 16;

  while (
    fontSize > 9 &&
    bold.widthOfTextAtSize(cleanValue, fontSize) > maxWidth
  ) {
    fontSize -= 0.5;
  }

  page.drawText(cleanValue, {
    x: x + 13,
    y: y - 48,
    size: fontSize,
    font: bold,
    color: COLORS.ink,
  });
}

function addCover(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  decoratePage(page);

  drawRoundedRect(
    page,
    MARGIN,
    PAGE_HEIGHT - 245,
    CONTENT_WIDTH,
    164,
    22,
    COLORS.pinkSoft
  );

  drawBunny(
    page,
    MARGIN + 54,
    PAGE_HEIGHT - 161,
    0.95
  );

  const name = cleanPdfText(data.child.displayName);

  page.drawText(name, {
    x: MARGIN + 112,
    y: PAGE_HEIGHT - 126,
    size: 35,
    font: bold,
    color: COLORS.pink,
  });

  page.drawText("Barnets dokumentation", {
    x: MARGIN + 112,
    y: PAGE_HEIGHT - 158,
    size: 17,
    font: bold,
    color: COLORS.ink,
  });

  page.drawText(formatAge(data.child.birthday), {
    x: MARGIN + 112,
    y: PAGE_HEIGHT - 190,
    size: 11,
    font: regular,
    color: COLORS.muted,
  });

  const age = getAgeDetails(data.child.birthday);
  const latest = data.growth.at(-1);

  const cardGap = 10;
  const cardWidth = (CONTENT_WIDTH - cardGap * 3) / 4;
  const topY = PAGE_HEIGHT - 300;

  drawStat(
    page,
    MARGIN,
    topY,
    cardWidth,
    "FÖDD",
    formatDate(data.child.birthday),
    regular,
    bold,
    COLORS.roseSoft
  );

  drawStat(
    page,
    MARGIN + (cardWidth + cardGap),
    topY,
    cardWidth,
    "DAGAR GAMMAL",
    String(age.totalDays),
    regular,
    bold,
    COLORS.yellowSoft
  );

  drawStat(
    page,
    MARGIN + (cardWidth + cardGap) * 2,
    topY,
    cardWidth,
    "NÄSTA FÖDELSEDAG",
    age.daysUntilBirthday === 0
      ? "Idag"
      : `${age.daysUntilBirthday} dagar`,
    regular,
    bold,
    COLORS.greenSoft
  );

  drawStat(
    page,
    MARGIN + (cardWidth + cardGap) * 3,
    topY,
    cardWidth,
    "NÄSTA ÅLDER",
    `${age.nextAge} år`,
    regular,
    bold,
    COLORS.violetSoft
  );

  drawRoundedRect(
    page,
    MARGIN,
    PAGE_HEIGHT - 475,
    CONTENT_WIDTH,
    108,
    18,
    COLORS.blueSoft
  );

  if (latest) {
    drawStat(
      page,
      MARGIN + 14,
      PAGE_HEIGHT - 389,
      145,
      "SENASTE VIKT",
      latest.weightKg !== null
        ? `${latest.weightKg.toFixed(2)} kg`
        : "–",
      regular,
      bold,
      COLORS.white
    );

    drawStat(
      page,
      MARGIN + 174,
      PAGE_HEIGHT - 389,
      145,
      "SENASTE LÄNGD",
      latest.heightCm !== null
        ? `${latest.heightCm.toFixed(1)} cm`
        : "–",
      regular,
      bold,
      COLORS.white
    );

    drawStat(
      page,
      MARGIN + 334,
      PAGE_HEIGHT - 389,
      145,
      "MÄTNINGAR",
      String(data.growth.length),
      regular,
      bold,
      COLORS.white
    );
  } else {
    page.drawText("Mätningar", {
      x: MARGIN + 20,
      y: PAGE_HEIGHT - 421,
      size: 12,
      font: bold,
      color: COLORS.ink,
    });

    page.drawText("0", {
      x: MARGIN + 20,
      y: PAGE_HEIGHT - 450,
      size: 24,
      font: bold,
      color: COLORS.blue,
    });
  }

  drawElephant(
    page,
    PAGE_WIDTH - 95,
    115,
    1.05
  );

  drawHeart(
    page,
    PAGE_WIDTH - 145,
    145,
    12,
    COLORS.pink
  );

  drawStar(
    page,
    PAGE_WIDTH - 150,
    92,
    8,
    COLORS.yellow
  );

  page.drawText(
    formatDate(
      new Date(data.generatedAt).toISOString().slice(0, 10)
    ),
    {
      x: MARGIN,
      y: 48,
      size: 8.5,
      font: regular,
      color: COLORS.muted,
    }
  );
}

type GrowthMetric = {
  date: string;
  value: number;
};

function drawGrowthChart(
  page: PDFPage,
  values: GrowthMetric[],
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  unit: string,
  regular: PDFFont,
  bold: PDFFont,
  lineColor: RGB,
  fill: RGB
) {
  drawRoundedRect(
    page,
    x,
    y - height,
    width,
    height,
    16,
    fill,
    COLORS.line,
    0.7
  );

  page.drawText(cleanPdfText(title), {
    x: x + 14,
    y: y - 25,
    size: 13,
    font: bold,
    color: lineColor,
  });

  if (values.length === 0) {
    page.drawText("–", {
      x: x + 14,
      y: y - 55,
      size: 20,
      font: bold,
      color: COLORS.muted,
    });
    return;
  }

  if (values.length === 1) {
    const only = values[0];

    page.drawText(
      `${only.value.toFixed(unit === "kg" ? 2 : 1)} ${unit}`,
      {
        x: x + 14,
        y: y - 60,
        size: 19,
        font: bold,
        color: lineColor,
      }
    );

    page.drawText(formatShortDate(only.date), {
      x: x + 14,
      y: y - 82,
      size: 8,
      font: regular,
      color: COLORS.muted,
    });

    return;
  }

  const chartLeft = x + 40;
  const chartRight = x + width - 14;
  const chartTop = y - 50;
  const chartBottom = y - height + 35;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartTop - chartBottom;

  const rawMin = Math.min(...values.map((item) => item.value));
  const rawMax = Math.max(...values.map((item) => item.value));
  const padding = Math.max(
    (rawMax - rawMin) * 0.15,
    unit === "kg" ? 0.25 : 1
  );
  const minValue = Math.max(0, rawMin - padding);
  const maxValue = rawMax + padding;
  const valueRange = Math.max(maxValue - minValue, 1);

  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const lineY = chartBottom + ratio * chartHeight;

    page.drawLine({
      start: { x: chartLeft, y: lineY },
      end: { x: chartRight, y: lineY },
      thickness: 0.5,
      color: COLORS.line,
    });

    const labelValue = minValue + ratio * valueRange;

    page.drawText(
      unit === "kg"
        ? labelValue.toFixed(1)
        : Math.round(labelValue).toString(),
      {
        x: x + 8,
        y: lineY - 3,
        size: 7,
        font: regular,
        color: COLORS.muted,
      }
    );
  }

  const points = values.map((item, index) => {
    const ratioX = index / (values.length - 1);
    const ratioY = (item.value - minValue) / valueRange;

    return {
      x: chartLeft + ratioX * chartWidth,
      y: chartBottom + ratioY * chartHeight,
      item,
    };
  });

  for (let index = 1; index < points.length; index += 1) {
    page.drawLine({
      start: points[index - 1],
      end: points[index],
      thickness: 2.6,
      color: lineColor,
    });
  }

  points.forEach((point) => {
    page.drawCircle({
      x: point.x,
      y: point.y,
      size: 3.6,
      color: lineColor,
      borderColor: COLORS.white,
      borderWidth: 1.2,
    });
  });

  const firstDate = formatShortDate(values[0].date);
  const lastDate = formatShortDate(values[values.length - 1].date);

  page.drawText(firstDate, {
    x: chartLeft,
    y: y - height + 13,
    size: 7,
    font: regular,
    color: COLORS.muted,
  });

  const lastWidth = regular.widthOfTextAtSize(lastDate, 7);

  page.drawText(lastDate, {
    x: chartRight - lastWidth,
    y: y - height + 13,
    size: 7,
    font: regular,
    color: COLORS.muted,
  });

  const latest = values[values.length - 1];
  const latestText = `${latest.value.toFixed(
    unit === "kg" ? 2 : 1
  )} ${unit}`;
  const latestWidth = bold.widthOfTextAtSize(latestText, 8);

  page.drawText(latestText, {
    x: Math.min(
      chartRight - latestWidth,
      points[points.length - 1].x + 6
    ),
    y: Math.min(
      chartTop - 2,
      points[points.length - 1].y + 7
    ),
    size: 8,
    font: bold,
    color: lineColor,
  });
}

function drawMeasurementTableHeader(
  page: PDFPage,
  y: number,
  bold: PDFFont
) {
  drawRoundedRect(
    page,
    MARGIN,
    y - 24,
    CONTENT_WIDTH,
    28,
    8,
    COLORS.aquaSoft
  );

  page.drawText("Datum", {
    x: MARGIN + 12,
    y: y - 14,
    size: 8,
    font: bold,
    color: COLORS.ink,
  });

  page.drawText("Vikt", {
    x: MARGIN + 225,
    y: y - 14,
    size: 8,
    font: bold,
    color: COLORS.ink,
  });

  page.drawText("Längd", {
    x: MARGIN + 365,
    y: y - 14,
    size: 8,
    font: bold,
    color: COLORS.ink,
  });
}

function addGrowthPages(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  let { page, y } = newContentPage(
    pdf,
    "Tillväxt",
    regular,
    bold
  );

  if (data.growth.length === 0) {
    page.drawText("0 mätningar", {
      x: MARGIN,
      y,
      size: 13,
      font: bold,
      color: COLORS.muted,
    });
    return;
  }

  const latest = data.growth.at(-1)!;
  const first = data.growth[0];

  const weightDelta =
    latest.weightKg !== null && first.weightKg !== null
      ? latest.weightKg - first.weightKg
      : null;

  const heightDelta =
    latest.heightCm !== null && first.heightCm !== null
      ? latest.heightCm - first.heightCm
      : null;

  const statGap = 10;
  const statWidth = (CONTENT_WIDTH - statGap * 3) / 4;

  drawStat(
    page,
    MARGIN,
    y,
    statWidth,
    "SENASTE VIKT",
    latest.weightKg !== null
      ? `${latest.weightKg.toFixed(2)} kg`
      : "–",
    regular,
    bold,
    COLORS.pinkSoft
  );

  drawStat(
    page,
    MARGIN + (statWidth + statGap),
    y,
    statWidth,
    "SENASTE LÄNGD",
    latest.heightCm !== null
      ? `${latest.heightCm.toFixed(1)} cm`
      : "–",
    regular,
    bold,
    COLORS.blueSoft
  );

  drawStat(
    page,
    MARGIN + (statWidth + statGap) * 2,
    y,
    statWidth,
    "VIKTFÖRÄNDRING",
    weightDelta !== null
      ? `${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(2)} kg`
      : "–",
    regular,
    bold,
    COLORS.yellowSoft
  );

  drawStat(
    page,
    MARGIN + (statWidth + statGap) * 3,
    y,
    statWidth,
    "LÄNGDFÖRÄNDRING",
    heightDelta !== null
      ? `${heightDelta >= 0 ? "+" : ""}${heightDelta.toFixed(1)} cm`
      : "–",
    regular,
    bold,
    COLORS.greenSoft
  );

  y -= 92;

  const weightValues = data.growth
    .filter((item) => item.weightKg !== null)
    .map((item) => ({
      date: item.measurementDate,
      value: item.weightKg!,
    }));

  const heightValues = data.growth
    .filter((item) => item.heightCm !== null)
    .map((item) => ({
      date: item.measurementDate,
      value: item.heightCm!,
    }));

  const chartGap = 12;
  const chartWidth = (CONTENT_WIDTH - chartGap) / 2;
  const chartHeight = 205;

  drawGrowthChart(
    page,
    weightValues,
    MARGIN,
    y,
    chartWidth,
    chartHeight,
    "Vikt (kg)",
    "kg",
    regular,
    bold,
    COLORS.pink,
    COLORS.roseSoft
  );

  drawGrowthChart(
    page,
    heightValues,
    MARGIN + chartWidth + chartGap,
    y,
    chartWidth,
    chartHeight,
    "Längd (cm)",
    "cm",
    regular,
    bold,
    COLORS.blue,
    COLORS.blueSoft
  );

  y -= chartHeight + 38;

  page.drawText("Mäthistorik", {
    x: MARGIN,
    y,
    size: 15,
    font: bold,
    color: COLORS.green,
  });

  y -= 22;
  drawMeasurementTableHeader(page, y, bold);
  y -= 38;

  for (const measurement of data.growth) {
    if (y < 72) {
      ({ page, y } = newContentPage(
        pdf,
        "Mäthistorik",
        regular,
        bold
      ));

      drawMeasurementTableHeader(page, y, bold);
      y -= 38;
    }

    drawRoundedRect(
      page,
      MARGIN,
      y - 25,
      CONTENT_WIDTH,
      30,
      7,
      COLORS.white
    );

    page.drawText(formatShortDate(measurement.measurementDate), {
      x: MARGIN + 12,
      y: y - 14,
      size: 9,
      font: regular,
      color: COLORS.ink,
    });

    page.drawText(
      measurement.weightKg !== null
        ? `${measurement.weightKg.toFixed(2)} kg`
        : "–",
      {
        x: MARGIN + 225,
        y: y - 14,
        size: 9,
        font: regular,
        color: COLORS.ink,
      }
    );

    page.drawText(
      measurement.heightCm !== null
        ? `${measurement.heightCm.toFixed(1)} cm`
        : "–",
      {
        x: MARGIN + 365,
        y: y - 14,
        size: 9,
        font: regular,
        color: COLORS.ink,
      }
    );

    y -= 35;
  }
}

function addTeethPage(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  let { page, y } = newContentPage(
    pdf,
    "Tänder",
    regular,
    bold
  );

  drawBunny(
    page,
    PAGE_WIDTH - 92,
    PAGE_HEIGHT - 123,
    0.62
  );

  drawStat(
    page,
    MARGIN,
    y,
    160,
    "REGISTRERADE TÄNDER",
    String(data.teeth.length),
    regular,
    bold,
    COLORS.yellowSoft
  );

  y -= 94;

  if (data.teeth.length === 0) {
    return;
  }

  for (const tooth of data.teeth) {
    if (y < 78) {
      ({ page, y } = newContentPage(
        pdf,
        "Tänder",
        regular,
        bold
      ));
    }

    drawRoundedRect(
      page,
      MARGIN,
      y - 42,
      CONTENT_WIDTH,
      48,
      10,
      COLORS.yellowSoft
    );

    page.drawText(cleanPdfText(tooth.toothName), {
      x: MARGIN + 14,
      y: y - 19,
      size: 11,
      font: bold,
      color: COLORS.ink,
    });

    page.drawText(formatShortDate(tooth.eruptionDate), {
      x: MARGIN + 345,
      y: y - 19,
      size: 9,
      font: regular,
      color: COLORS.muted,
    });

    y -= 58;
  }
}

function addVaccinationPages(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  let { page, y } = newContentPage(
    pdf,
    "Vaccinationer",
    regular,
    bold
  );

  const today = new Date().toISOString().slice(0, 10);
  const completed = data.vaccinations.filter(
    (item) => item.vaccinationDate <= today
  );
  const upcoming = data.vaccinations.filter(
    (item) => item.vaccinationDate > today
  );

  drawStat(
    page,
    MARGIN,
    y,
    150,
    "GENOMFÖRDA",
    String(completed.length),
    regular,
    bold,
    COLORS.greenSoft
  );

  drawStat(
    page,
    MARGIN + 165,
    y,
    150,
    "KOMMANDE",
    String(upcoming.length),
    regular,
    bold,
    COLORS.violetSoft
  );

  y -= 94;

  if (data.vaccinations.length === 0) {
    return;
  }

  for (const vaccination of data.vaccinations) {
    const notes = vaccination.notes?.trim();
    const rowHeight = notes ? 82 : 58;

    if (y - rowHeight < 58) {
      ({ page, y } = newContentPage(
        pdf,
        "Vaccinationer",
        regular,
        bold
      ));
    }

    drawRoundedRect(
      page,
      MARGIN,
      y - rowHeight + 8,
      CONTENT_WIDTH,
      rowHeight,
      12,
      vaccination.vaccinationDate <= today
        ? COLORS.greenSoft
        : COLORS.violetSoft
    );

    page.drawText(cleanPdfText(vaccination.vaccineName), {
      x: MARGIN + 14,
      y: y - 14,
      size: 11,
      font: bold,
      color: COLORS.ink,
    });

    page.drawText(formatShortDate(vaccination.vaccinationDate), {
      x: MARGIN + 345,
      y: y - 14,
      size: 9,
      font: regular,
      color: COLORS.muted,
    });

    if (vaccination.dose) {
      page.drawText(`Dos: ${cleanPdfText(vaccination.dose)}`, {
        x: MARGIN + 14,
        y: y - 34,
        size: 9,
        font: regular,
        color: COLORS.muted,
      });
    }

    if (notes) {
      drawWrappedText(
        page,
        notes,
        MARGIN + 14,
        y - 53,
        regular,
        8.5,
        CONTENT_WIDTH - 28,
        COLORS.muted,
        11
      );
    }

    y -= rowHeight + 12;
  }
}

function addTimelinePage(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  type TimelineItem = {
    date: string;
    title: string;
    description: string;
    color: RGB;
    fill: RGB;
  };

  const timeline: TimelineItem[] = [
    {
      date: data.child.birthday,
      title: "Född",
      description: data.child.displayName,
      color: COLORS.pink,
      fill: COLORS.pinkSoft,
    },
    ...data.growth.map((item) => ({
      date: item.measurementDate,
      title: "Mätning",
      description: [
        item.weightKg !== null
          ? `${item.weightKg.toFixed(2)} kg`
          : null,
        item.heightCm !== null
          ? `${item.heightCm.toFixed(1)} cm`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      color: COLORS.blue,
      fill: COLORS.blueSoft,
    })),
    ...data.teeth.map((item) => ({
      date: item.eruptionDate,
      title: "Tand",
      description: item.toothName,
      color: COLORS.yellow,
      fill: COLORS.yellowSoft,
    })),
    ...data.vaccinations.map((item) => ({
      date: item.vaccinationDate,
      title: "Vaccination",
      description: [item.vaccineName, item.dose]
        .filter(Boolean)
        .join(" · "),
      color: COLORS.green,
      fill: COLORS.greenSoft,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let { page, y } = newContentPage(
    pdf,
    "Historik",
    regular,
    bold
  );

  for (const item of timeline) {
    if (y < 82) {
      ({ page, y } = newContentPage(
        pdf,
        "Historik",
        regular,
        bold
      ));
    }

    drawRoundedRect(
      page,
      MARGIN,
      y - 48,
      CONTENT_WIDTH,
      54,
      11,
      item.fill
    );

    page.drawCircle({
      x: MARGIN + 18,
      y: y - 20,
      size: 5,
      color: item.color,
    });

    page.drawText(formatShortDate(item.date), {
      x: MARGIN + 35,
      y: y - 13,
      size: 8.5,
      font: bold,
      color: item.color,
    });

    page.drawText(cleanPdfText(item.title), {
      x: MARGIN + 165,
      y: y - 13,
      size: 9.5,
      font: bold,
      color: COLORS.ink,
    });

    if (item.description) {
      drawWrappedText(
        page,
        item.description,
        MARGIN + 165,
        y - 30,
        regular,
        8.5,
        CONTENT_WIDTH - 180,
        COLORS.muted,
        11
      );
    }

    y -= 64;
  }
}

function addWarningsPage(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  if (data.warnings.length === 0) {
    return;
  }

  let { page, y } = newContentPage(
    pdf,
    "Information",
    regular,
    bold
  );

  data.warnings.forEach((warning) => {
    if (y < 100) {
      ({ page, y } = newContentPage(
        pdf,
        "Information",
        regular,
        bold
      ));
    }

    drawRoundedRect(
      page,
      MARGIN,
      y - 66,
      CONTENT_WIDTH,
      74,
      12,
      COLORS.peachSoft
    );

    y =
      drawWrappedText(
        page,
        warning,
        MARGIN + 14,
        y - 18,
        regular,
        9.5,
        CONTENT_WIDTH - 28,
        COLORS.ink,
        13
      ) - 32;
  });
}

function addPageNumber(
  page: PDFPage,
  index: number,
  regular: PDFFont
) {
  const text = String(index);
  const width = regular.widthOfTextAtSize(text, 8);

  page.drawText(text, {
    x: PAGE_WIDTH - MARGIN - width,
    y: 24,
    size: 8,
    font: regular,
    color: COLORS.muted,
  });
}

async function buildPdf(data: ChildDocumentationData) {
  const pdf = await PDFDocument.create();

  pdf.setTitle(
    `${data.child.displayName} – Barnets dokumentation`
  );

  pdf.setAuthor("Family Dashboard");
  pdf.setSubject("Barnets dokumentation");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  addCover(pdf, data, regular, bold);
  addGrowthPages(pdf, data, regular, bold);
  addTeethPage(pdf, data, regular, bold);
  addVaccinationPages(pdf, data, regular, bold);
  addTimelinePage(pdf, data, regular, bold);
  addWarningsPage(pdf, data, regular, bold);

  pdf
    .getPages()
    .slice(1)
    .forEach((page, index) =>
      addPageNumber(page, index + 2, regular)
    );

  return pdf.save();
}

function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");

    if (!memberId) {
      return Response.json(
        {
          error: "memberId saknas.",
        },
        {
          status: 400,
        }
      );
    }

    const data = await getChildDocumentationData(memberId);
    const pdfBytes = await buildPdf(data);

    const date = new Date().toISOString().slice(0, 10);
    const filename = `${safeFilename(
      data.child.displayName
    )}-dokumentation-${date}.pdf`;

    const pdfBuffer = Buffer.from(pdfBytes);

    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Kunde inte skapa barnets PDF:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF-dokumentet kunde inte skapas.",
      },
      {
        status: 500,
      }
    );
  }
}
