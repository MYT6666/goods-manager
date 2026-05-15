const cloudbase = require('@cloudbase/node-sdk');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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

const SALT_ROUNDS = 10;

// 生成随机邀请码（6位大写字母数字）
function generateInviteCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 为店长创建邀请码（每个角色一个，支持多人共用）
async function createInviteCodesForStoreManager(ownerOpenid, shopId) {
    const codes = [
        { code: generateInviteCode(), role: 'manager' },
        { code: generateInviteCode(), role: 'staff' }
    ];
    for (const item of codes) {
        await pool.execute(
            'INSERT INTO invite_codes (code, owner_openid, shop_id, role, max_uses, used_count, is_active) VALUES (?, ?, ?, ?, 999, 0, 1)',
            [item.code, ownerOpenid, shopId, item.role]
        );
    }
    return codes;
}

// 验证邀请码（支持多人共用，无限次使用）
async function validateInviteCode(code, expectedRole) {
    const [rows] = await pool.execute(
        'SELECT * FROM invite_codes WHERE code = ? AND is_active = 1 AND (expiresAt IS NULL OR expiresAt > NOW())',
        [code]
    );
    if (rows.length === 0) {
        return { valid: false, message: '邀请码不存在或已过期' };
    }
    const invite = rows[0];
    if (invite.role !== expectedRole) {
        return { valid: false, message: `该邀请码不是${expectedRole === 'manager' ? '经理' : '店员'}邀请码` };
    }
    // 支持多人共用，不检查使用次数上限
    
    // 直接使用邀请码中记录的 shop_id
    if (!invite.shop_id) {
        return { valid: false, message: '邀请码数据异常，请联系管理员' };
    }
    
    return { valid: true, shop_id: invite.shop_id };
}

// 标记邀请码已使用
async function markInviteCodeUsed(code) {
    await pool.execute(
        'UPDATE invite_codes SET used_count = used_count + 1 WHERE code = ?',
        [code]
    );
}

// 为店长创建商家记录
async function createShopForManager(openid, shopName = '我的店铺') {
    const [result] = await pool.execute(
        'INSERT INTO shops (shop_name, owner_openid) VALUES (?, ?)',
        [shopName, openid]
    );
    return result.insertId;
}

// 带重试的数据库操作包装函数
async function withRetry(operation, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.log(`数据库操作失败，第 ${i + 1} 次重试...`, error.message);
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    throw lastError;
}

// 获取店长的邀请码
async function getInviteCodes(data) {
    const { shopId } = data;

    if (!shopId) {
        return { code: 400, message: '缺少 shopId' };
    }

    // 查询该店铺的所有未使用邀请码（直接使用 shop_id 查询）
    const [rows] = await pool.execute(
        'SELECT code, role, max_uses, used_count, is_active FROM invite_codes WHERE shop_id = ? AND is_active = 1 ORDER BY role, code',
        [shopId]
    );

    // 按角色分组
    const managerCodes = rows.filter(r => r.role === 'manager').map(r => r.code);
    const staffCodes = rows.filter(r => r.role === 'staff').map(r => r.code);

    return {
        code: 0,
        data: {
            managerCodes,
            staffCodes
        }
    };
}

// 获取员工列表（经理和店员）
async function getStaffList(data) {
    const { shopId, operatorRole } = data;

    if (!shopId) {
        return { code: 400, message: '缺少 shopId' };
    }

    // 根据操作者角色决定查询范围
    let roleCondition;
    if (operatorRole === 'store_manager') {
        // 店长可以看到经理和店员
        roleCondition = "role IN ('manager', 'staff')";
    } else if (operatorRole === 'manager') {
        // 经理只能看到店员
        roleCondition = "role = 'staff'";
    } else {
        // 店员不能查看员工列表
        return { code: 403, message: '权限不足' };
    }

    // 查询该店铺的员工
    const [rows] = await pool.execute(
        `SELECT id, username, role FROM users WHERE shop_id = ? AND ${roleCondition} ORDER BY role, username`,
        [shopId]
    );

    // 按角色分组
    const managers = rows.filter(r => r.role === 'manager');
    const staffs = rows.filter(r => r.role === 'staff');

    return {
        code: 0,
        data: {
            managers,
            staffs
        }
    };
}

// 删除员工
async function deleteStaff(data) {
    const { staffId, shopId, operatorRole } = data;

    if (!staffId || !shopId || !operatorRole) {
        return { code: 400, message: '缺少必要参数' };
    }

    // 验证该员工是否属于该店铺
    const [staffRows] = await pool.execute(
        'SELECT id, role FROM users WHERE id = ? AND shop_id = ?',
        [staffId, shopId]
    );

    if (staffRows.length === 0) {
        return { code: 404, message: '员工不存在或不属于该店铺' };
    }

    const targetRole = staffRows[0].role;

    // 不能删除店长
    if (targetRole === 'store_manager') {
        return { code: 403, message: '不能删除店长' };
    }

    // 权限检查：
    // - 店长可以删除经理和店员
    // - 经理只能删除店员，不能删除经理
    if (operatorRole === 'manager' && targetRole === 'manager') {
        return { code: 403, message: '经理不能删除其他经理' };
    }

    // 店员不能删除任何人
    if (operatorRole === 'staff') {
        return { code: 403, message: '权限不足' };
    }

    // 删除员工
    await pool.execute('DELETE FROM users WHERE id = ?', [staffId]);

    // 减少对应邀请码的 used_count
    await pool.execute(
        'UPDATE invite_codes SET used_count = GREATEST(used_count - 1, 0) WHERE shop_id = ? AND role = ?',
        [shopId, targetRole]
    );

    return {
        code: 0,
        message: '删除成功'
    };
}

// 云函数入口
exports.main = async (event, context) => {
    const { action, data } = event;
    const { userInfo } = context;

    try {
        switch (action) {
            case 'register':
                return await withRetry(() => register(data, userInfo));
            case 'login':
                return await withRetry(() => login(data));
            case 'getCurrentUser':
                return await withRetry(() => getCurrentUser(userInfo));
            case 'getInviteCodes':
                return await withRetry(() => getInviteCodes(data));
            case 'getStaffList':
                return await withRetry(() => getStaffList(data));
            case 'deleteStaff':
                return await withRetry(() => deleteStaff(data));
            case 'updateShopName':
                return await withRetry(() => updateShopName(data));
            case 'getShopInfo':
                return await withRetry(() => getShopInfo(data));
            default:
                return { code: 400, message: '无效的操作' };
        }
    } catch (error) {
        console.error('云函数执行失败:', error);
        return { code: 500, message: '服务器内部错误', error: error.message };
    }
};

// 注册
async function register(data, userInfo) {
    const { username, password, role, inviteCode, shopName, openid: dataOpenid } = data;
    let currentOpenid = dataOpenid || userInfo?.uid;
    if (currentOpenid === undefined) currentOpenid = null;

    console.log('注册 openid:', currentOpenid);

    if (!username || !password || !role) {
        return { code: 400, message: '用户名、密码和角色不能为空' };
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
        return { code: 409, message: '用户名已存在' };
    }

    let shopId = null;
    let ownerOpenid = null;

    if (role === 'store_manager') {
        if (!currentOpenid) {
            return { code: 401, message: '登录态无效，请刷新后重试' };
        }
        shopId = await createShopForManager(currentOpenid, shopName || '我的店铺');
        await createInviteCodesForStoreManager(currentOpenid, shopId);
    } else {
        if (!inviteCode) {
            return { code: 400, message: '经理和店员注册需要邀请码' };
        }
        const validation = await validateInviteCode(inviteCode, role);
        if (!validation.valid) {
            return { code: 400, message: validation.message };
        }
        // 直接使用邀请码验证返回的 shop_id
        shopId = validation.shop_id;
        await markInviteCodeUsed(inviteCode);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
        'INSERT INTO users (username, password_hash, role, openid, shop_id) VALUES (?, ?, ?, ?, ?)',
        [username, passwordHash, role, currentOpenid, shopId]
    );

    return {
        code: 0,
        message: '注册成功',
        userId: result.insertId
    };
}

// 登录（返回 openid 和 shop_id）
async function login(data) {
    const { username, password } = data;

    if (!username || !password) {
        return { code: 400, message: '用户名和密码不能为空' };
    }

    const [rows] = await pool.execute(
        'SELECT id, username, password_hash, role, shop_id, openid FROM users WHERE username = ?',
        [username]
    );

    if (rows.length === 0) {
        return { code: 401, message: '用户名或密码错误' };
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        return { code: 401, message: '用户名或密码错误' };
    }

    console.log('登录返回 user:', { id: user.id, username: user.username, role: user.role, shop_id: user.shop_id, openid: user.openid });

    return {
        code: 0,
        message: '登录成功',
        user: {
            id: user.id,
            username: user.username,
            role: user.role,
            shop_id: user.shop_id,
            openid: user.openid
        }
    };
}

// 获取当前用户信息
async function getCurrentUser(userInfo) {
    if (!userInfo || !userInfo.uid) {
        return { code: 401, message: '未登录' };
    }

    const [rows] = await pool.execute(
        'SELECT id, username, role, shop_id, openid FROM users WHERE openid = ?',
        [userInfo.uid]
    );

    if (rows.length === 0) {
        return { code: 404, message: '用户不存在' };
    }

    return {
        code: 0,
        user: rows[0]
    };
}

// 获取店铺信息
async function getShopInfo(data) {
    const { shopId } = data;

    if (!shopId) {
        return { code: 400, message: '缺少 shopId' };
    }

    const [rows] = await pool.execute(
        'SELECT id, shop_name, owner_openid, createdAt FROM shops WHERE id = ?',
        [shopId]
    );

    if (rows.length === 0) {
        return { code: 404, message: '店铺不存在' };
    }

    return {
        code: 0,
        data: rows[0]
    };
}

// 修改店铺名称（仅店长可操作）
async function updateShopName(data) {
    const { shopId, shopName, operatorRole } = data;

    if (!shopId || !shopName) {
        return { code: 400, message: '缺少必要参数' };
    }

    // 只有店长可以修改店铺名称
    if (operatorRole !== 'store_manager') {
        return { code: 403, message: '只有店长可以修改店铺名称' };
    }

    // 检查店铺是否存在
    const [shopRows] = await pool.execute(
        'SELECT id FROM shops WHERE id = ?',
        [shopId]
    );

    if (shopRows.length === 0) {
        return { code: 404, message: '店铺不存在' };
    }

    // 更新店铺名称
    await pool.execute(
        'UPDATE shops SET shop_name = ? WHERE id = ?',
        [shopName, shopId]
    );

    return {
        code: 0,
        message: '店铺名称修改成功',
        data: { shopName }
    };
}