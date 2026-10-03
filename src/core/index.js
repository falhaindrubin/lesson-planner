// Teras aplikasi: fungsi tulen sahaja (tiada I/O). Dikongsi oleh CLI dan aplikasi pelayar.
module.exports = {
  ...require('./parse/dskp'),
  ...require('./parse/kesukaran'),
  ...require('./parse/takwim'),
  ...require('./calendar'),
  ...require('./rpt-planner'),
  ...require('./render/rpt'),
};
