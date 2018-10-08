// components/horizontal-day-select/horizontal-day-select.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    moreCount: { // 滑动到顶或底后，每次添加的item个数
      type: Number,
      value: 30
    },
    maxCacheCount: { // 同时存在内存中的日期最大个数
      type: Number,
      value: 100
    },
    minDate: Number, // 最小 时间戳，含毫秒
    maxDate: Number, // 最大 时间戳，含毫秒
    initDate: { // 选中 时间戳，含毫秒，默认当天
      type: Number,
      observer: function (newVal, oldVal, changedPath) {
        this.onAttached();
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    ips: [],
    weekday: [
      "日", "一", "二", "三", "四", "五", "六"
    ],
    today: null,
    selectedDate: null,
    scrollIntoId: '',
    isAnimation: true,
    scrollLeft: -100
  },
  /**
   * 组件实例进入页面节点树时执行
   */
  attached() {
    this.onAttached();
  },
  /**
   * 组件的方法列表
   */
  methods: {
    initData() {
      const today = this.dateToZero(new Date());
      console.info(`Today is: ${today}`);
      const selectedDate = this.data.initDate ? this.dateToZero(this.data.initDate) : today;
      this.setData({ today, selectedDate });
    },
    initDays() {
      this.ips = [];
      this.addDays(this.data.selectedDate, true);
      this.addDays(this.getNextDay(this.data.selectedDate), false);
    },
    dateToZero(date) {
      date = typeof date === 'number' ? new Date(date) : new Date(date.getTime());
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date;
    },
    addDays(date, isEnd) {
      let list = this.data.ips;
      let count = this.data.moreCount;
      if (isEnd) {
        const minTime = this.data.minDate ? this.dateToZero(this.data.minDate).getTime() : 0;
        for (let x = 0; x < count; x++) {
          const tempDate = this.getBeforeDay(date, x);
          if (tempDate.getTime() < minTime) {
            break;
          }
          const item = this.createDayObj(tempDate);
          list.unshift(item);
        }
        if (list.length > this.data.maxCacheCount) {
          list = list.slice(0, this.data.maxCacheCount);
        }
      } else {
        const maxTime = this.data.maxDate ? this.dateToZero(this.data.maxDate).getTime() : 0;
        for (let x = 0; x < count; x++) {
          const tempDate = this.getNextDay(date, x);
          if (maxTime && tempDate.getTime() > maxTime) {
            break;
          }
          const item = this.createDayObj(tempDate);
          list.push(item);
        }
        if (list.length > this.data.maxCacheCount) {
          list = list.slice(list.length - this.data.maxCacheCount);
        }
      }
      this.setData({ ips: list });
      console.info(`日期总个数：${list.length}`);
    },

    createDayObj(date) {
      return {
        id: `ID${date.getTime()}`,
        date,
        day: date.getDate(),
        month: date.getMonth() + 1,
        weekday: date.getTime() === this.data.today.getTime() ? '今天' : this.data.weekday[date.getDay()],
        isSelect: date.getTime() === this.data.selectedDate.getTime()
      };
    },

    getNextDay(date, count = 1) {
      date = new Date(date.getTime());
      date.setDate(date.getDate() + count);
      return date;
    },

    getBeforeDay(date, count = 1) {
      date = new Date(date.getTime());
      date.setDate(date.getDate() - count);
      return date;
    },

    setIsAnimation(isAnimation) {
      this.setData({ isAnimation });
    },

    setScrollIntoId(scrollIntoId) {
      this.setData({ scrollIntoId });
    },

    handleToupper() {
      this.setIsAnimation(false);
      console.info('handleToupper');
      // const firstDayId = this.data.ips[0].id;
      this.addDays(this.getBeforeDay(this.data.ips[0].date), true);
      // this.setScrollIntoId(firstDayId);
    },

    handleTolower() {
      this.setIsAnimation(true);
      console.info('handleTolower');
      // const lastDayId = this.data.ips[this.data.ips.length - 1].id;
      const nextDay = this.getNextDay(this.data.ips[this.data.ips.length - 1].date);
      this.addDays(nextDay, false);
      // this.setScrollIntoId(lastDayId);
    },

    handleScroll(e) {
      const { scrollLeft, scrollWidth, deltaX } = e.detail;
      console.info(`HandleScroll: ${scrollLeft}-${scrollWidth}-${deltaX}`);
      // this.setData({ scrollLeft : 10});
    },
    onIpItemClick: function (event) {
      this.setIsAnimation(true);
      var id = event.currentTarget.dataset.item.id;
      var curIndex = 0;
      for (var i = 0; i < this.data.ips.length; i++) {
        if (id == this.data.ips[i].id) {
          this.data.ips[i].isSelect = true;
          curIndex = i;
        } else {
          this.data.ips[i].isSelect = false;
        }
      }
      this.setData({
        selectedDate: this.data.ips[curIndex].date,
        scrollIntoId: this.data.ips[curIndex].id,
        ips: this.data.ips,
      });
      console.info(this.data.ips[curIndex].id);
      this.triggerEvent('ChangeDay', { date: this.data.ips[curIndex].date });
    },
    onAttached() {
      this.initData();
      this.initDays();
      this.setScrollIntoId(`ID${this.data.selectedDate.getTime()}`);
    }
  }
})
