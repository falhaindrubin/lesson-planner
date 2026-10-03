// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./util'),
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./parse/rpt'),
  ...require('./parse/jadual'),
  ...require('./parse/kelas'),
  ...require('./parse/acara'),
  ...require('./calendar'),
  ...require('./timetable'),
  ...require('./scheduler'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
};
