import { describe, expect, it } from 'vitest';
import { parseLmsGradePaste } from '@/lib/tools/grade-parse';
import { periodPercent } from '@/lib/tools/grade-calc';
import { percentToLetter } from '@/lib/tools/grade-calc';

const SAMPLE = `Section listSwitch course. DropdownSwitch to another course.

XPDGrading Period
(20%)
No comment

For PointsCategory
No comment
Week 8 Assessment (Target)test-quiz
6
/ 16
Comment:
Week 1 Assessmenttest-quiz
Due10/20/21 11:59pm
17
/ 30
Comment:
Week 2 Target Roundtest-quiz
Due10/27/21 11:59pm
4
/ 16
Comment:
Week 3 Assessment (Sprint Round)test-quiz
Due11/03/21 11:59pm
12
/ 30
Comment:
Week 4 (Target Round)test-quiz
Due11/10/21 11:59pm
6
/ 16
Comment:
Week 5 Assessment (Sprint Round)test-quiz
Due11/18/21 11:59pm
6
/ 30
Comment:
Week 6 Assessment (Target)test-quiz
Due12/02/21 7:00pm
6
/ 16
Comment:
Week 7 Assessment (Target)test-quiz
Due12/09/21 11:59pm
—
Comment:

YQ1 20-21Grading Period
(20%)
—
No comment

Total Points:57 / 170`;

describe('parseLmsGradePaste', () => {
  it('parses XPD section assignments from sample paste', () => {
    const result = parseLmsGradePaste(SAMPLE, { courseName: 'XPD' });
    expect(result.assignments).toHaveLength(7);
    expect(result.assignments[0].title).toBe('Week 8 Assessment (Target)');
    expect(result.assignments[0].pointsEarned).toBe(6);
    expect(result.assignments[0].pointsPossible).toBe(16);
    expect(result.assignments[1].title).toBe('Week 1 Assessment');
    expect(result.assignments[1].pointsEarned).toBe(17);
    expect(result.assignments[1].due).toContain('10/20/21');
  });

  it('matches total points validation', () => {
    const result = parseLmsGradePaste(SAMPLE, { courseName: 'XPD' });
    expect(result.totalPoints).toEqual({ earned: 57, possible: 170 });
    const pct = periodPercent(result.assignments);
    expect(pct).toBeCloseTo(37.0, 1);
    expect(percentToLetter(pct)).toBe('F');
  });
});
