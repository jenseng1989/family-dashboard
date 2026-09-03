import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import {
  getChildDocumentationData,
  type ChildDocumentationData,
} from "@/lib/child-documentation";

export const dynamic = "force-dynamic";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  ink: rgb(0.10, 0.13, 0.18),
  muted: rgb(0.38, 0.43, 0.50),
  line: rgb(0.88, 0.90, 0.93),
  blue: rgb(0.20, 0.45, 0.78),
  blueSoft: rgb(0.93, 0.96, 1.00),
  green: rgb(0.16, 0.58, 0.42),
  greenSoft: rgb(0.92, 0.98, 0.95),
  amber: rgb(0.82, 0.53, 0.12),
  amberSoft: rgb(1.00, 0.97, 0.90),
  rose: rgb(0.78, 0.28, 0.40),
  white: rgb(1, 1, 1),
};

function parseLocalDate(value: string): Date {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatShortDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString(
    "sv-SE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function ageText(birthday: string): string {
  const birth = parseLocalDate(birthday);
  const now = new Date();

  let years =
    now.getFullYear() -
    birth.getFullYear();

  const birthdayThisYear =
    new Date(
      now.getFullYear(),
      birth.getMonth(),
      birth.getDate()
    );

  if (birthdayThisYear > now) {
    years -= 1;
  }

  const lastBirthday =
    new Date(
      birth.getFullYear() + years,
      birth.getMonth(),
      birth.getDate()
    );

  const days =
    Math.max(
      0,
      Math.floor(
        (now.getTime() -
          lastBirthday.getTime()) /
          86_400_000
      )
    );

  return `${years} år och ${days} dagar`;
}

function cleanPdfText(value: string): string {
  /*
   * Standardfonten Helvetica stödjer svenska tecken
   * men inte emoji. Ta därför bort emoji/symboler som
   * annars kan orsaka encoding-fel.
   */
  return value
    .replace(
      /[\p{Extended_Pictographic}\uFE0F]/gu,
      ""
    )
    .trim();
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words =
    cleanPdfText(text).split(/\s+/);

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      font.widthOfTextAtSize(
        candidate,
        fontSize
      ) <= maxWidth
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

  return lines.length > 0
    ? lines
    : [""];
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
  const lines =
    wrapText(
      text,
      font,
      fontSize,
      maxWidth
    );

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

function addPageNumber(
  page: PDFPage,
  index: number,
  regular: PDFFont
) {
  page.drawText(
    `Family Dashboard · Sida ${index}`,
    {
      x: MARGIN,
      y: 25,
      size: 8,
      font: regular,
      color: COLORS.muted,
    }
  );
}

function newContentPage(
  pdf: PDFDocument,
  title: string,
  regular: PDFFont,
  bold: PDFFont
) {
  const page =
    pdf.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  page.drawText(title, {
    x: MARGIN,
    y: PAGE_HEIGHT - 62,
    size: 22,
    font: bold,
    color: COLORS.ink,
  });

  page.drawLine({
    start: {
      x: MARGIN,
      y: PAGE_HEIGHT - 76,
    },
    end: {
      x: PAGE_WIDTH - MARGIN,
      y: PAGE_HEIGHT - 76,
    },
    thickness: 1,
    color: COLORS.line,
  });

  return {
    page,
    y: PAGE_HEIGHT - 105,
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
  fill = COLORS.blueSoft
) {
  page.drawRectangle({
    x,
    y: y - 60,
    width,
    height: 60,
    color: fill,
    borderColor: COLORS.line,
    borderWidth: 0.7,
  });

  page.drawText(label, {
    x: x + 12,
    y: y - 19,
    size: 8,
    font: bold,
    color: COLORS.muted,
  });

  page.drawText(
    cleanPdfText(value),
    {
      x: x + 12,
      y: y - 42,
      size: 15,
      font: bold,
      color: COLORS.ink,
    }
  );
}

function addCover(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  const page =
    pdf.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(
      0.965,
      0.975,
      0.99
    ),
  });

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 250,
    width: PAGE_WIDTH,
    height: 250,
    color: rgb(
      0.12,
      0.25,
      0.48
    ),
  });

  page.drawText(
    "BARNETS DOKUMENTATION",
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 78,
      size: 10,
      font: bold,
      color: rgb(
        0.75,
        0.85,
        1
      ),
    }
  );

  page.drawText(
    cleanPdfText(
      data.child.displayName
    ),
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 132,
      size: 34,
      font: bold,
      color: COLORS.white,
    }
  );

  page.drawText(
    "Tillväxt · tänder · vaccinationer · historik",
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 170,
      size: 13,
      font: regular,
      color: rgb(
        0.88,
        0.93,
        1
      ),
    }
  );

  page.drawText(
    `Född ${formatDate(data.child.birthday)}`,
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 215,
      size: 11,
      font: bold,
      color: COLORS.white,
    }
  );

  page.drawText(
    ageText(
      data.child.birthday
    ),
    {
      x: MARGIN + 190,
      y: PAGE_HEIGHT - 215,
      size: 11,
      font: regular,
      color: rgb(
        0.88,
        0.93,
        1
      ),
    }
  );

  const latest =
    data.growth.at(-1);

  drawStat(
    page,
    MARGIN,
    PAGE_HEIGHT - 315,
    150,
    "SENASTE VIKT",
    latest?.weightKg !== null &&
      latest?.weightKg !== undefined
      ? `${latest.weightKg.toFixed(2)} kg`
      : "Ingen data",
    regular,
    bold,
    COLORS.blueSoft
  );

  drawStat(
    page,
    MARGIN + 165,
    PAGE_HEIGHT - 315,
    150,
    "SENASTE LÄNGD",
    latest?.heightCm !== null &&
      latest?.heightCm !== undefined
      ? `${latest.heightCm.toFixed(1)} cm`
      : "Ingen data",
    regular,
    bold,
    COLORS.greenSoft
  );

  drawStat(
    page,
    MARGIN + 330,
    PAGE_HEIGHT - 315,
    150,
    "MÄTNINGAR",
    String(
      data.growth.length
    ),
    regular,
    bold,
    COLORS.amberSoft
  );

  page.drawText(
    "Sammanfattning",
    {
      x: MARGIN,
      y: PAGE_HEIGHT - 420,
      size: 18,
      font: bold,
      color: COLORS.ink,
    }
  );

  const summary =
    `Dokumentet innehåller ${data.growth.length} tillväxtmätningar, ` +
    `${data.teeth.length} registrerade tänder och ` +
    `${data.vaccinations.length} vaccinationer för ${data.child.displayName}.`;

  drawWrappedText(
    page,
    summary,
    MARGIN,
    PAGE_HEIGHT - 450,
    regular,
    11,
    CONTENT_WIDTH,
    COLORS.muted,
    16
  );

  page.drawText(
    `Genererad ${new Date(data.generatedAt).toLocaleString("sv-SE")}`,
    {
      x: MARGIN,
      y: 55,
      size: 9,
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
  lineColor = COLORS.blue
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: rgb(0.985, 0.99, 1),
    borderColor: COLORS.line,
    borderWidth: 0.8,
  });

  page.drawText(title, {
    x: x + 14,
    y: y - 22,
    size: 11,
    font: bold,
    color: COLORS.ink,
  });

  if (values.length < 2) {
    drawWrappedText(
      page,
      values.length === 1
        ? "Minst två mätningar behövs för att visa en kurva."
        : "Ingen data att visa.",
      x + 14,
      y - 48,
      regular,
      9,
      width - 28,
      COLORS.muted
    );

    return;
  }

  const chartLeft = x + 42;
  const chartRight = x + width - 14;
  const chartTop = y - 50;
  const chartBottom = y - height + 36;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartTop - chartBottom;

  const rawMin = Math.min(
    ...values.map((item) => item.value)
  );

  const rawMax = Math.max(
    ...values.map((item) => item.value)
  );

  const padding =
    Math.max(
      (rawMax - rawMin) * 0.15,
      unit === "kg" ? 0.25 : 1
    );

  const minValue =
    Math.max(0, rawMin - padding);

  const maxValue =
    rawMax + padding;

  const valueRange =
    Math.max(
      maxValue - minValue,
      1
    );

  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const lineY =
      chartBottom +
      ratio * chartHeight;

    page.drawLine({
      start: {
        x: chartLeft,
        y: lineY,
      },
      end: {
        x: chartRight,
        y: lineY,
      },
      thickness: 0.5,
      color: COLORS.line,
    });

    const labelValue =
      minValue +
      ratio * valueRange;

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

  const points =
    values.map(
      (item, index) => {
        const ratioX =
          values.length === 1
            ? 0.5
            : index /
              (values.length - 1);

        const ratioY =
          (item.value -
            minValue) /
          valueRange;

        return {
          x:
            chartLeft +
            ratioX *
              chartWidth,
          y:
            chartBottom +
            ratioY *
              chartHeight,
          item,
        };
      }
    );

  for (
    let index = 1;
    index <
    points.length;
    index += 1
  ) {
    page.drawLine({
      start: {
        x:
          points[index - 1]
            .x,
        y:
          points[index - 1]
            .y,
      },
      end: {
        x:
          points[index].x,
        y:
          points[index].y,
      },
      thickness: 2,
      color: lineColor,
    });
  }

  points.forEach((point) => {
    page.drawCircle({
      x: point.x,
      y: point.y,
      size: 3.2,
      color: lineColor,
      borderColor: COLORS.white,
      borderWidth: 1,
    });
  });

  const firstDate =
    formatShortDate(
      values[0].date
    );

  const lastDate =
    formatShortDate(
      values[
        values.length - 1
      ].date
    );

  page.drawText(firstDate, {
    x: chartLeft,
    y: y - height + 14,
    size: 7,
    font: regular,
    color: COLORS.muted,
  });

  const lastWidth =
    regular.widthOfTextAtSize(
      lastDate,
      7
    );

  page.drawText(lastDate, {
    x:
      chartRight -
      lastWidth,
    y: y - height + 14,
    size: 7,
    font: regular,
    color: COLORS.muted,
  });

  const latest =
    values[
      values.length - 1
    ];

  const latestText =
    `${latest.value.toFixed(
      unit === "kg"
        ? 2
        : 1
    )} ${unit}`;

  const latestWidth =
    bold.widthOfTextAtSize(
      latestText,
      8
    );

  page.drawText(latestText, {
    x:
      Math.min(
        chartRight -
          latestWidth,
        points[
          points.length - 1
        ].x + 6
      ),
    y:
      Math.min(
        chartTop - 2,
        points[
          points.length - 1
        ].y + 7
      ),
    size: 8,
    font: bold,
    color: lineColor,
  });
}

function addGrowthPages(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  let { page, y } =
    newContentPage(
      pdf,
      "Tillväxt",
      regular,
      bold
    );

  if (
    data.growth.length === 0
  ) {
    drawWrappedText(
      page,
      "Det finns inga registrerade tillväxtmätningar ännu.",
      MARGIN,
      y,
      regular,
      11,
      CONTENT_WIDTH,
      COLORS.muted
    );

    return;
  }

  const latest =
    data.growth.at(-1)!;

  const first =
    data.growth[0];

  const weightDelta =
    latest.weightKg !== null &&
    first.weightKg !== null
      ? latest.weightKg -
        first.weightKg
      : null;

  const heightDelta =
    latest.heightCm !== null &&
    first.heightCm !== null
      ? latest.heightCm -
        first.heightCm
      : null;

  drawStat(
    page,
    MARGIN,
    y,
    150,
    "SENASTE VIKT",
    latest.weightKg !== null
      ? `${latest.weightKg.toFixed(2)} kg`
      : "–",
    regular,
    bold,
    COLORS.blueSoft
  );

  drawStat(
    page,
    MARGIN + 165,
    y,
    150,
    "SENASTE LÄNGD",
    latest.heightCm !== null
      ? `${latest.heightCm.toFixed(1)} cm`
      : "–",
    regular,
    bold,
    COLORS.greenSoft
  );

  drawStat(
    page,
    MARGIN + 330,
    y,
    150,
    "SEDAN FÖRSTA",
    weightDelta !== null
      ? `${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(2)} kg`
      : "–",
    regular,
    bold,
    COLORS.amberSoft
  );

  y -= 90;

  if (heightDelta !== null) {
    page.drawText(
      `Total längdförändring: ${heightDelta >= 0 ? "+" : ""}${heightDelta.toFixed(1)} cm`,
      {
        x: MARGIN,
        y,
        size: 10,
        font: bold,
        color: COLORS.green,
      }
    );

    y -= 28;
  }

  const weightValues =
    data.growth
      .filter(
        (item) =>
          item.weightKg !== null
      )
      .map(
        (item) => ({
          date:
            item.measurementDate,
          value:
            item.weightKg!,
        })
      );

  const heightValues =
    data.growth
      .filter(
        (item) =>
          item.heightCm !== null
      )
      .map(
        (item) => ({
          date:
            item.measurementDate,
          value:
            item.heightCm!,
        })
      );

  const chartGap = 12;
  const chartWidth =
    (CONTENT_WIDTH -
      chartGap) /
    2;

  const chartHeight = 190;

  drawGrowthChart(
    page,
    weightValues,
    MARGIN,
    y,
    chartWidth,
    chartHeight,
    "Viktkurva",
    "kg",
    regular,
    bold,
    COLORS.blue
  );

  drawGrowthChart(
    page,
    heightValues,
    MARGIN +
      chartWidth +
      chartGap,
    y,
    chartWidth,
    chartHeight,
    "Längdkurva",
    "cm",
    regular,
    bold,
    COLORS.green
  );

  y -=
    chartHeight +
    32;

  if (y < 150) {
    ({ page, y } =
      newContentPage(
        pdf,
        "Tillväxt · mäthistorik",
        regular,
        bold
      ));
  }

  page.drawText(
    "Mäthistorik",
    {
      x: MARGIN,
      y,
      size: 14,
      font: bold,
      color: COLORS.ink,
    }
  );

  y -= 26;

  const columns = [
    { x: MARGIN, label: "Datum" },
    { x: MARGIN + 190, label: "Vikt" },
    { x: MARGIN + 315, label: "Längd" },
  ];

  for (const measurement of data.growth) {
    if (y < 75) {
      ({ page, y } =
        newContentPage(
          pdf,
          "Tillväxt · fortsättning",
          regular,
          bold
        ));
    }

    page.drawRectangle({
      x: MARGIN,
      y: y - 28,
      width: CONTENT_WIDTH,
      height: 34,
      color: rgb(
        0.98,
        0.985,
        0.995
      ),
    });

    columns.forEach((column) => {
      if (
        measurement ===
        data.growth[0]
      ) {
        page.drawText(
          column.label,
          {
            x: column.x,
            y: y + 13,
            size: 8,
            font: bold,
            color: COLORS.muted,
          }
        );
      }
    });

    page.drawText(
      formatShortDate(
        measurement.measurementDate
      ),
      {
        x: MARGIN,
        y: y - 12,
        size: 10,
        font: regular,
        color: COLORS.ink,
      }
    );

    page.drawText(
      measurement.weightKg !== null
        ? `${measurement.weightKg.toFixed(2)} kg`
        : "–",
      {
        x: MARGIN + 190,
        y: y - 12,
        size: 10,
        font: regular,
        color: COLORS.ink,
      }
    );

    page.drawText(
      measurement.heightCm !== null
        ? `${measurement.heightCm.toFixed(1)} cm`
        : "–",
      {
        x: MARGIN + 315,
        y: y - 12,
        size: 10,
        font: regular,
        color: COLORS.ink,
      }
    );

    y -= 40;
  }
}

function addTeethPage(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  let { page, y } =
    newContentPage(
      pdf,
      "Tänder",
      regular,
      bold
    );

  page.drawText(
    `${data.teeth.length} av 20 mjölktänder registrerade`,
    {
      x: MARGIN,
      y,
      size: 12,
      font: bold,
      color: COLORS.amber,
    }
  );

  y -= 32;

  if (
    data.teeth.length === 0
  ) {
    drawWrappedText(
      page,
      "Det finns inga tänder registrerade för barnet ännu.",
      MARGIN,
      y,
      regular,
      11,
      CONTENT_WIDTH,
      COLORS.muted
    );

    return;
  }

  for (const tooth of data.teeth) {
    if (y < 80) {
      ({ page, y } =
        newContentPage(
          pdf,
          "Tänder · fortsättning",
          regular,
          bold
        ));
    }

    page.drawText(
      cleanPdfText(
        tooth.toothName
      ),
      {
        x: MARGIN,
        y,
        size: 11,
        font: bold,
        color: COLORS.ink,
      }
    );

    page.drawText(
      formatShortDate(
        tooth.eruptionDate
      ),
      {
        x: MARGIN + 315,
        y,
        size: 10,
        font: regular,
        color: COLORS.muted,
      }
    );

    y -= 25;

    page.drawLine({
      start: {
        x: MARGIN,
        y,
      },
      end: {
        x: PAGE_WIDTH - MARGIN,
        y,
      },
      thickness: 0.6,
      color: COLORS.line,
    });

    y -= 20;
  }
}

function addVaccinationPages(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  let { page, y } =
    newContentPage(
      pdf,
      "Vaccinationer",
      regular,
      bold
    );

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  const completed =
    data.vaccinations.filter(
      (item) =>
        item.vaccinationDate <=
        today
    );

  const upcoming =
    data.vaccinations.filter(
      (item) =>
        item.vaccinationDate >
        today
    );

  drawStat(
    page,
    MARGIN,
    y,
    150,
    "GENOMFÖRDA",
    String(
      completed.length
    ),
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
    String(
      upcoming.length
    ),
    regular,
    bold,
    COLORS.amberSoft
  );

  y -= 90;

  if (
    data.vaccinations.length ===
    0
  ) {
    drawWrappedText(
      page,
      "Det finns inga vaccinationer registrerade för barnet ännu.",
      MARGIN,
      y,
      regular,
      11,
      CONTENT_WIDTH,
      COLORS.muted
    );

    return;
  }

  for (
    const vaccination of
    data.vaccinations
  ) {
    const notes =
      vaccination.notes?.trim();

    const rowHeight =
      notes
        ? 78
        : 55;

    if (
      y - rowHeight <
      55
    ) {
      ({ page, y } =
        newContentPage(
          pdf,
          "Vaccinationer · fortsättning",
          regular,
          bold
        ));
    }

    page.drawRectangle({
      x: MARGIN,
      y: y - rowHeight + 10,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color:
        vaccination.vaccinationDate <=
        today
          ? COLORS.greenSoft
          : COLORS.amberSoft,
    });

    page.drawText(
      cleanPdfText(
        vaccination.vaccineName
      ),
      {
        x: MARGIN + 12,
        y: y - 12,
        size: 11,
        font: bold,
        color: COLORS.ink,
      }
    );

    page.drawText(
      formatShortDate(
        vaccination.vaccinationDate
      ),
      {
        x: MARGIN + 335,
        y: y - 12,
        size: 9,
        font: regular,
        color: COLORS.muted,
      }
    );

    if (vaccination.dose) {
      page.drawText(
        `Dos: ${cleanPdfText(vaccination.dose)}`,
        {
          x: MARGIN + 12,
          y: y - 31,
          size: 9,
          font: regular,
          color: COLORS.muted,
        }
      );
    }

    if (notes) {
      drawWrappedText(
        page,
        notes,
        MARGIN + 12,
        y - 49,
        regular,
        8.5,
        CONTENT_WIDTH - 24,
        COLORS.muted,
        11
      );
    }

    y -=
      rowHeight + 12;
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
  };

  const timeline:
    TimelineItem[] = [
      {
        date:
          data.child.birthday,
        title:
          "Födelsedag",
        description:
          `${data.child.displayName} föddes.`,
      },
      ...data.growth.map(
        (item) => ({
          date:
            item.measurementDate,
          title:
            "Tillväxtmätning",
          description:
            [
              item.weightKg !==
              null
                ? `${item.weightKg.toFixed(2)} kg`
                : null,
              item.heightCm !==
              null
                ? `${item.heightCm.toFixed(1)} cm`
                : null,
            ]
              .filter(Boolean)
              .join(" · "),
        })
      ),
      ...data.teeth.map(
        (item) => ({
          date:
            item.eruptionDate,
          title:
            "Tand",
          description:
            item.toothName,
        })
      ),
      ...data.vaccinations.map(
        (item) => ({
          date:
            item.vaccinationDate,
          title:
            "Vaccination",
          description:
            [
              item.vaccineName,
              item.dose,
            ]
              .filter(Boolean)
              .join(" · "),
        })
      ),
    ].sort(
      (a, b) =>
        a.date.localeCompare(
          b.date
        )
    );

  let { page, y } =
    newContentPage(
      pdf,
      "Historik",
      regular,
      bold
    );

  for (const item of timeline) {
    if (y < 80) {
      ({ page, y } =
        newContentPage(
          pdf,
          "Historik · fortsättning",
          regular,
          bold
        ));
    }

    page.drawCircle({
      x: MARGIN + 6,
      y: y + 3,
      size: 4,
      color: COLORS.blue,
    });

    page.drawLine({
      start: {
        x: MARGIN + 6,
        y: y - 4,
      },
      end: {
        x: MARGIN + 6,
        y: y - 48,
      },
      thickness: 1,
      color: COLORS.line,
    });

    page.drawText(
      formatShortDate(
        item.date
      ),
      {
        x: MARGIN + 24,
        y: y + 1,
        size: 9,
        font: bold,
        color: COLORS.blue,
      }
    );

    page.drawText(
      cleanPdfText(
        item.title
      ),
      {
        x: MARGIN + 155,
        y: y + 1,
        size: 10,
        font: bold,
        color: COLORS.ink,
      }
    );

    drawWrappedText(
      page,
      item.description ||
        "Registrerad händelse",
      MARGIN + 155,
      y - 17,
      regular,
      9,
      CONTENT_WIDTH - 155,
      COLORS.muted,
      12
    );

    y -= 58;
  }
}

function addWarningsPage(
  pdf: PDFDocument,
  data: ChildDocumentationData,
  regular: PDFFont,
  bold: PDFFont
) {
  if (
    data.warnings.length ===
    0
  ) {
    return;
  }

  const { page } =
    newContentPage(
      pdf,
      "Information om exporten",
      regular,
      bold
    );

  let y =
    PAGE_HEIGHT - 110;

  data.warnings.forEach(
    (warning) => {
      page.drawRectangle({
        x: MARGIN,
        y: y - 60,
        width: CONTENT_WIDTH,
        height: 70,
        color: COLORS.amberSoft,
      });

      y =
        drawWrappedText(
          page,
          warning,
          MARGIN + 14,
          y - 18,
          regular,
          10,
          CONTENT_WIDTH - 28,
          COLORS.ink,
          14
        ) - 35;
    }
  );
}

async function buildPdf(
  data: ChildDocumentationData
) {
  const pdf =
    await PDFDocument.create();

  pdf.setTitle(
    `${data.child.displayName} – Barnets dokumentation`
  );

  pdf.setAuthor(
    "Family Dashboard"
  );

  pdf.setSubject(
    "Barnets dokumentation"
  );

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold
    );

  addCover(
    pdf,
    data,
    regular,
    bold
  );

  addGrowthPages(
    pdf,
    data,
    regular,
    bold
  );

  addTeethPage(
    pdf,
    data,
    regular,
    bold
  );

  addVaccinationPages(
    pdf,
    data,
    regular,
    bold
  );

  addTimelinePage(
    pdf,
    data,
    regular,
    bold
  );

  addWarningsPage(
    pdf,
    data,
    regular,
    bold
  );

  pdf
    .getPages()
    .slice(1)
    .forEach(
      (page, index) =>
        addPageNumber(
          page,
          index + 2,
          regular
        )
    );

  return pdf.save();
}

function safeFilename(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .toLowerCase();
}

export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(request.url);

    const memberId =
      url.searchParams.get(
        "memberId"
      );

    if (!memberId) {
      return Response.json(
        {
          error:
            "memberId saknas.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await getChildDocumentationData(
        memberId
      );

    const pdfBytes =
      await buildPdf(data);

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    const filename =
      `${safeFilename(
        data.child.displayName
      )}-dokumentation-${date}.pdf`;

    return new Response(
      pdfBytes,
      {
        headers: {
          "Content-Type":
            "application/pdf",
          "Content-Disposition":
            `attachment; filename="${filename}"`,
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Kunde inte skapa barnets PDF:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "PDF-dokumentet kunde inte skapas.",
      },
      {
        status: 500,
      }
    );
  }
}
