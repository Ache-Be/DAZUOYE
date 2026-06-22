const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-d3gsbk3zy97882355' });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  // 鉴权
  const { data: user } = await db.collection('users').where({
    openid, role: _.in(['admin', 'canteen_staff'])
  }).get();
  if (user.length === 0) return { success: false, message: '无权限' };

  const { status, page = 1, pageSize = 20 } = event;
  const skip = (page - 1) * pageSize;
  const where = {};
  if (status && status !== 'all') where.status = status;

  try {
    const [{ data: list }, { total }] = await Promise.all([
      db.collection('orders').where(where).orderBy('createTime', 'desc').skip(skip).limit(pageSize).get(),
      db.collection('orders').where(where).count()
    ]);

    return {
      success: true,
      data: {
        list: list.map(o => ({
          ...o,
          priceText: (o.finalPrice / 100).toFixed(2),
          timeText: o.createTime ? String(o.createTime).slice(0, 16).replace('T', ' ') : '',
        })),
        total,
        page,
        hasMore: skip + list.length < total,
      }
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
