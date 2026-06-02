<template>
	<view class="page">
		<!-- ===== 状态栏 + 顶部柔和渐变 ===== -->
		<view class="top-gradient"></view>
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- ===== 用户信息区 ===== -->
		<view class="user-section">
			<view class="user-avatar">
				<text class="avatar-text">{{ (userInfo && userInfo.username && userInfo.username.charAt(0).toUpperCase()) || '?' }}</text>
			</view>
			<view class="user-body">
				<text class="username">{{ (userInfo && userInfo.username) || '未登录' }}</text>
				<view class="role-capsule" :class="userInfo && userInfo.role">
					<text class="role-text">{{ roleText }}</text>
				</view>
			</view>
		</view>

		<!-- ===== 店铺信息 ===== -->
		<view class="info-card" v-if="userInfo && userInfo.shop_id">
			<view class="card-head">
				<view class="card-head-left">
					<uni-icons type="shop" size="18" color="#4F46E5"></uni-icons>
					<text class="card-head-title">店铺信息</text>
				</view>
			</view>
			<view class="info-list">
				<view class="info-row">
					<text class="info-label">店铺名称</text>
					<view class="info-value-row">
						<text class="info-value">{{ shopInfo.shop_name || '未设置' }}</text>
						<text
							v-if="userInfo && userInfo.role === 'store_manager'"
							class="action-link edit-link"
							@click="editShopName"
						>修改</text>
					</view>
				</view>
				<view class="info-row">
					<text class="info-label">店铺ID</text>
					<text class="info-value mono">{{ userInfo.shop_id }}</text>
				</view>
			</view>
		</view>

		<!-- ===== 邀请码管理 ===== -->
		<view class="info-card" v-if="userInfo && userInfo.role === 'store_manager'">
			<view class="card-head">
				<view class="card-head-left">
					<uni-icons type="locked" size="18" color="#4F46E5"></uni-icons>
					<text class="card-head-title">邀请码管理</text>
				</view>
				<text class="card-head-sub">多人共用，无限使用</text>
			</view>
			<view class="code-list">
				<view class="code-row">
					<view class="code-info">
						<text class="code-role">经理邀请码</text>
						<text class="code-val">{{ inviteCodes.managerCode || '---' }}</text>
					</view>
					<text class="action-link" @click="copyCode(inviteCodes.managerCode)">复制</text>
				</view>
				<view class="code-row">
					<view class="code-info">
						<text class="code-role">店员邀请码</text>
						<text class="code-val">{{ inviteCodes.staffCode || '---' }}</text>
					</view>
					<text class="action-link" @click="copyCode(inviteCodes.staffCode)">复制</text>
				</view>
			</view>
			<view class="refresh-row" @click="loadInviteCodes">
				<uni-icons type="refresh" size="16" color="#4F46E5"></uni-icons>
				<text class="refresh-text">刷新邀请码</text>
			</view>
		</view>

		<!-- ===== 员工管理 ===== -->
		<view class="info-card" v-if="userInfo && (userInfo.role === 'store_manager' || userInfo.role === 'manager')">
			<view class="card-head">
				<view class="card-head-left">
					<uni-icons type="staff" size="18" color="#4F46E5"></uni-icons>
					<text class="card-head-title">员工管理</text>
				</view>
			</view>

			<!-- 经理列表（仅店长） -->
			<view class="staff-group" v-if="userInfo && userInfo.role === 'store_manager'">
				<view class="staff-group-head">
					<text class="staff-group-title">经理</text>
					<text class="staff-group-count">{{ managers.length }}人</text>
				</view>
				<view class="staff-list" v-if="managers.length > 0">
					<view v-for="manager in managers" :key="manager.id" class="staff-row">
						<view class="staff-avatar-sm">
							<text class="staff-avatar-letter">{{ manager.username.charAt(0).toUpperCase() }}</text>
						</view>
						<text class="staff-row-name">{{ manager.username }}</text>
						<text class="action-link danger-link" @click="deleteStaff(manager.id, manager.username)">删除</text>
					</view>
				</view>
				<view class="staff-empty" v-else><text>暂无经理</text></view>
			</view>

			<!-- 店员列表 -->
			<view class="staff-group">
				<view class="staff-group-head">
					<text class="staff-group-title">店员</text>
					<text class="staff-group-count">{{ staffs.length }}人</text>
				</view>
				<view class="staff-list" v-if="staffs.length > 0">
					<view v-for="staff in staffs" :key="staff.id" class="staff-row">
						<view class="staff-avatar-sm">
							<text class="staff-avatar-letter">{{ staff.username.charAt(0).toUpperCase() }}</text>
						</view>
						<text class="staff-row-name">{{ staff.username }}</text>
						<text class="action-link danger-link" @click="deleteStaff(staff.id, staff.username)">删除</text>
					</view>
				</view>
				<view class="staff-empty" v-else><text>暂无店员</text></view>
			</view>

			<view class="refresh-row" @click="loadStaffList">
				<uni-icons type="refresh" size="16" color="#4F46E5"></uni-icons>
				<text class="refresh-text">刷新列表</text>
			</view>
		</view>

		<!-- ===== 退出登录 ===== -->
		<view class="logout-btn" @click="logout">
			<uni-icons type="undo" size="18" color="#EF4444"></uni-icons>
			<text>退出登录</text>
		</view>

		<!-- ===== 注销账号 ===== -->
		<view class="delete-account-btn" @click="deleteAccount">
			<uni-icons type="trash" size="16" color="#9CA3AF"></uni-icons>
			<text>注销账号</text>
		</view>

		<!-- ===== 底部导航 ===== -->
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
				content: '确定要删除员工 "' + staffName + '" 吗？',
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
		},
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

<style lang="scss">
/* ============================================================
   1. 页面基底
   ============================================================ */
.page {
	min-height: 100vh;
	background: #FAFAFA;
	padding: 0 24rpx;
	padding-bottom: 180rpx;
	position: relative;
}

/* 顶部淡蓝→白微弱渐变 */
.top-gradient {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 320rpx;
	background: linear-gradient(180deg,
		rgba(79, 70, 229, 0.03) 0%,
		rgba(99, 102, 241, 0.01) 40%,
		rgba(255, 255, 255, 0) 100%
	);
	pointer-events: none;
	z-index: 0;
}

.status-bar {
	width: 100%;
	position: relative;
	z-index: 1;
}

/* ============================================================
   2. 用户信息区
   ============================================================ */
.user-section {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx 8rpx 28rpx;
}

.user-avatar {
	width: 104rpx;
	height: 104rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #4F46E5, #818CF8);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	box-shadow: 0 6rpx 20rpx rgba(79, 70, 229, 0.18);
}

.avatar-text {
	font-size: 44rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.user-body {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.username {
	font-size: 40rpx;
	font-weight: 700;
	color: #1F2937;
}

/* 角色胶囊 — 淡红底深红字 */
.role-capsule {
	display: inline-flex;
	align-self: flex-start;
	padding: 6rpx 20rpx;
	border-radius: 20rpx;
}

.role-capsule.store_manager {
	background: rgba(239, 68, 68, 0.08);
	.role-text { color: #DC2626; }
}

.role-capsule.manager {
	background: rgba(16, 185, 129, 0.08);
	.role-text { color: #059669; }
}

.role-capsule.staff {
	background: rgba(79, 70, 229, 0.06);
	.role-text { color: #4F46E5; }
}

.role-text {
	font-size: 22rpx;
	font-weight: 600;
}

/* ============================================================
   3. 通用信息卡片
   ============================================================ */
.info-card {
	background: #FFFFFF;
	border-radius: 16px;
	padding: 28rpx;
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.02);
	margin-bottom: 14px;
	position: relative;
	z-index: 1;
}

.card-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 22rpx;
	padding-bottom: 18rpx;
	border-bottom: 1px solid #F3F4F6;
}

.card-head-left {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.card-head-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1F2937;
}

.card-head-sub {
	font-size: 22rpx;
	color: #9CA3AF;
}

/* 列表 */
.info-list {
	display: flex;
	flex-direction: column;
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18rpx 0;

	&:not(:last-child) {
		border-bottom: 1px solid #F9FAFB;
	}
}

.info-label {
	font-size: 26rpx;
	color: #6B7280;
}

.info-value-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.info-value {
	font-size: 28rpx;
	font-weight: 600;
	color: #1F2937;

	&.mono {
		font-family: monospace;
		color: #4F46E5;
	}
}

/* 操作文字按钮 */
.action-link {
	font-size: 24rpx;
	font-weight: 500;
	color: #4F46E5;
	padding: 4rpx 0;

	&:active {
		opacity: 0.6;
	}
}

.edit-link {
	color: #4F46E5;
}

.danger-link {
	color: #F87171;
}

/* ============================================================
   4. 邀请码
   ============================================================ */
.code-list {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-bottom: 20rpx;
}

.code-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #F9FAFB;
	border-radius: 12rpx;
	padding: 22rpx 24rpx;
}

.code-info {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
}

.code-role {
	font-size: 22rpx;
	color: #6B7280;
}

.code-val {
	font-size: 32rpx;
	font-weight: 700;
	color: #6B7280;
	font-family: monospace;
	letter-spacing: 2rpx;
}

/* ============================================================
   5. 员工管理
   ============================================================ */
.staff-group {
	margin-bottom: 24rpx;

	&:last-of-type {
		margin-bottom: 0;
	}
}

.staff-group-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.staff-group-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #1F2937;
}

.staff-group-count {
	font-size: 22rpx;
	color: #9CA3AF;
}

.staff-list {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.staff-row {
	display: flex;
	align-items: center;
	background: #F9FAFB;
	border-radius: 12rpx;
	padding: 18rpx 20rpx;
}

.staff-avatar-sm {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #4F46E5, #818CF8);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 18rpx;
}

.staff-avatar-letter {
	font-size: 24rpx;
	font-weight: 700;
	color: #FFFFFF;
}

.staff-row-name {
	flex: 1;
	font-size: 28rpx;
	font-weight: 500;
	color: #1F2937;
}

.staff-empty {
	text-align: center;
	padding: 36rpx;
	color: #9CA3AF;
	font-size: 26rpx;
	background: #F9FAFB;
	border-radius: 12rpx;
}

/* 刷新行 */
.refresh-row {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 18rpx 0 4rpx;
	border-radius: 10rpx;

	&:active {
		background: #F9FAFB;
	}
}

.refresh-text {
	font-size: 24rpx;
	color: #4F46E5;
	font-weight: 500;
}

/* ============================================================
   6. 退出登录 — 柔和珊瑚红
   ============================================================ */
.logout-btn {
	width: 100%;
	height: 96rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	background: rgba(239, 68, 68, 0.06);
	border-radius: 48rpx;
	margin-top: 28rpx;
	position: relative;
	z-index: 1;
	border: none;

	text {
		font-size: 30rpx;
		font-weight: 600;
		color: #EF4444;
	}

	&:active {
		background: rgba(239, 68, 68, 0.12);
	}
 padding-bottom: env(safe-area-inset-bottom);
}

/* ============================================================
   7. 注销账号
   ============================================================ */
.delete-account-btn {
	width: 100%;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	background: transparent;
	border: 1px solid #E5E7EB;
	border-radius: 44rpx;
	margin-top: 18rpx;
	position: relative;
	z-index: 1;

	text {
		font-size: 28rpx;
		color: #9CA3AF;
	}

	&:active {
		background: #F9FAFB;
	}
}
</style>
