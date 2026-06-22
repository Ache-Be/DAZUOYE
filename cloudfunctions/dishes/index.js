/**
 * 菜品管理云函数
 * action: list | detail | add | update | delete
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-d3gsbk3zy97882355' });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { action } = event;

  switch (action) {
    case 'list': return listDishes(event);
    case 'detail': return getDetail(event);
    case 'adminList': return adminListDishes(event);
    case 'add': return addDish(event);
    case 'update': return updateDish(event);
    case 'delete': return deleteDish(event);
    default: return { success: false, message: '未知action: ' + action };
  }
};

// ---------- 菜品列表（分页+分类筛选+仅上架）----------
async function listDishes(event) {
  const { categoryId, page = 1, pageSize = 10, mealType, isRecommend } = event;
  const skip = (page - 1) * pageSize;

  const where = { isOnSale: true };
  if (isRecommend) where.isRecommend = true;
  if (categoryId) where.categoryId = categoryId;
  if (mealType) where.mealType = _.in([mealType, 'all']);

  try {
    const [{ data: list }, { total }] = await Promise.all([
      db.collection('dishes').where(where).orderBy('sort', 'asc').skip(skip).limit(pageSize).get(),
      db.collection('dishes').where(where).count()
    ]);

    // 批量转换 cloud:// 图片为临时链接
    const listWithImages = await convertImages(list);
    // 批量查询评价评分
    const enrichedList = await enrichWithRatings(listWithImages);

    return {
      success: true,
      data: {
        list: enrichedList,
        total,
        page,
        pageSize,
        hasMore: skip + list.length < total
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ---------- 菜品详情 ----------
async function getDetail(event) {
  const { dishId } = event;
  if (!dishId) return { success: false, message: '缺少dishId' };

  try {
    const { data } = await db.collection('dishes').doc(dishId).get();
    if (!data) return { success: false, message: '菜品不存在' };

    // 转换图片 + 计算真实评分
    const withImage = await convertImages([data]);
    const enriched = await enrichWithRatings(withImage);

    // 查询该菜品的所有评价
    const { data: reviews } = await db.collection('reviews')
      .where({ dishId })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    // 转换评价中的图片
    const reviewImages = [];
    reviews.forEach(r => {
      if (r.images && r.images.length > 0) {
        r.images.forEach(img => { if (img.startsWith('cloud://')) reviewImages.push(img); });
      }
    });
    const reviewUrlMap = {};
    if (reviewImages.length > 0) {
      try {
        const { fileList } = await cloud.getTempFileURL({ fileList: [...new Set(reviewImages)] });
        fileList.forEach(f => { if (f.tempFileURL) reviewUrlMap[f.fileID] = f.tempFileURL; });
      } catch (e) { /* 转换失败不影响 */ }
    }

    const reviewList = reviews.map(r => ({
      ...r,
      timeText: r.createTime ? String(r.createTime).slice(0, 16).replace('T', ' ') : '',
      images: (r.images || []).map(img => reviewUrlMap[img] || img)
    }));

    return { success: true, data: { ...enriched[0], reviews: reviewList } };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ---------- 添加菜品（管理员）----------
async function addDish(event) {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { success: false, message: '无权限' };

  const dish = {
    name: event.name, categoryId: event.categoryId,
    price: event.price, originalPrice: event.originalPrice || event.price,
    image: event.image || '', description: event.description || '',
    ingredients: event.ingredients || '', stock: event.stock || 50,
    mealType: event.mealType || 'all', isRecommend: !!event.isRecommend,
    isOnSale: true, salesVolume: 0, rating: 0, ratingCount: 0,
    sort: event.sort || 99,
    createTime: db.serverDate(), updateTime: db.serverDate()
  };

  try {
    const { _id } = await db.collection('dishes').add({ data: dish });
    return { success: true, data: { _id, ...dish } };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ---------- 更新菜品（管理员）----------
async function updateDish(event) {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { success: false, message: '无权限' };

  const { dishId, ...updates } = event;
  if (!dishId) return { success: false, message: '缺少dishId' };
  updates.updateTime = db.serverDate();

  try {
    await db.collection('dishes').doc(dishId).update({ data: updates });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ---------- 删除菜品（管理员，实际下架）----------
async function deleteDish(event) {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { success: false, message: '无权限' };

  const { dishId } = event;
  if (!dishId) return { success: false, message: '缺少dishId' };

  try {
    await db.collection('dishes').doc(dishId).update({
      data: { isOnSale: false, updateTime: db.serverDate() }
    });
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ---------- 管理员菜品列表（含下架菜品，需权限）----------
async function adminListDishes(event) {
  const openid = cloud.getWXContext().OPENID;
  if (!(await isAdmin(openid))) return { success: false, message: '无权限' };

  const { categoryId, page = 1, pageSize = 50 } = event;
  const skip = (page - 1) * pageSize;
  const where = {};
  if (categoryId) where.categoryId = categoryId;

  try {
    const [{ data: list }, { total }] = await Promise.all([
      db.collection('dishes').where(where).orderBy('sort', 'asc').skip(skip).limit(pageSize).get(),
      db.collection('dishes').where(where).count()
    ]);

    const listWithImages = await convertImages(list);
    const enrichedList = await enrichWithRatings(listWithImages);

    return {
      success: true,
      data: { list: enrichedList, total, page, pageSize, hasMore: skip + list.length < total }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

// ---------- 将 cloud:// 图片 fileID 转为临时链接 ----------
async function convertImages(dishList) {
  if (!dishList || dishList.length === 0) return dishList;

  // 收集所有 cloud:// 格式的图片
  const fileIDs = [];
  dishList.forEach(d => {
    if (d.image && d.image.startsWith('cloud://')) {
      fileIDs.push(d.image);
    }
  });

  if (fileIDs.length === 0) return dishList;

  try {
    const { fileList } = await cloud.getTempFileURL({ fileList: fileIDs });
    // 构建 fileID → tempFileURL 映射
    const urlMap = {};
    fileList.forEach(f => {
      if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL;
    });

    // 替换 image 字段
    return dishList.map(d => ({
      ...d,
      image: urlMap[d.image] || d.image
    }));
  } catch (err) {
    // 转换失败不影响菜品返回
    return dishList;
  }
}

// ---------- 从 reviews 集合批量获取菜品评分 ----------
async function enrichWithRatings(dishList) {
  if (!dishList || dishList.length === 0) return dishList;

  try {
    const dishIds = dishList.map(d => d._id);
    const { data: reviews } = await db.collection('reviews')
      .where({ dishId: _.in(dishIds) })
      .get();

    // 按 dishId 分组计算平均评分
    const ratingMap = {};
    const countMap = {};
    for (const r of reviews) {
      if (!ratingMap[r.dishId]) { ratingMap[r.dishId] = 0; countMap[r.dishId] = 0; }
      ratingMap[r.dishId] += r.rating;
      countMap[r.dishId] += 1;
    }

    return dishList.map(d => {
      const totalRating = ratingMap[d._id] || 0;
      const ratingCount = countMap[d._id] || 0;
      return {
        ...d,
        rating: ratingCount > 0 ? Math.round(totalRating / ratingCount * 10) / 10 : (d.rating || 0),
        ratingCount: ratingCount || (d.ratingCount || 0)
      };
    });
  } catch (err) {
    // 评分查询失败不影响菜品列表返回
    return dishList;
  }
}

// ---------- 检查管理员权限 ----------
async function isAdmin(openid) {
  const { data } = await db.collection('users').where({
    openid, role: db.command.in(['admin', 'canteen_staff'])
  }).get();
  return data.length > 0;
}
