// pages/my-reviews/my-reviews.js
const app = getApp();

Page({
  data: {
    reviews: [],
    isLoading: true,
    isEmpty: false,
    isError: false,
  },

  onShow() {
    if (!app.globalData.userInfo) {
      this.setData({ isLoading: false, isEmpty: true, isError: true });
      return;
    }
    this.loadMyReviews();
  },

  onPullDownRefresh() {
    this.loadMyReviews().finally(() => wx.stopPullDownRefresh());
  },

  async loadMyReviews() {
    const openid = app.globalData.userInfo?.openid;
    if (!openid) {
      this.setData({ isLoading: false, isEmpty: true });
      return;
    }

    this.setData({ isLoading: true, isError: false });

    try {
      const db = wx.cloud.database();
      const { data: reviews } = await db.collection('reviews')
        .where({ userId: openid })
        .orderBy('createTime', 'desc')
        .get();

      const formatted = reviews.map(r => ({
        ...r,
        timeText: this.fmtTime(r.createTime),
        stars: Array.from({ length: 5 }, (_, i) => i < r.rating),
      }));

      this.setData({
        reviews: formatted,
        isLoading: false,
        isEmpty: formatted.length === 0,
      });
    } catch (err) {
      console.error('加载评价失败:', err);
      this.setData({ isLoading: false, isError: true });
    }
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: JSON.parse(urls || '[]') });
  },

  fmtTime(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date).slice(0, 16).replace('T', ' ');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
  },
});
