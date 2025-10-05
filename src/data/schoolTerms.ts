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

export const schoolTerms2025_2026 = stewartFleming2024To2025;
