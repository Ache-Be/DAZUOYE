const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-d3gsbk3zy97882355' });
const db = cloud.database();

exports.main = async (event) => {
  const { orderId } = event;
  if (!orderId) return { success: false, message: '缺少orderId' };

  try {
    const { data: order } = await db.collection('orders').doc(orderId).get();
    if (!order) return { success: false, message: '订单不存在' };
    if (order.status !== 'paid') {
      return { success: false, message: `当前状态为"${order.status}"，无法确认收货` };
    }

    await db.collection('orders').doc(orderId).update({
      data: {
        status: 'completed',
        updateTime: db.serverDate()
      }
    });

    return { success: true, message: '已确认收货', orderNo: order.orderNo };
  } catch (err) {
    return { success: false, message: err.message };
  }
};
