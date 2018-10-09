// components/horizontal-day-select/horizontal-day-select.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    moreCount: { // 滑动到顶或底后，每次添加的item个数, 为了计算itemWidth应大于屏幕显示个数
      type: Number,
      value: 30
    },
    maxCacheCount: { // 同时存在内存中的日期最大个数
      type: Number,
      value: 100
    },
    threshold: { // 触发Add的距离
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
    scrollLeft: 1, // 设置1可以帮助获得itemWidth
    viewWidth: 0, // scroll-view屏幕宽度
    viewPadding: 0, // scroll-view 左右padding
    scrollData: {
      left: 0,
      width: 0,
      itemWidth: 0,
      timer: null,
      isAdded: false
    }
  },
  /**
   * 组件实例进入页面节点树时执行
   */
  attached() {
    this.onAttached();
  },
  ready() {
    const that = this;
    const queryA = wx.createSelectorQuery().in(this);
    queryA.select('#h-scroll-view').boundingClientRect();
    queryA.exec(function (res) {
      that.setData({ viewWidth: res[0].width });
    });
    const queryB = wx.createSelectorQuery().in(this);
    queryB.select('#top-padding').boundingClientRect();
    queryB.exec(function (res) {
      that.setData({ viewPadding: res[0].width });
    });
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
      let addCount = 0;
      let removeCount = 0;
      if (isEnd) {
        const minTime = this.data.minDate ? this.dateToZero(this.data.minDate).getTime() : 0;
        for (let x = 0; x < count; x++) {
          const tempDate = this.getBeforeDay(date, x);
          if (tempDate.getTime() < minTime) {
            break;
          }
          const item = this.createDayObj(tempDate);
          list.unshift(item);
          addCount += 1;
        }
        if (list.length > this.data.maxCacheCount) {
          removeCount = list.length - this.data.maxCacheCount;
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
          addCount += 1;
        }
        if (list.length > this.data.maxCacheCount) {
          removeCount = list.length - this.data.maxCacheCount;
          list = list.slice(list.length - this.data.maxCacheCount);
        }
      }
      this.setData({ ips: list });
      console.info(`日期总个数：${list.length} -${removeCount} +${addCount}`);
      return { addCount, removeCount };
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

    setScrollLeft(scrollLeft) {
      this.setData({ scrollLeft });
    },
    handleToupper(e) {
      const { scrollLeft } = e.detail;
      this.setIsAnimation(false);
      console.info('handleToupper');
      const { addCount, removeCount } = this.addDays(this.getBeforeDay(this.data.ips[0].date), true);
      // this.setScrollLeft(addCount * this.data.scrollData.itemWidth + scrollLeft - this.data.viewPadding);
      this.setScrollLeft(addCount * this.data.scrollData.itemWidth + scrollLeft);
    },

    handleTolower(e) {
      const { scrollLeft, scrollWidth, deltaX } = e.detail;
      this.setIsAnimation(false);
      console.info('handleTolower');
      const originalCount = this.data.ips.length;
      const nextDay = this.getNextDay(this.data.ips[this.data.ips.length - 1].date);
      const { addCount, removeCount } = this.addDays(nextDay, false);
      if (removeCount > 0) {
        this.setScrollLeft(scrollLeft - removeCount * this.data.scrollData.itemWidth);
      }
    },

    handleScroll(e) {
      if (this.data.scrollData.timer) {
        clearTimeout(this.data.scrollData.timer);
        this.data.scrollData.timer = null;
      }

      const { scrollLeft, scrollWidth, deltaX } = e.detail;
      console.info(`HandleScroll: ${scrollLeft}-${scrollWidth}-${deltaX}`);
      this.data.scrollData.left = scrollLeft;
      this.data.scrollData.width = scrollWidth;
      if (this.data.scrollData.itemWidth <= 0 && this.data.ips && this.data.ips.length > 0) {
        this.data.scrollData.itemWidth = (scrollWidth - this.data.viewPadding * 2) / this.data.ips.length;
      }

      if (this.data.scrollData.isAdded && (scrollLeft < this.data.threshold || scrollWidth - scrollLeft - this.data.viewWidth < this.data.threshold)) {
        return
      } else {
        this.data.scrollData.isAdded = false;
      }

      if (scrollLeft < this.data.threshold) {
        if (deltaX >= scrollLeft){
          e.detail.deltaX += e.detail.scrollLeft;
          e.detail.scrollLeft = 0;
        }
        this.data.scrollData.timer = setTimeout(() => {
          this.data.scrollData.isAdded = true;
          this.handleToupper(e);
        }, 100);
      } else if (scrollWidth - scrollLeft - this.data.viewWidth < this.data.threshold) {
        if (deltaX <= -(scrollWidth - scrollLeft - this.data.viewWidth)) {
          e.detail.deltaX -= scrollWidth - scrollLeft - this.data.viewWidth;
          e.detail.scrollLeft = scrollWidth - this.data.viewWidth;
        }
        this.data.scrollData.timer = setTimeout(() => {
          this.data.scrollData.isAdded = true;
          this.handleTolower(e);
        }, 100);
      } else if (scrollLeft >= this.data.threshold && deltaX >= this.data.threshold && deltaX >= scrollLeft) {
        e.detail.deltaX += e.detail.scrollLeft;
        e.detail.scrollLeft = 0;
        this.data.scrollData.timer = setTimeout(() => {
          this.data.scrollData.isAdded = true;
          this.handleToupper(e);
        }, 100);
      } else if (scrollWidth - scrollLeft - this.data.viewWidth >= this.data.threshold && deltaX <= -this.data.threshold && deltaX <= -(scrollWidth - scrollLeft - this.data.viewWidth)) {
        e.detail.deltaX -= scrollWidth - scrollLeft - this.data.viewWidth;
        e.detail.scrollLeft = scrollWidth - this.data.viewWidth;
        this.data.scrollData.timer = setTimeout(() => {
          this.data.scrollData.isAdded = true;
          this.handleTolower(e);
        }, 100);
      }
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
