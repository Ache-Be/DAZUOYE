const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-d3gsbk3zy97882355' });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { orderId } = event;
  if (!orderId) return { success: false, message: '缺少orderId' };

  try {
    // 先查订单
    const { data: order } = await db.collection('orders').doc(orderId).get();
    if (!order) return { success: false, message: '订单不存在' };
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      return { success: false, message: '该状态不允许删除' };
    }

    // 删除订单
    await db.collection('orders').doc(orderId).remove();

    // 删除关联评价
    const { data: reviews } = await db.collection('reviews')
      .where({ orderId }).get();
    const tasks = reviews.map(r => db.collection('reviews').doc(r._id).remove());
    await Promise.all(tasks);

    return { success: true, message: '已删除' };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
