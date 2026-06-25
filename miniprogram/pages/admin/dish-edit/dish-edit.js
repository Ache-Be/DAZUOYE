// pages/admin/dish-edit/dish-edit.js
Page({
  data: {
    dishId: '',
    form: {
      name: '',
      price: 0,
      originalPrice: 0,
      stock: 50,
      sort: 99,
      image: '',
      description: '',
      ingredients: '',
      categoryId: '',
      isRecommend: false,
    },
    uploading: false,
    categories: [],
    saving: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ dishId: options.id });
      this.loadDish(options.id);
    }
    this.loadCategories();
  },

  async loadDish(dishId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'dishes',
        data: { action: 'detail', dishId }
      });
      if (res.result && res.result.success) {
        const d = res.result.data;
        this.setData({
          form: {
            name: d.name || '',
            price: d.price || 0,
            originalPrice: d.originalPrice || d.price || 0,
            stock: d.stock || 0,
            sort: d.sort || 99,
            image: d.image || '',
            description: d.description || '',
            ingredients: d.ingredients || '',
            categoryId: d.categoryId || '',
            isRecommend: !!d.isRecommend,
          }
        });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1000);
      }
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1000);
    }
  },

  async loadCategories() {
    try {
      const res = await wx.cloud.callFunction({ name: 'getCategories' });
      if (res.result && res.result.success) {
        this.setData({ categories: res.result.data });
      }
    } catch (e) { /* 静默 */ }
  },

  onField(e) {
    const { field } = e.currentTarget.dataset;
    let value = e.detail.value;
    if (field === 'price' || field === 'originalPrice' || field === 'stock' || field === 'sort') {
      value = parseInt(value) || 0;
    }
    this.setData({ [`form.${field}`]: value });
  },

  async chooseImage() {
    if (this.data.uploading) return;
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album'] });
      this.setData({ uploading: true });
      const ext = res.tempFilePaths[0].split('.').pop() || 'jpg';
      const cloudPath = `dishes/${this.data.dishId}/${Date.now()}.${ext}`;
      const upRes = await wx.cloud.uploadFile({ cloudPath, filePath: res.tempFilePaths[0] });
      this.setData({ 'form.image': upRes.fileID, uploading: false });
    } catch (e) {
      this.setData({ uploading: false });
      if (e.errMsg && !e.errMsg.includes('cancel')) {
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    }
  },

  selectCategory(e) {
    const cid = e.currentTarget.dataset.cid;
    this.setData({ 'form.categoryId': cid });
  },

  toggleRecommend() {
    this.setData({ 'form.isRecommend': !this.data.form.isRecommend });
  },

  async handleSave() {
    const form = this.data.form;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' });
      return;
    }
    if (!form.price || form.price <= 0) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'dishes',
        data: {
          action: 'update',
          dishId: this.data.dishId,
          ...form,
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      } else {
        wx.showToast({ title: res.result.message || '保存失败', icon: 'none' });
        this.setData({ saving: false });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'error' });
      this.setData({ saving: false });
    }
  },
});
