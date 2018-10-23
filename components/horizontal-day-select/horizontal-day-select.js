// components/horizontal-day-select/horizontal-day-select.js
import dateUtil from '../../utils/dateUtil';

/**
 * 本组件为横向日期选择，可配置属性见属性列表描述
 * 
 * 注意：本组件使用抽象节点设置Item。
 * 使用方式设置组件属性，如：generic:itemComponent="componentname"
 * Item限制：
 * 1、Css width须固定值
 * 2、Css margin不支持，如有必要请view包裹一层
 * 3、非固定width/使用margin会导致宽度计算错误，可能出现添加/移除Item后滚动位置异常，如必要：可通过自行修改Item宽度获取方式计算offset
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
    locationCenter: { // 选中后是否滚动到中间
      type: Boolean,
      value: false
    },
    debug: { // 是否显示调试信息
      type: Boolean,
      value: false
    },
    minDate: Number, // 最小 时间戳，含毫秒
    maxDate: Number, // 最大 时间戳，含毫秒
    initDate: { // 选中 时间戳，含毫秒，默认当天
      type: Number,
      observer: function (newVal, oldVal, changedPath) { // 监听变化
        if (this.data.scrollData.itemWidth <= 0) { // 过滤初始化监听
          return;
        }
        this.onAttached();
        this.setScrollIntoId(`ID${dateUtil.dateToZero(newVal)}`);
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    ips: [], // 列表
    today: null,
    selectedDate: null,
    scrollIntoId: '',
    isAnimation: true,
    scrollLeft: 0, // 设置滚动距离
    isTouchScroll: true, // 是否触摸引发的滚动
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
    this.onReady();
  },
  /**
   * 组件的方法列表
   */
  methods: {
    onReady() { // 获取相关ViewWidth
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
        that.setScrollLeft(1); // 设置1可以帮助获得itemWidth
      });
    },
    onAttached() { // 初始化 & 重置状态 回调
      this.initData();
    },
    initData() { // 初始化基本数据
      const today = dateUtil.dateToZero(new Date());
      this.showInfo(`Today is: ${today}`);
      const selectedDate = this.data.initDate ? dateUtil.dateToZero(this.data.initDate) : today;
      this.setData({ today, selectedDate });
      this.initDays();
    },
    initDays() { // 初始化列表
      this.ips = [];

      // 前后都添加moreCount
      // this.addDays(this.data.selectedDate, true);
      // this.addDays(dateUtil.getNextDay(this.data.selectedDate), false);

      // 前后添加moreCount/2
      const initStartTime = this.data.selectedDate.getTime() - this.data.moreCount / 2 * 24 * 60 * 60 * 1000;
      this.addDays(dateUtil.dateToZero(initStartTime), false);
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
      this.showInfo(`日期总个数：${list.length} 移除:${removeCount} 添加:${addCount}`);
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

    setScrollIntoId(scrollIntoId) { // 设置滚动到指定ID
      this.showInfo(`setScrollIntoId ${scrollIntoId}`);
      this.setData({ scrollIntoId });
      this.runScrollIntoId();
    },

    setScrollLeft(scrollLeft) { // 手动设置滚动距离
      this.data.isTouchScroll = false;
      this.setData({ scrollLeft });
    },

    handleToupper(e) { // 滑动到最左侧范围
      this.showInfo('触顶');
      this.setIsAnimation(false);
      const { ips, scrollData: { itemWidth } } = this.data;
      const beforeDay = dateUtil.getBeforeDay(ips[0].date);
      const { addCount } = this.addDays(beforeDay, true); // 添加item
      const { scrollLeft } = e.detail;
      this.setScrollLeft(addCount * itemWidth + scrollLeft); // 添加item后滑动，保持添加前位置
    },

    handleTolower(e) { // 滑动到最右侧范围
      this.showInfo('触底');
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
      const { scrollData, ips, isTouchScroll, viewWidth, viewPadding, threshold } = this.data;
      const { timer, itemWidth, isAdded } = scrollData;
      const { scrollLeft, scrollWidth, deltaX } = e.detail;
      this.showInfo(`HandleScroll: ${scrollLeft}-${scrollWidth}-${deltaX}`);

      if (timer) { // 重置Timer
        clearTimeout(timer);
        scrollData.timer = null;
      }

      // 获取itemWidth
      if (itemWidth <= 0 && ips && ips.length > 0) {
        scrollData.itemWidth = (scrollWidth - viewPadding * 2) / ips.length;
        this.setScrollIntoId(`ID${this.data.selectedDate.getTime()}`);
      }

      if (!isTouchScroll) { // 非触摸引起的滚动无效
        this.data.isTouchScroll = true;
        return;
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

    runScrollIntoId() { // 滚动到指定ID
      const { ips, locationCenter, viewWidth, viewPadding, scrollData: { itemWidth } } = this.data;
      var curIndex = ips.length - 1;
      for (var i = 0; i < ips.length; i++) {
        if (ips[i].isSelect) {
          curIndex = i;
        }
      }
      let scrollLeft = itemWidth * curIndex; // 选中后滚动到左侧
      if (locationCenter) {
        scrollLeft -= ((viewWidth - itemWidth) / 2); // 选中后滚动到中间
      }
      this.setScrollLeft(scrollLeft);
    },

    onIpItemClick: function (event) { // Item点击
      const { ips, scrollIntoId } = this.data;
      this.setIsAnimation(true);
      var id = event.currentTarget.dataset.item.id;

      if (id === scrollIntoId) { // 重复点击
        return;
      }

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
        ips,
      });
      this.setScrollIntoId(ips[curIndex].id);
      this.triggerEvent('ChangeDay', { date: ips[curIndex].date });
    },

    showInfo(msg){
      if (this.data.debug) console.info(msg);
    }
  }
})
