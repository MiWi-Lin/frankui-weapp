const dateUtil = {
  weekday: [
    "日", "一", "二", "三", "四", "五", "六"
  ],
  getWeekday(date) {
    return this.weekday[date.getDay()];
  },
  dateToZero(date) { // 返回一个00:00:00:000的Date
    date = typeof date === 'number' ? new Date(date) : new Date(date.getTime());
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  },
  getNextDay(date, count = 1) { // 获取次n日date
    date = new Date(date.getTime());
    date.setDate(date.getDate() + count);
    return date;
  },
  getBeforeDay(date, count = 1) { // 获取前n日date
    date = new Date(date.getTime());
    date.setDate(date.getDate() - count);
    return date;
  },
}
export default dateUtil;