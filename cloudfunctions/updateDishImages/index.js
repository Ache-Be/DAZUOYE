/**
 * 批量更新菜品图片
 *
 * 使用步骤:
 *   1. 将 images 数组中的 fileID 替换为云存储上传后的真实 fileID
 *   2. 部署此云函数
 *   3. 在云开发控制台手动触发（无需参数），或调用 updateDishImages
 *
 * 获取fileID: 云开发控制台 -> 存储 -> 点击已上传图片 -> 复制文件ID
 * 格式示例: cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1332742911/dishes/宫保鸡丁.jpg
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: 'cloud1-d3gsbk3zy97882355' });
const db = cloud.database();

// ═══════════════════════════════════════
//  💡 上传图片后，替换下面的 fileID
// ═══════════════════════════════════════
const IMAGE_MAP = [
  { name: '宫保鸡丁',       fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/宫保鸡丁.jpg' },
  { name: '鱼香肉丝',       fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/鱼香肉丝.jpg' },
  { name: '青椒肉丝',       fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/青椒肉丝.jpg' },
  { name: '番茄炒蛋',       fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/番茄炒蛋.jpg' },
  { name: '红烧牛肉面',     fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/红烧牛肉面.jpg' },
  { name: '炸酱面',         fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/炸酱面.jpg' },
  { name: '红烧肉盖饭',     fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/红烧肉盖饭.jpg' },
  { name: '黄焖鸡盖饭',     fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/黄焖鸡盖饭.jpg' },
  { name: '咖喱鸡块盖饭',   fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/咖喱鸡块盖饭.jpg' },
  { name: '冰镇酸梅汤',     fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/冰镇酸梅汤.jpg' },
  { name: '绿豆汤',         fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/绿豆汤.jpg' },
  { name: '鲜肉包子(2个)',  fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/鲜肉包子.jpg' },
  { name: '豆浆油条套餐',   fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/豆浆油条套餐.jpg' },
  { name: '鸡蛋灌饼',       fileID: 'cloud://cloud1-d3gsbk3zy97882355.636c-cloud1-d3gsbk3zy97882355-1445696193/dishes/鸡蛋灌饼.jpg' },
];

exports.main = async (event) => {
  const results = { success: [], fail: [] };

  for (const item of IMAGE_MAP) {
    try {
      // 按名称查找菜品并更新 image 字段
      const { data } = await db.collection('dishes').where({ name: item.name }).get();

      if (data.length === 0) {
        results.fail.push({ name: item.name, reason: '菜品不存在' });
        continue;
      }

      await db.collection('dishes').doc(data[0]._id).update({
        data: { image: item.fileID, updateTime: db.serverDate() }
      });

      results.success.push({ name: item.name, fileID: item.fileID });
    } catch (err) {
      results.fail.push({ name: item.name, reason: err.message });
    }
  }

  return {
    success: true,
    message: `更新完成: ${results.success.length} 成功, ${results.fail.length} 失败`,
    results
  };
};
