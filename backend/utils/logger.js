const LEVELS={error:0,warn:1,info:2,debug:3}, cur=LEVELS[process.env.LOG_LEVEL||'info']??2
module.exports = {
  error:(...a)=>LEVELS.error<=cur&&console.error('[ERROR]',...a),
  warn: (...a)=>LEVELS.warn <=cur&&console.warn ('[WARN] ',...a),
  info: (...a)=>LEVELS.info <=cur&&console.log  ('[INFO] ',...a),
  debug:(...a)=>LEVELS.debug<=cur&&console.log  ('[DEBUG]',...a),
}
