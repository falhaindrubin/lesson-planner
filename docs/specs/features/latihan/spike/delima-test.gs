// Latihan W7 spike: can Apps Script in a DELIMa account use Classroom + Forms?
// Throwaway test, not feature code. Setup:
//   1. In Classroom, create a test class (e.g. "TEST Latihan") with no students.
//   2. script.google.com > New project > paste this file.
//   3. Services (+) > add "Google Classroom API" (identifier: Classroom).
//   4. Run step1_listCourses, approve the permissions, read the log.
//   5. Put the test class's id in TEST_COURSE_ID, run step2_postDraft.
//   6. Run step3_readBack. Copy all three logs back to Claude.

const TEST_COURSE_ID = ''; // from step 1

function step1_listCourses() {
  const res = Classroom.Courses.list({ teacherId: 'me', courseStates: ['ACTIVE'] });
  (res.courses || []).forEach(c => Logger.log(`${c.id}  ${c.name}  ${c.section || ''}`));
  Logger.log(`OK step 1: ${(res.courses || []).length} courses`);
}

function step2_postDraft() {
  if (!TEST_COURSE_ID) throw new Error('Set TEST_COURSE_ID first.');

  // A one-question quiz, plus a grid question to test order-the-lines marking
  const form = FormApp.create('Latihan W7 test');
  form.setIsQuiz(true);
  const mc = form.addMultipleChoiceItem().setTitle('1011 (perduaan) = ? (perpuluhan)').setPoints(1);
  mc.setChoices([mc.createChoice('11', true), mc.createChoice('13', false), mc.createChoice('9', false)]);
  const grid = form.addGridItem().setTitle('Susun baris kod').setRows(['print(x)', 'x = 5']).setColumns(['1', '2']);
  try { grid.setPoints(1); Logger.log('OK: grid can be marked by script'); }
  catch (e) { Logger.log('NOTE: grid cannot be marked by script: ' + e.message); }
  Logger.log('Form: ' + form.getEditUrl());

  // Try the Form as a Classroom "form" material first, then as a plain link
  const base = { title: 'Latihan W7 test', workType: 'ASSIGNMENT', state: 'DRAFT', maxPoints: 1 };
  let work;
  try {
    work = Classroom.Courses.CourseWork.create(
      Object.assign({}, base, { materials: [{ form: { formUrl: form.getPublishedUrl() } }] }), TEST_COURSE_ID);
    Logger.log('OK step 2a: draft with FORM material, id ' + work.id);
  } catch (e) {
    Logger.log('step 2a failed (form material): ' + e.message);
    work = Classroom.Courses.CourseWork.create(
      Object.assign({}, base, { materials: [{ link: { url: form.getPublishedUrl() } }] }), TEST_COURSE_ID);
    Logger.log('OK step 2b: draft with LINK material, id ' + work.id);
  }
  PropertiesService.getScriptProperties().setProperties({ formId: form.getId(), workId: work.id });
}

function step3_readBack() {
  const p = PropertiesService.getScriptProperties().getProperties();
  const form = FormApp.openById(p.formId);
  Logger.log(`OK step 3a: form readable, ${form.getResponses().length} responses`);
  const subs = Classroom.Courses.CourseWork.StudentSubmissions.list(TEST_COURSE_ID, p.workId);
  Logger.log(`OK step 3b: submissions readable, ${(subs.studentSubmissions || []).length} found`);
}
