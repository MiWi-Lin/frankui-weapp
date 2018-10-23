Page({

  /**
   * 页面的初始数据
   */
  data: {
    content: "全部",
    maxDate: new Date().getTime(),
    initTime: new Date().getTime()
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  /**
    * item点击事件
    */
  onChangeDay(e) {
    this.setData({ content: e.detail.date.toLocaleString() });
  },

  changeInitDate(e) {
    console.info(`change before: ${this.data.initTime}`);
    this.setData({ initTime: this.data.initTime - 24 * 60 * 60 * 1000-1 });
    console.info(`change after: ${this.data.initTime}`);
  }
})