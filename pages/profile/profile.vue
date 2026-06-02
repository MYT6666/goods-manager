<template>
	<view class="content">
		<!-- 用户信息卡片 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="user-card">
			<view class="user-avatar">
				<text class="avatar-text">{{ (userInfo && userInfo.username && userInfo.username.charAt(0) && userInfo.username.charAt(0).toUpperCase()) || '?' }}</text>
			</view>
			<view class="user-info">
				<text class="username">{{ (userInfo && userInfo.username) || '未登录' }}</text>
				<text class="role-badge" :class="userInfo && userInfo.role">{{ roleText }}</text>
			</view>
		</view>

		<!-- 店铺信息卡片 -->
		<view class="shop-card" v-if="userInfo && userInfo.shop_id">
			<view class="card-header">
				<view class="card-title-row">
					<uni-icons type="shop" size="20" color="#667eea"></uni-icons>
					<text class="card-title">店铺信息</text>
				</view>
			</view>
			<view class="shop-info-list">
				<view class="info-item">
					<text class="info-label">店铺名称</text>
					<view class="info-value-row">
						<text class="info-value">{{ shopInfo.shop_name || '未设置' }}</text>
						<button v-if="userInfo && userInfo.role === 'store_manager'" class="edit-btn" @click="editShopName">修改</button>
					</view>
				</view>
				<view class="info-item">
					<text class="info-label">店铺ID</text>
					<text class="info-value id">{{ userInfo.shop_id }}</text>
				</view>
			</view>
		</view>

		<!-- 邀请码管理（仅店长） -->
		<view class="section-card" v-if="userInfo && userInfo.role === 'store_manager'">
			<view class="card-header">
				<view class="card-title-row">
					<uni-icons type="locked" size="20" color="#667eea"></uni-icons>
					<text class="card-title">邀请码管理</text>
				</view>
				<text class="card-subtitle">多人共用，无限使用</text>
			</view>
			<view class="codes-list">
				<view class="code-item">
					<view class="code-info">
						<text class="code-role">经理邀请码</text>
						<text class="code-value">{{ inviteCodes.managerCode || '---' }}</text>
					</view>
					<button class="copy-btn" @click="copyCode(inviteCodes.managerCode)">复制</button>
				</view>
				<view class="code-item">
					<view class="code-info">
						<text class="code-role">店员邀请码</text>
						<text class="code-value">{{ inviteCodes.staffCode || '---' }}</text>
					</view>
					<button class="copy-btn" @click="copyCode(inviteCodes.staffCode)">复制</button>
				</view>
			</view>
			<button class="refresh-btn" @click="loadInviteCodes">
				<uni-icons type="refresh" size="18" color="#667eea"></uni-icons>
				<text>刷新邀请码</text>
			</button>
		</view>

		<!-- 员工管理（店长和经理） -->
		<view class="section-card" v-if="userInfo && (userInfo.role === 'store_manager' || userInfo.role === 'manager')">
			<view class="card-header">
				<view class="card-title-row">
					<uni-icons type="staff" size="20" color="#667eea"></uni-icons>
					<text class="card-title">员工管理</text>
				</view>
			</view>

			<!-- 经理列表（仅店长可见） -->
			<view class="staff-section" v-if="userInfo && userInfo.role === 'store_manager'">
				<view class="section-title">
					<text class="title-text">经理</text>
					<text class="title-count">{{ managers.length }}人</text>
				</view>
				<view class="staff-list" v-if="managers.length > 0">
					<view v-for="manager in managers" :key="manager.id" class="staff-item">
						<view class="staff-avatar"><text class="staff-avatar-text">{{ manager.username.charAt(0).toUpperCase() }}</text></view>
						<text class="staff-name">{{ manager.username }}</text>
						<button class="delete-btn" @click="deleteStaff(manager.id, manager.username)">删除</button>
					</view>
				</view>
				<view class="empty-list" v-else>
					<text>暂无经理</text>
				</view>
			</view>

			<!-- 店员列表 -->
			<view class="staff-section">
				<view class="section-title">
					<text class="title-text">店员</text>
					<text class="title-count">{{ staffs.length }}人</text>
				</view>
				<view class="staff-list" v-if="staffs.length > 0">
					<view v-for="staff in staffs" :key="staff.id" class="staff-item">
						<view class="staff-avatar"><text class="staff-avatar-text">{{ staff.username.charAt(0).toUpperCase() }}</text></view>
						<text class="staff-name">{{ staff.username }}</text>
						<button class="delete-btn" @click="deleteStaff(staff.id, staff.username)">删除</button>
					</view>
				</view>
				<view class="empty-list" v-else>
					<text>暂无店员</text>
				</view>
			</view>

			<button class="refresh-btn" @click="loadStaffList">
				<uni-icons type="refresh" size="18" color="#667eea"></uni-icons>
				<text>刷新列表</text>
			</button>
		</view>

		<!-- 退出登录 -->
		<button class="logout-btn" @click="logout">
			<uni-icons type="undo" size="20" color="#ffffff"></uni-icons>
			<text>退出登录</text>
		</button>

		<!-- 注销账号 -->
		<button class="delete-account-btn" @click="deleteAccount">
			<uni-icons type="trash" size="20" color="#999"></uni-icons>
			<text>注销账号</text>
		</button>

		<!-- 自定义TabBar -->
		<tab-bar :currentIndex="4"></tab-bar>
	</view>
</template>

<script>
import TabBar from '@/components/tab-bar/tab-bar.vue';

export default {
	components: { TabBar },
	data() {
		return {
			statusBarHeight: 0,
			userInfo: null,
			managers: [],
			staffs: [],
			inviteCodes: {
				managerCode: '',
				staffCode: ''
			},
			shopInfo: {
				shop_name: ''
			}
		};
	},
	computed: {
		roleText() {
			const roleMap = {
				'store_manager': '店长',
				'manager': '经理',
				'staff': '店员'
			};
			return (this.userInfo && roleMap[this.userInfo.role]) || '未知';
		}
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
	},
	onShow() {
		uni.hideTabBar({ animation: false });
		this.userInfo = uni.getStorageSync('userInfo');
		if (this.userInfo && this.userInfo.shop_id) {
			this.loadShopInfo();
		}
		if (this.userInfo && (this.userInfo.role === 'store_manager' || this.userInfo.role === 'manager')) {
			this.loadStaffList();
		}
		if (this.userInfo && this.userInfo.role === 'store_manager') {
			this.loadInviteCodes();
		}
	},
	methods: {
		async loadShopInfo() {
			try {
				const app = getApp().globalData.cloudbase;
				const res = await app.callFunction({
					name: 'user-auth',
					data: {
						action: 'getShopInfo',
						data: { shopId: this.userInfo.shop_id }
					}
				});
				if (res.result.code === 0) {
					this.shopInfo = res.result.data;
				}
			} catch (err) {
				console.error('加载店铺信息失败:', err);
			}
		},
		editShopName() {
			uni.showModal({
				title: '修改店铺名称',
				content: this.shopInfo.shop_name || '',
				editable: true,
				placeholderText: '请输入店铺名称',
				success: (res) => {
					if (res.confirm && res.content) {
						this.updateShopName(res.content.trim());
					}
				}
			});
		},
		async updateShopName(newName) {
			try {
				uni.showLoading({ title: '保存中...' });
				const app = getApp().globalData.cloudbase;
				const res = await app.callFunction({
					name: 'user-auth',
					data: {
						action: 'updateShopName',
						data: {
							shopId: this.userInfo.shop_id,
							shopName: newName,
							operatorRole: this.userInfo.role
						}
					}
				});
				uni.hideLoading();
				if (res.result.code === 0) {
					this.shopInfo.shop_name = newName;
					uni.showToast({ title: '修改成功', icon: 'success' });
				} else {
					uni.showToast({ title: res.result.message || '修改失败', icon: 'none' });
				}
			} catch (err) {
				uni.hideLoading();
				uni.showToast({ title: '修改失败', icon: 'none' });
			}
		},
		async loadInviteCodes() {
			try {
				uni.showLoading({ title: '加载中...' });
				const app = getApp().globalData.cloudbase;
				const res = await app.callFunction({
					name: 'user-auth',
					data: {
						action: 'getInviteCodes',
						data: { shopId: this.userInfo.shop_id }
					}
				});
				uni.hideLoading();
				if (res.result.code === 0) {
					const data = res.result.data;
					this.inviteCodes = {
						managerCode: (data.managerCodes && data.managerCodes[0]) || '',
					staffCode: (data.staffCodes && data.staffCodes[0]) || ''
					};
				}
			} catch (err) {
				uni.hideLoading();
				console.error('加载邀请码失败:', err);
			}
		},
		copyCode(code) {
			if (!code) return;
			uni.setClipboardData({
				data: code,
				success: () => {
					uni.showToast({ title: '已复制', icon: 'success' });
				}
			});
		},
		async loadStaffList() {
			try {
				uni.showLoading({ title: '加载中...' });
				const app = getApp().globalData.cloudbase;
				const res = await app.callFunction({
					name: 'user-auth',
					data: {
						action: 'getStaffList',
						data: {
							shopId: this.userInfo.shop_id,
							operatorRole: this.userInfo.role
						}
					}
				});
				uni.hideLoading();
				if (res.result.code === 0) {
					this.managers = res.result.data.managers || [];
					this.staffs = res.result.data.staffs || [];
				}
			} catch (err) {
				uni.hideLoading();
				console.error('加载员工列表失败:', err);
			}
		},
		deleteStaff(staffId, staffName) {
			uni.showModal({
				title: '确认删除',
				content: `确定要删除员工 "${staffName}" 吗？`,
				confirmColor: '#ff6b6b',
				success: async (res) => {
					if (res.confirm) {
						try {
							uni.showLoading({ title: '删除中...' });
							const app = getApp().globalData.cloudbase;
							const result = await app.callFunction({
								name: 'user-auth',
								data: {
									action: 'deleteStaff',
									data: {
										staffId: staffId,
										shopId: this.userInfo.shop_id,
										operatorRole: this.userInfo.role
									}
								}
							});
							uni.hideLoading();
							if (result.result.code === 0) {
								uni.showToast({ title: '删除成功', icon: 'success' });
								this.loadStaffList();
							} else {
								uni.showToast({ title: result.result.message || '删除失败', icon: 'none' });
							}
						} catch (err) {
							uni.hideLoading();
							uni.showToast({ title: '删除失败', icon: 'none' });
						}
					}
				}
			});
		},
		logout() {
			uni.showModal({
				title: '确认退出',
				content: '确定要退出登录吗？',
				confirmColor: '#ff6b6b',
				success: (res) => {
					if (res.confirm) {
						uni.removeStorageSync('userInfo');
						uni.reLaunch({ url: '/pages/login/login' });
					}
				}
			});
		}
		deleteAccount() {
			uni.showModal({
				title: "注销账号",
				content: "注销后所有数据将被清除，此操作不可恢复。",
				confirmText: "确认注销",
				confirmColor: "#ff6b6b",
				success: async (res) => {
					if (res.confirm) {
						try {
							uni.showLoading({ title: "注销中..." });
							const app = getApp().globalData.cloudbase;
							await app.callFunction({
								name: "user-auth",
								data: { action: "deleteAccount" }
							});
							uni.removeStorageSync("userInfo");
							uni.hideLoading();
							uni.showToast({ title: "账号已注销", icon: "success" });
							setTimeout(() => uni.reLaunch({ url: "/pages/login/login" }), 1500);
						} catch (err) {
							uni.hideLoading();
							uni.showToast({ title: "注销失败，请重试", icon: "none" });
						}
					}
				}
			});
		},
	}
};
</script>

<style>
.content {
	min-height: 100vh;
	background: #f5f6fa;
	padding: 30rpx;
	padding-bottom: 160rpx;
}

/* 用户信息卡片 */
.user-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 24rpx;
	padding: 50rpx 40rpx;
	margin-bottom: 30rpx;
	display: flex;
	align-items: center;
	gap: 30rpx;
	box-shadow: 0 10rpx 40rpx rgba(102, 126, 234, 0.3);
}

.user-avatar {
	width: 120rpx;
	height: 120rpx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.avatar-text {
	font-size: 56rpx;
	font-weight: bold;
	color: #ffffff;
}

.user-info {
	flex: 1;
}

.username {
	display: block;
	font-size: 40rpx;
	font-weight: bold;
	color: #ffffff;
	margin-bottom: 15rpx;
}

.role-badge {
	display: inline-block;
	padding: 8rpx 24rpx;
	border-radius: 20rpx;
	font-size: 24rpx;
	font-weight: 500;
}

.role-badge.store_manager {
	background: rgba(255, 107, 107, 0.9);
	color: #fff;
}

.role-badge.manager {
	background: rgba(78, 205, 196, 0.9);
	color: #fff;
}

.role-badge.staff {
	background: rgba(69, 183, 209, 0.9);
	color: #fff;
}

/* 店铺信息卡片 */
.shop-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

.card-header {
	margin-bottom: 25rpx;
}

.card-title-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.card-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.card-subtitle {
	display: block;
	font-size: 24rpx;
	color: #999;
	margin-top: 8rpx;
}

.shop-info-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 2rpx solid #f0f1f5;
}

.info-item:last-child {
	border-bottom: none;
}

.info-label {
	font-size: 28rpx;
	color: #666;
}

.info-value-row {
	display: flex;
	align-items: center;
	gap: 15rpx;
}

.info-value {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.info-value.id {
	font-family: monospace;
	color: #667eea;
}

.edit-btn {
	padding: 10rpx 25rpx;
	margin: 0;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #ffffff;
	font-size: 24rpx;
	border-radius: 25rpx;
}

/* 功能卡片 */
.section-card {
	background: #ffffff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}

/* 邀请码列表 */
.codes-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	margin-bottom: 25rpx;
}

.code-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #f5f6fa;
	border-radius: 16rpx;
	padding: 25rpx;
}

.code-info {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.code-role {
	font-size: 24rpx;
	color: #666;
}

.code-value {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	font-family: monospace;
	letter-spacing: 2rpx;
}

.copy-btn {
	padding: 15rpx 30rpx;
	margin: 0;
	background: #e8eaf6;
	color: #667eea;
	font-size: 26rpx;
	border-radius: 30rpx;
	font-weight: 500;
}

/* 员工管理 */
.staff-section {
	margin-bottom: 30rpx;
}

.staff-section:last-of-type {
	margin-bottom: 0;
}

.section-title {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.title-text {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.title-count {
	font-size: 24rpx;
	color: #667eea;
	background: #e8eaf6;
	padding: 6rpx 16rpx;
	border-radius: 15rpx;
}

.staff-list {
	display: flex;
	flex-direction: column;
	gap: 15rpx;
}

.staff-item {
	display: flex;
	align-items: center;
	background: #f5f6fa;
	border-radius: 16rpx;
	padding: 20rpx 25rpx;
}

.staff-avatar {
	width: 60rpx;
	height: 60rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 20rpx;
}

.staff-avatar-text {
	font-size: 26rpx;
	font-weight: bold;
	color: #ffffff;
}

.staff-name {
	flex: 1;
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
}

.delete-btn {
	padding: 12rpx 25rpx;
	margin: 0;
	background: #ffebee;
	color: #f44336;
	font-size: 24rpx;
	border-radius: 25rpx;
}

.empty-list {
	text-align: center;
	padding: 40rpx;
	color: #999;
	font-size: 28rpx;
	background: #f5f6fa;
	border-radius: 16rpx;
}

/* 刷新按钮 */
.refresh-btn {
	width: 100%;
	height: 80rpx;
	line-height: 80rpx;
	background: #f0f1f5;
	color: #666;
	font-size: 28rpx;
	border-radius: 12rpx;
	margin-top: 25rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
}

/* 注销账号 */
.delete-account-btn {
	width: 100%;
	height: 90rpx;
	line-height: 90rpx;
	background: #f5f6fa;
	color: #999;
	font-size: 30rpx;
	border: 2rpx solid #e0e0e0;
	border-radius: 50rpx;
	margin-top: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
}

.delete-account-btn::after {
	border: none;
}

/* 退出登录 */
.logout-btn {
	width: 100%;
	height: 100rpx;
	line-height: 100rpx;
	background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
	color: #ffffff;
	font-size: 32rpx;
	font-weight: bold;
	border-radius: 50rpx;
	margin-top: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 15rpx;
	box-shadow: 0 4rpx 20rpx rgba(255, 107, 107, 0.3);
}
</style>
