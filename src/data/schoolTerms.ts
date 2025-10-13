export type SchoolTermType = 'term' | 'half-term' | 'break' | 'inset';

export interface SchoolTerm {
  id: string;
  name: string;
  start: string;
  end?: string;
  startDate?: string;
  endDate?: string;
  student?: string;
  type: SchoolTermType;
  description?: string;
}

export const stewartFleming2024To2025: SchoolTerm[] = [
  {
    id: 'sf-autumn-start',
    name: 'Autumn Term Starts',
    start: '2024-09-02',
    startDate: '2024-09-02',
    endDate: '2024-09-02',
    student: 'all pupils',
    type: 'term',
    description: 'Pupils return to Stewart Fleming Primary School.'
  },
  {
    id: 'sf-autumn-half-term',
    name: 'Autumn Half Term Break',
    start: '2024-10-21',
    end: '2024-10-25',
    startDate: '2024-10-21',
    endDate: '2024-10-25',
    student: 'all pupils',
    type: 'half-term',
    description: 'School closed for half term.'
  },
  {
    id: 'sf-autumn-end',
    name: 'Autumn Term Ends',
    start: '2024-12-18',
    startDate: '2024-12-18',
    endDate: '2024-12-18',
    student: 'all pupils',
    type: 'term',
    description: 'Final day of the autumn term.'
  },
  {
    id: 'sf-christmas-break',
    name: 'Christmas Break',
    start: '2024-12-19',
    end: '2025-01-03',
    startDate: '2024-12-19',
    endDate: '2025-01-03',
    student: 'all pupils',
    type: 'break',
    description: 'Festive break for students and staff.'
  },
  {
    id: 'sf-spring-start',
    name: 'Spring Term Starts',
    start: '2025-01-06',
    startDate: '2025-01-06',
    endDate: '2025-01-06',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-spring-half-term',
    name: 'Spring Half Term Break',
    start: '2025-02-17',
    end: '2025-02-21',
    startDate: '2025-02-17',
    endDate: '2025-02-21',
    student: 'all pupils',
    type: 'half-term'
  },
  {
    id: 'sf-spring-end',
    name: 'Spring Term Ends',
    start: '2025-04-04',
    startDate: '2025-04-04',
    endDate: '2025-04-04',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-easter-break',
    name: 'Easter Break',
    start: '2025-04-07',
    end: '2025-04-21',
    startDate: '2025-04-07',
    endDate: '2025-04-21',
    student: 'all pupils',
    type: 'break'
  },
  {
    id: 'sf-summer-start',
    name: 'Summer Term Starts',
    start: '2025-04-22',
    startDate: '2025-04-22',
    endDate: '2025-04-22',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-summer-half-term',
    name: 'Summer Half Term Break',
    start: '2025-05-26',
    end: '2025-05-30',
    startDate: '2025-05-26',
    endDate: '2025-05-30',
    student: 'all pupils',
    type: 'half-term'
  },
  {
    id: 'sf-inset-june',
    name: 'Inset Day',
    start: '2025-06-27',
    startDate: '2025-06-27',
    endDate: '2025-06-27',
    student: 'all pupils',
    type: 'inset',
    description: 'Staff training day – pupils do not attend.'
  },
  {
    id: 'sf-summer-end',
    name: 'Summer Term Ends',
    start: '2025-07-18',
    startDate: '2025-07-18',
    endDate: '2025-07-18',
    student: 'all pupils',
    type: 'term'
  }
];

export const stewartFleming2025To2026: SchoolTerm[] = [
  {
    id: 'sf-2526-autumn-start',
    name: 'Autumn Term Starts',
    start: '2025-09-01',
    startDate: '2025-09-01',
    endDate: '2025-09-01',
    student: 'all pupils',
    type: 'term',
    description: 'Pupils return to Stewart Fleming Primary School.'
  },
  {
    id: 'sf-2526-autumn-half-term',
    name: 'Autumn Half Term Break',
    start: '2025-10-20',
    end: '2025-10-24',
    startDate: '2025-10-20',
    endDate: '2025-10-24',
    student: 'all pupils',
    type: 'half-term',
    description: 'School closed for half term.'
  },
  {
    id: 'sf-2526-autumn-end',
    name: 'Autumn Term Ends',
    start: '2025-12-17',
    startDate: '2025-12-17',
    endDate: '2025-12-17',
    student: 'all pupils',
    type: 'term',
    description: 'Final day of the autumn term.'
  },
  {
    id: 'sf-2526-christmas-break',
    name: 'Christmas Break',
    start: '2025-12-18',
    end: '2026-01-05',
    startDate: '2025-12-18',
    endDate: '2026-01-05',
    student: 'all pupils',
    type: 'break',
    description: 'Festive break for students and staff.'
  },
  {
    id: 'sf-2526-spring-start',
    name: 'Spring Term Starts',
    start: '2026-01-06',
    startDate: '2026-01-06',
    endDate: '2026-01-06',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-2526-spring-half-term',
    name: 'Spring Half Term Break',
    start: '2026-02-16',
    end: '2026-02-20',
    startDate: '2026-02-16',
    endDate: '2026-02-20',
    student: 'all pupils',
    type: 'half-term'
  },
  {
    id: 'sf-2526-spring-end',
    name: 'Spring Term Ends',
    start: '2026-04-03',
    startDate: '2026-04-03',
    endDate: '2026-04-03',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-2526-easter-break',
    name: 'Easter Break',
    start: '2026-04-06',
    end: '2026-04-17',
    startDate: '2026-04-06',
    endDate: '2026-04-17',
    student: 'all pupils',
    type: 'break'
  },
  {
    id: 'sf-2526-summer-start',
    name: 'Summer Term Starts',
    start: '2026-04-20',
    startDate: '2026-04-20',
    endDate: '2026-04-20',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-2526-summer-half-term',
    name: 'Summer Half Term Break',
    start: '2026-05-25',
    end: '2026-05-29',
    startDate: '2026-05-25',
    endDate: '2026-05-29',
    student: 'all pupils',
    type: 'half-term'
  },
  {
    id: 'sf-2526-inset-june',
    name: 'Inset Day',
    start: '2026-06-26',
    startDate: '2026-06-26',
    endDate: '2026-06-26',
    student: 'all pupils',
    type: 'inset',
    description: 'Staff training day – pupils do not attend.'
  },
  {
    id: 'sf-2526-summer-end',
    name: 'Summer Term Ends',
    start: '2026-07-17',
    startDate: '2026-07-17',
    endDate: '2026-07-17',
    student: 'all pupils',
    type: 'term'
  }
];

export const stewartFleming2026To2027: SchoolTerm[] = [
  {
    id: 'sf-2627-autumn-start',
    name: 'Autumn Term Starts',
    start: '2026-09-01',
    startDate: '2026-09-01',
    endDate: '2026-09-01',
    student: 'all pupils',
    type: 'term',
    description: 'Pupils return to Stewart Fleming Primary School.'
  },
  {
    id: 'sf-2627-autumn-half-term',
    name: 'Autumn Half Term Break',
    start: '2026-10-26',
    end: '2026-10-30',
    startDate: '2026-10-26',
    endDate: '2026-10-30',
    student: 'all pupils',
    type: 'half-term',
    description: 'School closed for half term.'
  },
  {
    id: 'sf-2627-autumn-end',
    name: 'Autumn Term Ends',
    start: '2026-12-18',
    startDate: '2026-12-18',
    endDate: '2026-12-18',
    student: 'all pupils',
    type: 'term',
    description: 'Final day of the autumn term.'
  },
  {
    id: 'sf-2627-christmas-break',
    name: 'Christmas Break',
    start: '2026-12-19',
    end: '2027-01-04',
    startDate: '2026-12-19',
    endDate: '2027-01-04',
    student: 'all pupils',
    type: 'break',
    description: 'Festive break for students and staff.'
  },
  {
    id: 'sf-2627-spring-start',
    name: 'Spring Term Starts',
    start: '2027-01-05',
    startDate: '2027-01-05',
    endDate: '2027-01-05',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-2627-spring-half-term',
    name: 'Spring Half Term Break',
    start: '2027-02-15',
    end: '2027-02-19',
    startDate: '2027-02-15',
    endDate: '2027-02-19',
    student: 'all pupils',
    type: 'half-term'
  },
  {
    id: 'sf-2627-spring-end',
    name: 'Spring Term Ends',
    start: '2027-03-26',
    startDate: '2027-03-26',
    endDate: '2027-03-26',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-2627-easter-break',
    name: 'Easter Break',
    start: '2027-03-29',
    end: '2027-04-09',
    startDate: '2027-03-29',
    endDate: '2027-04-09',
    student: 'all pupils',
    type: 'break'
  },
  {
    id: 'sf-2627-summer-start',
    name: 'Summer Term Starts',
    start: '2027-04-12',
    startDate: '2027-04-12',
    endDate: '2027-04-12',
    student: 'all pupils',
    type: 'term'
  },
  {
    id: 'sf-2627-summer-half-term',
    name: 'Summer Half Term Break',
    start: '2027-05-31',
    end: '2027-06-04',
    startDate: '2027-05-31',
    endDate: '2027-06-04',
    student: 'all pupils',
    type: 'half-term'
  },
  {
    id: 'sf-2627-inset-june',
    name: 'Inset Day',
    start: '2027-06-25',
    startDate: '2027-06-25',
    endDate: '2027-06-25',
    student: 'all pupils',
    type: 'inset',
    description: 'Staff training day – pupils do not attend.'
  },
  {
    id: 'sf-2627-summer-end',
    name: 'Summer Term Ends',
    start: '2027-07-23',
    startDate: '2027-07-23',
    endDate: '2027-07-23',
    student: 'all pupils',
    type: 'term'
  }
];

export const schoolTerms2025_2026 = stewartFleming2025To2026;
export const schoolTerms2026_2027 = stewartFleming2026To2027;
