// pages/admin/verify/verify.js
Page({
  data: {
    code: '',
    verifying: false,
    result: null,
    history: [],
  },

  onCodeInput(e) {
    this.setData({ code: e.detail.value, result: null });
  },

  async handleVerify() {
    const code = this.data.code.trim();
    if (!code) {
      wx.showToast({ title: '请输入取餐码', icon: 'none' });
      return;
    }

    this.setData({ verifying: true, result: null });

    try {
      const res = await wx.cloud.callFunction({
        name: 'verifyPickup',
        data: { pickupCode: code },
      });

      const result = res.result || { success: false, message: '请求失败' };
      this.setData({ result });

      // 记录到历史
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      const history = [{ code, success: result.success, message: result.message, time }, ...this.data.history].slice(0, 20);
      this.setData({ history, code: '', verifying: false });
    } catch (err) {
      this.setData({
        result: { success: false, message: '网络错误' },
        verifying: false,
      });
    }
  },
});
