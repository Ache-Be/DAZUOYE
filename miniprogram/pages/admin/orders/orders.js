// pages/admin/orders/orders.js
Page({
  data: {
    currentTab: 'all',
    tabs: [
      { key: 'all', label: '全部' },
      { key: 'pending_pay', label: '待支付' },
      { key: 'paid', label: '已支付' },
      { key: 'completed', label: '已完成' },
      { key: 'cancelled', label: '已取消' },
    ],
    orders: [],
    page: 1,
    hasMore: true,
    isLoading: false,
    isEmpty: false,
  },

  onShow() {
    this.loadOrders(true);
  },

  onPullDownRefresh() {
    this.loadOrders(true);
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;
    this.setData({ currentTab: tab });
    this.loadOrders(true);
  },

  async loadOrders(reset) {
    if (reset) {
      this.setData({ isLoading: true, page: 1, orders: [] });
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOrders',
        data: { status: this.data.currentTab, page: this.data.page }
      });

      if (res.result && res.result.success) {
        const { list, hasMore } = res.result.data;
        const orders = reset ? list : [...this.data.orders, ...list];
        this.setData({
          orders,
          hasMore,
          isEmpty: orders.length === 0,
          isLoading: false,
        });
      } else {
        wx.showToast({ title: res.result.message || '加载失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    } catch (err) {
      console.error('加载订单失败:', err);
      wx.showToast({ title: '网络错误', icon: 'error' });
      this.setData({ isLoading: false });
    }
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.isLoading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadOrders(false);
  },
});
