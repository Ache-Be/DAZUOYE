// pages/admin/dishes/dishes.js
Page({
  data: {
    dishes: [],
    isLoading: true,
    isEmpty: false,
  },

  onShow() {
    this.loadDishes();
  },

  onPullDownRefresh() {
    this.loadDishes();
  },

  async loadDishes() {
    this.setData({ isLoading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'dishes',
        data: { action: 'adminList', pageSize: 50 }
      });

      if (res.result && res.result.success) {
        const dishes = res.result.data.list.map(d => ({
          ...d,
          priceText: (d.price / 100).toFixed(0),
        }));
        this.setData({
          dishes,
          isEmpty: dishes.length === 0,
          isLoading: false,
        });
      } else {
        wx.showToast({ title: res.result.message || '加载失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error('加载菜品失败:', err);
      wx.showToast({ title: '网络错误', icon: 'error' });
      this.setData({ isLoading: false });
    }
    wx.stopPullDownRefresh();
  },

  async toggleSale(e) {
    const { dishid: dishId, onsale: wasOnSale } = e.currentTarget.dataset;
    const newStatus = !wasOnSale;

    wx.showLoading({ title: newStatus ? '上架中...' : '下架中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'dishes',
        data: { action: 'update', dishId, isOnSale: newStatus }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        wx.showToast({ title: newStatus ? '已上架' : '已下架', icon: 'success' });
        // 更新本地状态
        const dishes = this.data.dishes.map(d =>
          d._id === dishId ? { ...d, isOnSale: newStatus } : d
        );
        this.setData({ dishes });
      } else {
        wx.showToast({ title: res.result.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },
});
