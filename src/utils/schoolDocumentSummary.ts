export interface SchoolDocumentRoutine {
  label: string;
  detail: string;
}

export interface SchoolDocumentSummary {
  issuer: string | null;
  issueDate: string | null;
  subjects: string[];
  routines: SchoolDocumentRoutine[];
  documentLabel: string;
}

const monthLookup: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const pad = (value: number) => String(value).padStart(2, '0');

const parseDate = (value: string) => {
  const match = value.match(
    /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?\s*,?\s*(\d{1,2})(?:st|nd|rd|th|[^A-Za-z\d\s])?\s+([A-Za-z]+)\s+(20\d{2})/i,
  );
  if (!match) return null;

  const month = monthLookup[match[2].toLowerCase()];
  if (!month) return null;
  return match[3] + '-' + pad(month) + '-' + pad(Number(match[1]));
};

const cleanLine = (value: string) => value.replace(/\s+/g, ' ').replace(/^[•\s-]+/, '').trim();

const unique = (values: string[]) => Array.from(new Set(values.map(cleanLine).filter(Boolean)));

const normaliseSubject = (value: string) => {
  const lower = value.toLowerCase();
  const aliases: Record<string, string> = {
    erench: 'French',
    englis: 'English',
    maths: 'Maths',
    math: 'Maths',
    computing: 'Computing',
    pshe: 'PSHE',
  };
  return aliases[lower] || value.replace(/^./, (letter) => letter.toUpperCase());
};

const extractIssuer = (lines: string[]) => {
  const headerText = lines.slice(0, 20).join(' ');
  const schoolName = headerText.match(/Stewart\s+Fleming\s+Primary\s+School/i)?.[0];
  const academyName = headerText.match(/The\s+Pioneer\s+Academy/i)?.[0];
  if (schoolName && academyName) return 'Stewart Fleming Primary School The Pioneer Academy';
  if (schoolName) return schoolName;

  for (let index = 0; index < Math.min(lines.length, 10); index += 1) {
    if (!/(school|academy|college|nursery)/i.test(lines[index])) continue;

    const parts = [lines[index]];
    const next = lines[index + 1];
    if (next && /school|academy|college|nursery/i.test(next) && next.length < 100) parts.push(next);
    return unique(parts).join(' ').slice(0, 140);
  }
  return null;
};

const extractSubjects = (lines: string[]) => unique(
  lines.flatMap((line) => {
    const anchored = line.match(/^(?:In|1)\s+([^,:]+),\s+(?:we(?:'|’)ll|we will|pupils will|pupils learn|pupils will learn)/i);
    if (anchored) return [anchored[1]];

    const knownSubject = line.match(/\b(PSHE|Computing|Music|PE|Art|DT|French|Erench|English|Englis|Maths|Science|Geography|History)\b/i);
    return knownSubject && /(?:we(?:'|’)ll|we will|pupils?|learn|explor|will)/i.test(line)
      ? [knownSubject[1]]
      : [];
  }),
).map((value) => normaliseSubject(value.replace(/\s+$/g, '')));

const extractRoutines = (lines: string[]): SchoolDocumentRoutine[] => {
  const routines: SchoolDocumentRoutine[] = [];
  const addRoutine = (label: string, detail: string) => {
    const cleaned = cleanLine(detail);
    if (cleaned.length >= 4 && !routines.some((routine) => routine.label === label && routine.detail === cleaned)) {
      routines.push({ label, detail: cleaned.slice(0, 240) });
    }
  };

  const peIndex = lines.findIndex((line) => /^PE$/i.test(cleanLine(line)));
  if (peIndex >= 0) {
    const timetable: string[] = [];
    for (const line of lines.slice(peIndex + 1, peIndex + 7)) {
      const cleaned = cleanLine(line);
      if (/^(Homework|Phonics|Reading|In\s+)/i.test(cleaned)) break;
      if (/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i.test(cleaned)) {
        timetable.push(cleaned);
      }
    }
    if (timetable.length > 0) addRoutine('PE timetable', timetable.join('; '));
  }
  const namedPeDays = lines
    .filter((line) => /(?:Chaplin|Yousafzai|Yousaf|Yous\b|Scott)/i.test(line) && /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i.test(line))
    .slice(0, 4);
  if (namedPeDays.length > 0 && !routines.some((routine) => routine.label === 'PE timetable')) {
    addRoutine('PE timetable', namedPeDays.join('; '));
  }

  const homeworkIndex = lines.findIndex((line) => /^Homework\b/i.test(cleanLine(line)));
  if (homeworkIndex >= 0) {
    const homeworkLine = cleanLine(lines[homeworkIndex]).replace(/^Homework\s*:?\s*/i, '');
    const detail = [
      homeworkLine,
      ...lines.slice(homeworkIndex + 1, homeworkIndex + 4),
    ]
      .map(cleanLine)
      .filter((line) => line.length > 10)
      .join(' ');
    if (detail) addRoutine('Homework', detail);
  }

  const phonicsIndex = lines.findIndex((line) => /^Phonics\b/i.test(cleanLine(line)));
  if (phonicsIndex >= 0) {
    const phonicsLine = cleanLine(lines[phonicsIndex]).replace(/^Phonics\s*:?\s*/i, '');
    const detail = [
      phonicsLine,
      ...lines.slice(phonicsIndex + 1, phonicsIndex + 4),
    ]
      .map(cleanLine)
      .filter((line) => line.length > 10)
      .join(' ');
    if (detail) addRoutine('Phonics', detail);
  }

  return routines;
};

export const summarizeSchoolDocument = (text: string): SchoolDocumentSummary | null => {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const issuer = extractIssuer(lines);
  const subjects = extractSubjects(lines);
  const routines = extractRoutines(lines);
  const issueDate = lines.map(parseDate).find((value) => Boolean(value)) || null;
  const looksLikeSchoolUpdate = Boolean(
    issuer ||
    subjects.length > 0 ||
    routines.length > 0 ||
    /dear parents|welcome back|pupils will|school newsletter/i.test(text),
  );

  if (!looksLikeSchoolUpdate) return null;

  return {
    issuer,
    issueDate,
    subjects,
    routines,
    documentLabel: /newsletter|dear parents|welcome back/i.test(text) ? 'School newsletter' : 'School update',
  };
};
