const cloudbase = require('@cloudbase/node-sdk');
const mysql = require('mysql2/promise');

const app = cloudbase.init({
    env: process.env.TCB_ENV
});

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    // 添加连接超时和重连配置
    connectTimeout: 10000, // 10秒连接超时
    acquireTimeout: 10000, // 10秒获取连接超时
    timeout: 60000, // 60秒查询超时
    enableKeepAlive: true, // 保持连接
    keepAliveInitialDelay: 10000 // 10秒后开始保持连接
});

exports.main = async (event, context) => {
    const { action, data, barcode, keyword, id, openid: eventOpenid, shopId: eventShopId, role: eventRole } = event;
    const { userInfo } = context;

    // 优先使用显式传入的 openid，否则从 context 获取
    let openid = (eventOpenid || (userInfo && userInfo.uid) || (data && data.openid) || '').trim();
    
    console.log('=== mysql-api 诊断 ===');
    console.log('完整 event:', JSON.stringify(event));
    console.log('传入 openid:', openid);
    console.log('传入 shopId:', eventShopId);
    console.log('传入 role:', eventRole);

    let shopId;
    let userRole;

    // 如果前端传入了 shopId 和 role，直接使用（避免多用户共享 openid 问题）
    if (eventShopId && eventRole) {
        shopId = eventShopId;
        userRole = eventRole;
        console.log('使用前端传入的 shopId:', shopId, 'role:', userRole);
    } else {
        // 否则通过 openid 查询数据库
        if (!openid) {
            return { code: 401, message: '未传入 openid' };
        }

        const [userRows] = await pool.execute(
            'SELECT shop_id, role, openid FROM users WHERE openid = ?',
            [openid]
        );
        
        console.log('查询结果 userRows 数量:', userRows.length);
        if (userRows.length > 0) {
            console.log('找到用户:', { shop_id: userRows[0].shop_id, role: userRows[0].role });
        }

        if (userRows.length === 0) {
            return { code: 401, message: '用户不存在，请先注册' };
        }

        shopId = userRows[0].shop_id;
        userRole = userRows[0].role;
    }

    try {
        switch (action) {
            case 'queryByBarcode':
                return await queryByBarcode(barcode, shopId);
            case 'add':
                return await add({ ...data, openid }, shopId);
            case 'search':
                return await search(keyword, shopId);
            case 'delete':
                if (userRole !== 'store_manager' && userRole !== 'manager') {
                    return { code: 403, message: '权限不足' };
                }
                return await del(id, shopId);
            case 'update':
                if (userRole !== 'store_manager' && userRole !== 'manager') {
                    return { code: 403, message: '权限不足' };
                }
                return await update({ ...data }, shopId);
            case 'alterAddImage':
                return await alterAddImage();
            case 'getAll':
                return await getAll(shopId);
            default:
                return { code: 400, message: '无效的操作' };
        }
    } catch (error) {
        console.error('云函数执行失败:', error);
        return { code: 500, message: '执行失败', error: error.message };
    }
};

async function getAll(shopId) {
    const [rows] = await pool.execute(
        'SELECT * FROM goods_model WHERE shop_id = ? ORDER BY createdAt DESC',
        [shopId]
    );
    return { code: 0, data: rows };
}

async function queryByBarcode(barcode, shopId) {
    const [rows] = await pool.execute(
        'SELECT * FROM goods_model WHERE barcode = ? AND shop_id = ?',
        [barcode, shopId]
    );
    return { code: 0, data: rows };
}

async function add(data, shopId) {
    await pool.execute(
        'INSERT INTO goods_model (name, purchase_price, selling_price, profit, barcode, remark, image_url, openid, shop_id, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [data.name, data.purchase_price, data.selling_price, data.profit, data.barcode, data.remark, data.image_url || '', data.openid, shopId]
    );
    return { code: 0, message: '添加成功' };
}

async function search(keyword, shopId) {
    const searchKeyword = '%' + keyword + '%';
    const [rows] = await pool.execute(
        'SELECT * FROM goods_model WHERE (name LIKE ? OR barcode LIKE ?) AND shop_id = ? ORDER BY createdAt DESC',
        [searchKeyword, searchKeyword, shopId]
    );
    return { code: 0, data: rows };
}

async function del(id, shopId) {
    const [result] = await pool.execute(
        'DELETE FROM goods_model WHERE id = ? AND shop_id = ?',
        [id, shopId]
    );
    if (result.affectedRows === 0) {
        return { code: 404, message: '商品不存在或无权限删除' };
    }
    return { code: 0, message: '删除成功' };
}

async function update(data, shopId) {
    const { id, name, purchase_price, selling_price, barcode, remark, image_url } = data;
    const profit = parseFloat(selling_price) - parseFloat(purchase_price);
    const [result] = await pool.execute(
        'UPDATE goods_model SET name = ?, purchase_price = ?, selling_price = ?, profit = ?, barcode = ?, remark = ?, image_url = ? WHERE id = ? AND shop_id = ?',
        [name, purchase_price, selling_price, profit, barcode, remark, image_url || '', id, shopId]
    );
    if (result.affectedRows === 0) {
        return { code: 404, message: '商品不存在或无权限修改' };
    }
    return { code: 0, message: '修改成功' };
}

async function alterAddImage() {
    try {
        await pool.execute(
            'ALTER TABLE goods_model ADD COLUMN image_url TEXT AFTER remark'
        );
        return { code: 0, message: 'image_url 字段添加成功' };
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            return { code: 0, message: 'image_url 字段已存在' };
        }
        return { code: 500, message: '添加字段失败', error: err.message };
    }
}