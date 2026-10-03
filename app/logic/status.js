// Rekod status values (Malay, stored in the files) and their English labels in the app
const STATUS_OPTIONS = ['diajar', 'ditunda', 'batal'];
const LABELS = { diajar: 'Taught', ditunda: 'Postponed', batal: 'Cancelled' };

const statusLabel = s => LABELS[s] || '';
// Postponed and Cancelled need a reason typed by the teacher (W5)
const needsReason = s => s === 'ditunda' || s === 'batal';

export { STATUS_OPTIONS, statusLabel, needsReason };
