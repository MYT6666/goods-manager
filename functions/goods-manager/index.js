// cloudfunctions/goods-manager/index.js
const mysql = require('mysql2/promise');

// 数据库连接配置（实际部署时，这些值应在云函数环境变量中配置）
const dbConfig = {
  host: 'your-db-host', // 请替换为你的MySQL内网地址
  port: 3306,
  user: 'your-db-user', // 请替换为你的数据库用户名
  password: 'your-db-password', // 请替换为你的数据库密码
  database: 'scan-price-app-4gpjmpz7dcca4b8e'
};

exports.main = async (event, context) => {
  const { action, data } = event;
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    switch (action) {
      case 'getList': // 查询商品列表
        const [rows] = await connection.execute(
          'SELECT * FROM goods_model WHERE openid = ? ORDER BY createdAt DESC',
          [data.openid]
        );
        return { code: 0, data: rows };

      case 'add': // 新增商品
        const { name, purchase_price, selling_price, barcode, remark, openid } = data;
        const profit = selling_price - purchase_price;
        await connection.execute(
          'INSERT INTO goods_model (name, purchase_price, selling_price, profit, barcode, remark, openid, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [name, purchase_price, selling_price, profit, barcode, remark, openid, new Date()]
        );
        return { code: 0, message: '添加成功' };

      case 'delete': // 删除商品
        await connection.execute(
          'DELETE FROM goods_model WHERE id = ? AND openid = ?',
          [data.id, data.openid]
        );
        return { code: 0, message: '删除成功' };

      case 'queryByBarcode': // 根据条码查询
        const [goods] = await connection.execute(
          'SELECT * FROM goods_model WHERE barcode = ?',
          [data.barcode]
        );
        return { code: 0, data: goods };

      default:
        return { code: -1, message: '未知操作' };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return { code: -1, message: '服务器错误' };
  } finally {
    if (connection) await connection.end();
  }
};