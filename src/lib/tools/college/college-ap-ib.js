/** College Board AP courses (exams) */
export const AP_COURSES = [
  'AP African American Studies',
  'AP Art History',
  'AP Biology',
  'AP Calculus AB',
  'AP Calculus BC',
  'AP Chemistry',
  'AP Chinese Language and Culture',
  'AP Comparative Government and Politics',
  'AP Computer Science A',
  'AP Computer Science Principles',
  'AP English Language and Composition',
  'AP English Literature and Composition',
  'AP Environmental Science',
  'AP European History',
  'AP French Language and Culture',
  'AP German Language and Culture',
  'AP Human Geography',
  'AP Italian Language and Culture',
  'AP Japanese Language and Culture',
  'AP Latin',
  'AP Macroeconomics',
  'AP Microeconomics',
  'AP Music Theory',
  'AP Physics 1: Algebra-Based',
  'AP Physics 2: Algebra-Based',
  'AP Physics C: Electricity and Magnetism',
  'AP Physics C: Mechanics',
  'AP Precalculus',
  'AP Psychology',
  'AP Research',
  'AP Seminar',
  'AP Spanish Language and Culture',
  'AP Spanish Literature and Culture',
  'AP Statistics',
  'AP Studio Art: 2-D Design',
  'AP Studio Art: 3-D Design',
  'AP Studio Art: Drawing',
  'AP U.S. Government and Politics',
  'AP U.S. History',
  'AP World History: Modern',
];

export const AP_SCORES = ['1', '2', '3', '4', '5', 'pending'];

/** IB Diploma Programme subjects */
export const IB_COURSES = [
  'Biology (HL/SL)',
  'Business Management (HL/SL)',
  'Chemistry (HL/SL)',
  'Classical Languages (HL/SL)',
  'Computer Science (HL/SL)',
  'Design Technology (HL/SL)',
  'Economics (HL/SL)',
  'English A: Language and Literature (HL/SL)',
  'English A: Literature (HL/SL)',
  'Environmental Systems and Societies (SL)',
  'Film (HL/SL)',
  'French B (HL/SL)',
  'Geography (HL/SL)',
  'Global Politics (HL/SL)',
  'History (HL/SL)',
  'Information Technology in a Global Society (HL/SL)',
  'Mathematics: Analysis and Approaches (HL/SL)',
  'Mathematics: Applications and Interpretation (HL/SL)',
  'Music (HL/SL)',
  'Philosophy (HL/SL)',
  'Physics (HL/SL)',
  'Psychology (HL/SL)',
  'Spanish B (HL/SL)',
  'Sports, Exercise and Health Science (HL/SL)',
  'Theatre (HL/SL)',
  'Theory of Knowledge (Core)',
  'Visual Arts (HL/SL)',
  'World Religions (SL)',
];

export const IB_SCORES = ['1', '2', '3', '4', '5', '6', '7', 'pending'];

export const SCORE_LABELS = {
  pending: "Don't have score yet",
};

/** AP exams for Testing dropdown — full College Board catalog. */
export function getApExamOptions(_academics = {}, testing = {}) {
  const fromTesting = (testing.apExams || [])
    .map((entry) => entry.exam)
    .filter((exam) => exam && !AP_COURSES.includes(exam));
  return [...AP_COURSES, ...fromTesting];
}
