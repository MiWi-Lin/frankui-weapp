// components/horizontal-day-select/horizontal-day-select.js
import dateUtil from '../../utils/dateUtil';

/**
 * 注意：本组件Item宽度须固定，非固定宽度会出现添加/移除Item后位置异常，可通过自行修改Item宽度获取方式计算offset
 */
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
    locationCenter: { // 触发Add的距离
      type: Boolean,
      value: true
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
    today: null,
    selectedDate: null,
    scrollIntoId: '',
    isAnimation: true,
    scrollLeft: 1, // 设置1可以帮助获得itemWidth
    viewWidth: 0, // scroll-view屏幕宽度
    viewPadding: 0, // scroll-view 左右padding
    scrollData: {
      itemWidth: 0, // Item宽度
      timer: null,  // 延迟回调定时器
      isAdded: false // 回调是否已执行标记
    }
  },
  /**
   * 组件实例进入页面节点树时执行
   */
  attached() {
    this.onAttached();
  },
  ready() {
    this.setViewWidth();
  },
  /**
   * 组件的方法列表
   */
  methods: {
    setViewWidth() { // 获取相关ViewWidth
      const that = this;
      const queryA = wx.createSelectorQuery().in(this);
      queryA.select('#h-scroll-view').boundingClientRect(); // scroll - view
      queryA.exec(function (res) {
        that.setData({ viewWidth: res[0].width });
      });
      const queryB = wx.createSelectorQuery().in(this);
      queryB.select('#top-padding').boundingClientRect(); // padding
      queryB.exec(function (res) {
        that.setData({ viewPadding: res[0].width });
      });
    },
    onAttached() { // 初始化 & 重置状态 回调
      this.initData();
      this.setScrollIntoId(`ID${this.data.selectedDate.getTime()}`);
    },
    initData() { // 初始化基本数据
      const today = dateUtil.dateToZero(new Date());
      console.info(`Today is: ${today}`);
      const selectedDate = this.data.initDate ? dateUtil.dateToZero(this.data.initDate) : today;
      this.setData({ today, selectedDate });
      this.initDays();
    },
    initDays() { // 初始化列表
      this.ips = [];
      this.addDays(this.data.selectedDate, true);
      this.addDays(dateUtil.getNextDay(this.data.selectedDate), false);
    },
    /**
     * 添加包含date的item对象moreCount个，并判断maxCacheCount, minDate, maxDate
     * isEnd为date是否为最后一个，即true为添加date之前的，false为添加date之后的
     */
    addDays(date, isEnd) {
      const { moreCount, maxCacheCount, minDate, maxDate } = this.data;
      let { ips: list } = this.data;
      let addCount = 0, removeCount = 0;
      if (isEnd) { // 添加date及之前的item
        const minTime = minDate ? dateUtil.dateToZero(minDate).getTime() : 0;
        for (let x = 0; x < moreCount; x++) {
          const tempDate = dateUtil.getBeforeDay(date, x);
          if (tempDate.getTime() < minTime) { // 判断是否在最早时间之后
            break;
          }
          const item = this.createDayObj(tempDate);
          list.unshift(item); // 添加到list前
          addCount += 1;
        }
        const length = list.length;
        if (length > maxCacheCount) { // 移除超过最大缓存的多余item
          removeCount = length - maxCacheCount;
          list = list.slice(0, maxCacheCount);
        }
      } else { // 添加date及之后的item
        const maxTime = maxDate ? dateUtil.dateToZero(maxDate).getTime() : 0;
        for (let x = 0; x < moreCount; x++) {
          const tempDate = dateUtil.getNextDay(date, x);
          if (maxTime && tempDate.getTime() > maxTime) { // 判断是否在最晚时间之前
            break;
          }
          const item = this.createDayObj(tempDate);
          list.push(item);
          addCount += 1;
        }
        const length = list.length;
        if (length > maxCacheCount) { // 移除超过最大缓存的多余item
          removeCount = length - maxCacheCount;
          list = list.slice(removeCount);
        }
      }
      this.setData({ ips: list });
      console.info(`日期总个数：${list.length} 移除:${removeCount} 添加:${addCount}`);
      return { addCount, removeCount };
    },

    createDayObj(date) { // 返回一个item
      const time = date.getTime();
      const timeToday = this.data.today.getTime();
      const timeSelected = this.data.selectedDate.getTime();
      return {
        id: `ID${time}`,
        date,
        day: date.getDate(),
        month: date.getMonth() + 1,
        weekday: time === timeToday ? '今天' : dateUtil.getWeekday(date),
        isSelect: time === timeSelected
      };
    },

    setIsAnimation(isAnimation) {
      this.setData({ isAnimation });
    },

    setScrollIntoId(scrollIntoId) {
      this.setData({ scrollIntoId });
      this.runScrollIntoId();
    },

    setScrollLeft(scrollLeft) {
      this.setData({ scrollLeft });
    },

    handleToupper(e) { // 滑动到最左侧范围
      console.info('触顶');
      this.setIsAnimation(false);
      const { ips, scrollData: { itemWidth } } = this.data;
      const beforeDay = dateUtil.getBeforeDay(ips[0].date);
      const { addCount } = this.addDays(beforeDay, true); // 添加item
      const { scrollLeft } = e.detail;
      this.setScrollLeft(addCount * itemWidth + scrollLeft); // 添加item后滑动，保持添加前位置
    },

    handleTolower(e) { // 滑动到最右侧范围
      console.info('触底');
      this.setIsAnimation(false);
      const { ips, scrollData: { itemWidth } } = this.data;
      const currentLastDate = ips[ips.length - 1].date;
      const nextDay = dateUtil.getNextDay(currentLastDate);
      const { removeCount } = this.addDays(nextDay, false); // 添加item
      if (removeCount > 0) { // 移除item后滑动，保持添加前位置
        const { scrollLeft } = e.detail;
        this.setScrollLeft(scrollLeft - removeCount * itemWidth);
      }
    },

    handleScroll(e) { // 滑动监听
      const { scrollData, ips, viewWidth, viewPadding, threshold } = this.data;
      const { timer, itemWidth, isAdded } = scrollData;
      const { scrollLeft, scrollWidth, deltaX } = e.detail;
      console.info(`HandleScroll: ${scrollLeft}-${scrollWidth}-${deltaX}`);

      if (timer) { // 重置Timer
        clearTimeout(timer);
        scrollData.timer = null;
      }

      // 获取itemWidth
      if (itemWidth <= 0 && ips && ips.length > 0) {
        scrollData.itemWidth = (scrollWidth - viewPadding * 2) / ips.length;
      }

      const inMaxLeftArea = scrollLeft < threshold;
      const scrollMarginMaxRight = scrollWidth - scrollLeft - viewWidth;
      const inMaxRightArea = scrollMarginMaxRight < threshold;

      if (isAdded && (inMaxLeftArea || inMaxRightArea)) { // 已执行回调
        return;
      } else { // 可重新执行回调
        scrollData.isAdded = false;
      }

      if (inMaxLeftArea || (deltaX >= threshold && deltaX >= scrollLeft)) { // 最左 或 向左快滑
        if (deltaX >= scrollLeft) { // 处理快滑后，scrollLeft实际已为0，却未回调BUG，主动置为0
          e.detail.deltaX += scrollLeft;
          e.detail.scrollLeft = 0;
        }
        scrollData.timer = setTimeout(() => { // 延迟出发回调，达到防抖效果
          scrollData.isAdded = true;
          this.handleToupper(e);
        }, 100);
      } else if (inMaxRightArea || (deltaX <= -threshold && deltaX <= -scrollMarginMaxRight)) { // 最右 或 向右快滑
        if (deltaX <= -scrollMarginMaxRight) { // 处理快滑后，scrollLeft实际已为最大，却未回调BUG，主动置为最大值
          e.detail.deltaX -= scrollMarginMaxRight;
          e.detail.scrollLeft = scrollWidth - viewWidth;
        }
        scrollData.timer = setTimeout(() => { // 延迟出发回调，达到防抖效果
          scrollData.isAdded = true;
          this.handleTolower(e);
        }, 100);
      }
    },

    runScrollIntoId() {
      const { ips, locationCenter, viewWidth, viewPadding, scrollData: { itemWidth } } = this.data;
      var curIndex = ips.length - 1;
      for (var i = 0; i < ips.length; i++) {
        if (ips[i].isSelect) {
          curIndex = i;
        }
      }
      let scrollLeft = itemWidth * curIndex + viewPadding; // 选中后滚动到左侧
      if (locationCenter) { 
        scrollLeft -= ((viewWidth - itemWidth) / 2); // 选中后滚动到中间
      }
      this.setScrollLeft(scrollLeft);
    },

    onIpItemClick: function (event) { // Item点击
      const { ips } = this.data;
      this.setIsAnimation(true);
      var id = event.currentTarget.dataset.item.id;
      var curIndex = 0;
      for (var i = 0; i < ips.length; i++) {
        if (id == ips[i].id) {
          ips[i].isSelect = true;
          curIndex = i;
        } else {
          ips[i].isSelect = false;
        }
      }
      this.setData({
        selectedDate: ips[curIndex].date,
        // scrollIntoId: ips[curIndex].id,
        ips: ips,
      });
      this.setScrollIntoId(ips[curIndex].id);
      console.info(ips[curIndex].id);
      this.triggerEvent('ChangeDay', { date: ips[curIndex].date });
    }
  }
})
